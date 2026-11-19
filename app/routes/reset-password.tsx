import crypto from "crypto"
import bcrypt from "bcryptjs"
import { redirect, useActionData, useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router"
import { z } from "zod"
import prisma from "prisma/prisma"
import { sendEmail } from "~/lib/email.server"
import { passwordChangedEmail } from "~/lib/email-templates.server"
import { resetPasswordSchema } from "~/features/auth/types"

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const token = url.searchParams.get("token")

  if (!token) {
    return { invalid: true, token: null }
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

  const authToken = await prisma.authToken.findFirst({
    where: {
      tokenHash,
      type: "reset_password",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  })

  if (!authToken) {
    return { invalid: true, token: null }
  }

  return { invalid: false, token }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const rawToken = formData.get("token")
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (typeof rawToken !== "string" || !/^[a-f0-9]{64}$/.test(rawToken)) {
    return { errors: { token: "Token inválido" } }
  }

  // Re-validate token (may have expired between loader and submit)
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")

  const authToken = await prisma.authToken.findFirst({
    where: {
      tokenHash,
      type: "reset_password",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  })

  if (!authToken) {
    return { errors: { token: "Link inválido ou expirado. Solicite um novo." } }
  }

  // Validate password fields with Zod
  const result = resetPasswordSchema.safeParse({ password, confirmPassword })
  if (!result.success) {
    const errors: Record<string, string> = {}
    result.error.issues.forEach((issue) => {
      if (issue.path[0]) errors[issue.path[0].toString()] = issue.message
    })
    return { errors }
  }

  const { user } = authToken

  // Hash new password
  const hashedPassword = await bcrypt.hash(result.data.password, 10)

  const changed = await prisma.$transaction(async (tx) => {
    const now = new Date()
    const claimed = await tx.authToken.updateMany({
      where: { id: authToken.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    })
    if (!claimed.count) return false

    await tx.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, tokenVersion: { increment: 1 } },
    })
    await tx.authToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } })
    await tx.securityEvent.create({ data: { userId: user.id, type: "password_reset_used" } })
    return true
  })
  if (!changed) return { errors: { token: "Link inválido ou expirado. Solicite um novo." } }

  try {
    await sendEmail({
      to: user.email,
      subject: "Sua senha foi alterada — Mecânicos Bike",
      html: passwordChangedEmail(user.name),
    })
  } catch {
    console.error("Falha ao enviar aviso de alteração de senha.")
  }

  return redirect("/login?reset=success")
}

export default function ResetPasswordPage() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  if (loaderData.invalid) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border bg-card text-card-foreground shadow">
              <div className="flex flex-col space-y-1.5 p-6">
                <h1 className="text-2xl font-semibold leading-none tracking-tight">
                  Link inválido
                </h1>
              </div>
              <div className="p-6 pt-0">
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 mb-4">
                  Este link de redefinição de senha é inválido ou expirou.
                </div>
                <a
                  href="/forgot-password"
                  className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Solicitar novo link
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="flex flex-col space-y-1.5 p-6">
              <h1 className="text-2xl font-semibold leading-none tracking-tight">
                Redefinir senha
              </h1>
              <p className="text-sm text-muted-foreground">
                Digite e confirme sua nova senha
              </p>
            </div>
            <div className="p-6 pt-0">
              {actionData?.errors?.token && (
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 mb-4">
                  {actionData.errors.token}{" "}
                  <a href="/forgot-password" className="underline">
                    Solicitar novo link
                  </a>
                </div>
              )}
              <form method="post" className="flex flex-col gap-4">
                <input type="hidden" name="token" value={loaderData.token ?? ""} />
                <div className="flex flex-col gap-2">
                  <label htmlFor="password" className="text-sm font-medium leading-none">
                    Nova senha
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {actionData?.errors?.password && (
                    <p className="text-sm text-red-500">{actionData.errors.password}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {actionData?.errors?.confirmPassword && (
                    <p className="text-sm text-red-500">{actionData.errors.confirmPassword}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Redefinir senha
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
