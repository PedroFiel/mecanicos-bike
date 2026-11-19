import crypto from "crypto"
import prisma from "prisma/prisma"
import {
  data,
  redirect,
  useActionData,
  Form,
  NavLink,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router"
import { serialize } from "cookie"
import {
  getLoginChallenge,
  createChallengeCookie,
  createUserSession,
  clearChallengeCookie,
} from "~/lib/auth.server"
import { sendEmail } from "~/lib/email.server"
import { twoFactorCodeEmail } from "~/lib/email-templates.server"
import { env } from "~/lib/env.server"

// ─── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getLoginChallenge(request)) throw redirect("/login")
  return null
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  const challenge = getLoginChallenge(request)
  if (!challenge) throw redirect("/login")

  const { userId, tokenId, tokenVersion } = challenge
  const now = new Date()
  const activeChallenge = {
    id: tokenId, userId, type: "2fa_code", usedAt: null,
    expiresAt: { gt: now }, attempts: { lt: 5 }, user: { tokenVersion },
  }
  const authToken = await prisma.authToken.findFirst({ where: activeChallenge })
  if (!authToken) {
    return redirect("/login?error=expired", { headers: { "Set-Cookie": clearChallengeCookie() } })
  }

  const formData = await request.formData()
  const intent = formData.get("intent") as string | null

  // ── Reenviar código ──────────────────────────────────────────────────────
  if (intent === "resend") {
    // Verificar se já foi enviado nos últimos 60 segundos
    const secondsSinceLast = (now.getTime() - authToken.createdAt.getTime()) / 1000
    if (secondsSinceLast < 60) {
      return {
        error: `Aguarde ${Math.ceil(60 - secondsSinceLast)} segundos antes de reenviar.`,
        resent: false,
      }
    }

    // Buscar e-mail do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (!user) {
      throw redirect("/login")
    }

    // Criar novo AuthToken
    const code = String(crypto.randomInt(100000, 1000000))
    const tokenHash = crypto.createHash("sha256").update(code).digest("hex")
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    const refreshed = await prisma.authToken.updateMany({
      where: { ...activeChallenge, createdAt: authToken.createdAt },
      data: { tokenHash, expiresAt, createdAt: now },
    })
    if (!refreshed.count) return { error: "O desafio mudou. Tente novamente.", resent: false }

    try {
      const html = twoFactorCodeEmail(code, "Mecânicos Bike")
      await sendEmail({
        to: user.email,
        subject: "Código de acesso — Mecânicos Bike",
        html,
      })
    } catch (err) {
      console.error("[2FA resend] Falha ao enviar e-mail:", err)
      return { error: "Não foi possível enviar o código.", resent: false }
    }

    return data({ error: null, resent: true }, {
      headers: { "Set-Cookie": createChallengeCookie(userId, tokenId, tokenVersion) },
    })
  }

  // ── Verificar código ─────────────────────────────────────────────────────
  const input = formData.get("code")
  const code = typeof input === "string" ? input.trim() : ""
  const trustDevice = formData.get("trust_device") === "on"

  if (!code || !/^\d{6}$/.test(code)) {
    return { error: "Digite um código de 6 dígitos.", resent: false }
  }

  const submittedHash = crypto.createHash("sha256").update(code).digest("hex")

  const unchangedChallenge = { ...activeChallenge, tokenHash: authToken.tokenHash, attempts: authToken.attempts }
  // Código errado
  if (authToken.tokenHash !== submittedHash) {
    const newAttempts = authToken.attempts + 1

    const failed = await prisma.authToken.updateMany({
      where: unchangedChallenge,
      data: { attempts: newAttempts, ...(newAttempts >= 5 && { usedAt: now }) },
    })
    if (!failed.count) return { error: "O desafio mudou. Tente novamente.", resent: false }

    if (newAttempts >= 5) {
      // Registrar falha
      await prisma.securityEvent.create({
        data: {
          userId,
          type: "2fa_failed",
          ip:
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
            undefined,
          userAgent: request.headers.get("user-agent") ?? undefined,
        },
      })

      return redirect("/login?error=2fa_failed", {
        headers: { "Set-Cookie": clearChallengeCookie() },
      })
    }

    return {
      error: `Código incorreto. ${5 - newAttempts} tentativa(s) restante(s).`,
      resent: false,
    }
  }

  // ── Código correto ───────────────────────────────────────────────────────

  // Marcar token como usado
  const verified = await prisma.authToken.updateMany({
    where: unchangedChallenge, data: { usedAt: now },
  })
  if (!verified.count) return { error: "O desafio mudou. Tente novamente.", resent: false }

  // Buscar dados completos do usuário para criar sessão
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, tokenVersion: true },
  })

  if (!user || user.tokenVersion !== tokenVersion) throw redirect("/login")

  // Headers da resposta
  const responseHeaders = new Headers()

  // Cookie de dispositivo confiável (30 dias)
  if (trustDevice) {
    const trustedToken = crypto.randomBytes(32).toString("hex")
    const trustedHash = crypto
      .createHash("sha256")
      .update(trustedToken)
      .digest("hex")

    await prisma.authToken.create({
      data: {
        userId,
        type: "trusted_device",
        tokenHash: trustedHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    const trustedCookie = serialize(`trusted_device_${userId}`, trustedToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 dias
      path: "/",
    })
    responseHeaders.append("Set-Cookie", trustedCookie)
  }

  // Limpar cookie de desafio
  responseHeaders.append("Set-Cookie", clearChallengeCookie())

  // Registrar login bem-sucedido
  await prisma.securityEvent.create({
    data: {
      userId,
      type: "login_success",
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    },
  })

  // Criar sessão completa — obter o cookie JWT
  const sessionResponse = await createUserSession(
    user.id,
    user.email,
    user.tokenVersion,
    "/"
  )

  // Mesclar cookies: session + trusted_device + clear_challenge
  const sessionCookie = sessionResponse.headers.get("Set-Cookie")
  if (sessionCookie) {
    responseHeaders.append("Set-Cookie", sessionCookie)
  }

  // Redirecionar para home com todos os cookies setados
  responseHeaders.set("Location", "/")
  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  })
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function LoginVerifyPage() {
  const actionData = useActionData<{
    error: string | null
    resent: boolean
  }>()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Digite o código
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enviamos um código de 6 dígitos para o seu e-mail. Ele expira em 10
            minutos.
          </p>
        </div>

        {actionData?.resent && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            Código reenviado! Verifique sua caixa de entrada.
          </div>
        )}

        {actionData?.error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {actionData.error}
          </div>
        )}

        {/* Formulário principal — verificar código */}
        <Form method="post" className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="code"
              className="block text-sm font-medium leading-none"
            >
              Código de verificação
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              placeholder="000000"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-lg tracking-widest shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="trust_device"
              name="trust_device"
              type="checkbox"
              value="on"
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <label
              htmlFor="trust_device"
              className="text-sm text-muted-foreground"
            >
              Confiar neste dispositivo por 30 dias
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Verificar
          </button>
        </Form>

        {/* Reenviar código */}
        <Form method="post">
          <input type="hidden" name="intent" value="resend" />
          <button
            type="submit"
            className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Reenviar código
          </button>
        </Form>

        {/* Voltar para login */}
        <div className="text-center">
          <NavLink
            to="/login"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Voltar para o login
          </NavLink>
        </div>
      </div>
    </div>
  )
}
