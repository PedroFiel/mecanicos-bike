import bcrypt from "bcryptjs"
import crypto from "crypto"
import { parse } from "cookie"
import prisma from "prisma/prisma"
import {
  data,
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router"
import { LoginForm } from "~/components/login-form"
import type { ActionData } from "~/types/actionData"
import {
  createUserSession,
  getOptionalUser,
  createChallengeCookie,
} from "~/lib/auth.server"
import { loginSchema, parseZodErrors } from "~/features/auth/types"
import { getClientIp, isRateLimited } from "~/lib/rate-limit.server"
import { logSecurityEvent } from "~/lib/security-events.server"
import { sendEmail } from "~/lib/email.server"
import { twoFactorCodeEmail } from "~/lib/email-templates.server"

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  expired: "O código expirou. Faça login novamente para receber outro.",
  "2fa_failed": "Código incorreto muitas vezes. Faça login novamente para receber outro.",
}

// Hash usado quando o e-mail não existe, para o tempo de resposta não revelar contas
const DUMMY_HASH = bcrypt.hashSync("senha-inexistente-0", 10)
const INVALID_CREDENTIALS = { form: "E-mail ou senha inválidos", email: "E-mail ou senha inválidos" }

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getOptionalUser(request)
  if (user) {
    throw redirect("/")
  }
  const url = new URL(request.url)
  const reset = url.searchParams.get("reset")
  const error = url.searchParams.get("error")
  return {
    resetSuccess: reset === "success",
    errorMessage: error ? LOGIN_ERROR_MESSAGES[error] ?? null : null,
  }
}

export async function action({ request }: ActionFunctionArgs) {
  // Rate-limit por IP — 20 tentativas em 15 minutos
  const ip = getClientIp(request)
  if (isRateLimited("login:" + ip, 20, 15 * 60 * 1000)) {
    return data(
      { errors: { form: "Muitas tentativas. Tente novamente em alguns minutos." } },
      { status: 429 },
    )
  }

  const formData = await request.formData()
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  })
  if (!parsed.success) return { errors: parseZodErrors(parsed.error) }
  const credentials = parsed.data

  const user = await prisma.user.findUnique({ where: { email: credentials.email } })

  // Sempre compara a senha (mesmo sem conta) para não revelar quais e-mails existem
  const isPasswordValid = await bcrypt.compare(credentials.password, user?.password ?? DUMMY_HASH)
  const isLocked = Boolean(user?.lockedUntil && user.lockedUntil > new Date())

  if (!user || !isPasswordValid || isLocked) {
    await logSecurityEvent(request, "login_failed", user?.id)

    // Durante o bloqueio não conta novas falhas; a mensagem continua genérica
    if (user && !isLocked) {
      const newAttempts = user.failedLoginAttempts + 1
      if (newAttempts >= 5) {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
        })
        await logSecurityEvent(request, "login_blocked", user.id)
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: newAttempts },
        })
      }
    }

    return { errors: INVALID_CREDENTIALS }
  }

  // --- Credenciais corretas ---
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })

  // Conta demo: sessão direta (sem 2FA)
  if (user.isDemo) {
    await logSecurityEvent(request, "login_success", user.id)
    return createUserSession(user.id, user.email, user.tokenVersion, "/dashboard")
  }

  // Dispositivo confiável registrado anteriormente: sessão direta (sem 2FA)
  const cookieHeader = request.headers.get("Cookie")
  const deviceToken = cookieHeader ? parse(cookieHeader)[`trusted_device_${user.id}`] : undefined
  if (deviceToken) {
    const trustedDevice = await prisma.authToken.findFirst({
      where: {
        userId: user.id,
        type: "trusted_device",
        tokenHash: crypto.createHash("sha256").update(deviceToken).digest("hex"),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
    if (trustedDevice) {
      await logSecurityEvent(request, "login_success", user.id)
      return createUserSession(user.id, user.email, user.tokenVersion, "/")
    }
  }

  // --- Fluxo 2FA ---
  const code = String(crypto.randomInt(100000, 1000000)) // 6 dígitos
  const challenge = await prisma.authToken.create({
    data: {
      userId: user.id,
      type: "2fa_code",
      tokenHash: crypto.createHash("sha256").update(code).digest("hex"),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
    },
  })
  await logSecurityEvent(request, "2fa_sent", user.id)

  try {
    await sendEmail({
      to: user.email,
      subject: "Código de acesso — Mecânicos Bike",
      html: twoFactorCodeEmail(code, "Mecânicos Bike"),
    })
  } catch (err) {
    console.error("[2FA] Falha ao enviar e-mail:", err)
    // Continua mesmo se o envio falhar (o usuário pode reenviar)
  }

  return redirect("/login/verify", {
    headers: { "Set-Cookie": createChallengeCookie(user.id, challenge.id, user.tokenVersion) },
  })
}

export default function Page() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<ActionData>()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm flex flex-col gap-4">
        {loaderData?.resetSuccess && (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
            Senha redefinida com sucesso! Faça login com sua nova senha.
          </div>
        )}
        {loaderData?.errorMessage && !actionData && (
          <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
            {loaderData.errorMessage}
          </div>
        )}
        {actionData?.errors?.form && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {actionData.errors.form}
          </div>
        )}
        <LoginForm errors={actionData?.errors || undefined} />
      </div>
    </div>
  )
}
