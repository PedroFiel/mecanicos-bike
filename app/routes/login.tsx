import bcrypt from "bcryptjs"
import crypto from "crypto"
import { parse } from "cookie"
import prisma from "prisma/prisma"
import {
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router"
import { z } from "zod"
import { LoginForm } from "~/components/login-form"
import type { ActionData } from "~/types/actionData"
import {
  createUserSession,
  getOptionalUser,
  createChallengeCookie,
} from "~/lib/auth.server"
import { loginSchema, parseZodErrors } from "~/features/auth/types"
import { isRateLimited } from "~/lib/rate-limit.server"
import { sendEmail } from "~/lib/email.server"
import { twoFactorCodeEmail } from "~/lib/email-templates.server"

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getOptionalUser(request)
  if (user) {
    throw redirect("/")
  }
  const url = new URL(request.url)
  const reset = url.searchParams.get("reset")
  return { resetSuccess: reset === "success" }
}

export async function action({ request }: ActionFunctionArgs) {
  // Rate-limit por IP — 20 tentativas em 15 minutos
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"

  if (isRateLimited("login:" + ip, 20, 15 * 60 * 1000)) {
    return {
      errors: {
        form: "Muitas tentativas. Tente novamente em alguns minutos.",
      },
    }
  }

  const formData = await request.formData()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  // Validação de schema
  try {
    loginSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { errors: parseZodErrors(error) }
    }
  }

  // Busca o usuário pelo e-mail
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  })

  // --- Conta bloqueada? ---
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return {
      errors: {
        form: "Conta temporariamente bloqueada. Tente novamente em alguns minutos.",
      },
    }
  }

  // --- Credenciais inválidas (usuário não existe ou senha errada) ---
  const isPasswordValid =
    user !== null && (await bcrypt.compare(data.password, user.password))

  if (!user || !isPasswordValid) {
    // Incrementar tentativas falhas se o usuário existir
    if (user) {
      const newAttempts = user.failedLoginAttempts + 1

      // Registrar SecurityEvent de falha
      await prisma.securityEvent.create({
        data: {
          userId: user.id,
          type: "login_failed",
          ip,
          userAgent: request.headers.get("user-agent") ?? undefined,
        },
      })

      if (newAttempts >= 5) {
        // Bloquear conta por 15 minutos e resetar contador
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000)
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil,
          },
        })
        await prisma.securityEvent.create({
          data: {
            userId: user.id,
            type: "login_blocked",
            ip,
            userAgent: request.headers.get("user-agent") ?? undefined,
          },
        })
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: newAttempts },
        })
      }
    } else {
      // Registrar falha mesmo se o e-mail não existir
      await prisma.securityEvent.create({
        data: {
          userId: null,
          type: "login_failed",
          ip,
          userAgent: request.headers.get("user-agent") ?? undefined,
        },
      })
    }

    // Erro genérico — nunca revelar qual campo errou
    return {
      errors: {
        form: "E-mail ou senha inválidos",
        email: "E-mail ou senha inválidos",
      },
    }
  }

  // --- Credenciais corretas ---

  // Resetar tentativas falhas
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })

  // Se conta demo: criar sessão diretamente (sem 2FA)
  if (user.isDemo) {
    return createUserSession(user.id, user.email, user.tokenVersion, "/")
  }

  // Se dispositivo confiável registrado anteriormente: criar sessão direta (sem 2FA)
  const cookieHeader = request.headers.get("Cookie")
  if (cookieHeader) {
    const cookies = parse(cookieHeader)
    const deviceToken = cookies[`trusted_device_${user.id}`]
    if (deviceToken) {
      const deviceTokenHash = crypto
        .createHash("sha256")
        .update(deviceToken)
        .digest("hex")

      const trustedDevice = await prisma.authToken.findFirst({
        where: {
          userId: user.id,
          type: "trusted_device",
          tokenHash: deviceTokenHash,
          expiresAt: { gt: new Date() },
        },
      })

      if (trustedDevice) {
        return createUserSession(user.id, user.email, user.tokenVersion, "/")
      }
    }
  }

  // --- Fluxo 2FA ---
  const code = String(Math.floor(100000 + Math.random() * 900000)) // 6 dígitos
  const tokenHash = crypto.createHash("sha256").update(code).digest("hex")
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

  // Salvar o AuthToken no banco
  await prisma.authToken.create({
    data: {
      userId: user.id,
      type: "2fa_code",
      tokenHash,
      expiresAt,
    },
  })

  // Registrar SecurityEvent de envio do 2FA
  await prisma.securityEvent.create({
    data: {
      userId: user.id,
      type: "2fa_sent",
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    },
  })

  // Enviar o e-mail com o código
  try {
    const html = twoFactorCodeEmail(code, "Mecânicos Bike")
    await sendEmail({
      to: user.email,
      subject: "Código de acesso — Mecânicos Bike",
      html,
    })
  } catch (err) {
    console.error("[2FA] Falha ao enviar e-mail:", err)
    // Continua mesmo se o envio falhar (o usuário pode reenviar)
  }

  // Setar cookie de desafio e redirecionar para /login/verify
  const challengeCookie = createChallengeCookie(user.id)
  return redirect("/login/verify", {
    headers: {
      "Set-Cookie": challengeCookie,
    },
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
