import bcrypt from "bcryptjs"
import prisma from "prisma/prisma"
import { redirect, useActionData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router"
import { z } from "zod"
import { LoginForm } from "~/components/login-form"
import type { ActionData } from "~/types/actionData"
import { createUserSession, getOptionalUser } from "~/lib/auth.server"

const loginSchema = z.object({
  email: z.string().email("Endereço de email inválido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
})

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getOptionalUser(request)
  if (user) {
    throw redirect("/")
  }
  return null
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  
  const data =  {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  try {
    loginSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        errors: error.issues.reduce((acc: Record<string, string>, err: z.ZodIssue) => {
          acc[err.path[0] as string] = err.message
          return acc
        }, {} as Record<string, string>)
      }
    }
  }

  const user = await prisma.user.findUnique({
    where: { email: data.email }
  })

  if (!user) {
    return {
      errors: {
        email: "Email não encontrado"
      }
    }
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password)

  if (!isPasswordValid) {
    return {
      errors: {
        email: "Email ou senha inválidos"
      }
    }
  }

  // Cria JWT token e seta cookie, depois redireciona
  return createUserSession(user.id, user.email, "/")
}

export default function Page() {
  const actionData = useActionData<ActionData>()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm errors={actionData?.errors || undefined} />
      </div>
    </div>
  )
}
