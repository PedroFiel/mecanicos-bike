import crypto from "crypto"
import { redirect, useActionData, useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router"
import { z } from "zod"
import prisma from "prisma/prisma"
import { getOptionalUser } from "~/lib/auth.server"
import { env } from "~/lib/env.server"
import { isRateLimited } from "~/lib/rate-limit.server"
import { sendEmail } from "~/lib/email.server"
import { passwordResetEmail } from "~/lib/email-templates.server"

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getOptionalUser(request)
  if (user) {
    throw redirect("/")
  }
  return null
}

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Endereço de email inválido"),
})

const SUCCESS_MESSAGE = "Se o e-mail existir em nossa base, você receberá um link em breve."

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const data = { email: formData.get("email") as string }

  // Validate email
  const result = forgotPasswordSchema.safeParse(data)
  if (!result.success) {
    const errors: Record<string, string> = {}
    result.error.issues.forEach((issue) => {
      if (issue.path[0]) errors[issue.path[0].toString()] = issue.message
    })
    return { errors, success: false }
  }

  const { email } = result.data

  // Rate limit: 3 requests per hour per email
  const limited = await isRateLimited("forgot:" + email, 3, 60 * 60 * 1000)
  if (limited) {
    // Still return success message to avoid timing attacks
    return { success: true, message: SUCCESS_MESSAGE }
  }

  // Look up user (but always return same message regardless)
  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    // Generate a 32-byte raw token
    const rawToken = crypto.randomBytes(32).toString("hex")

    // Hash with SHA-256 for storage
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    // Invalidate previous reset tokens for this user
    await prisma.authToken.updateMany({
      where: {
        userId: user.id,
        type: "reset_password",
        usedAt: null,
      },
      data: { usedAt: new Date() },
    })

    // Create new reset token
    await prisma.authToken.create({
      data: {
        userId: user.id,
        type: "reset_password",
        tokenHash,
        expiresAt,
      },
    })

    // Build reset URL
    const appUrl = env.APP_URL ?? "http://localhost:5173"
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`

    try {
      await sendEmail({
        to: user.email,
        subject: "Redefinição de senha — Mecânicos Bike",
        html: passwordResetEmail(resetUrl, user.name),
      })
    } catch {
      console.error("Falha ao enviar e-mail de redefinição de senha.")
    }

    // Record security event
    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: "password_reset_requested",
      },
    })
  }

  return { success: true, message: SUCCESS_MESSAGE }
}

export default function ForgotPasswordPage() {
  const actionData = useActionData<typeof action>()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="flex flex-col space-y-1.5 p-6">
              <h1 className="text-2xl font-semibold leading-none tracking-tight">
                Recuperar senha
              </h1>
              <p className="text-sm text-muted-foreground">
                Digite seu e-mail para receber um link de redefinição
              </p>
            </div>
            <div className="p-6 pt-0">
              {actionData?.success ? (
                <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
                  {actionData.message}
                </div>
              ) : (
                <form method="post" className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium leading-none">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    {actionData?.errors?.email && (
                      <p className="text-sm text-red-500">{actionData.errors.email}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    Enviar link
                  </button>
                  <div className="text-center text-sm">
                    <a href="/login" className="underline-offset-4 hover:underline">
                      Voltar para o login
                    </a>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
