import { SignupForm } from "~/components/signup-form"
import { redirect, useActionData } from "react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { z } from "zod"
import bcrypt from "bcryptjs"
import prisma from "../../prisma/prisma"
import type { ActionData } from "~/types/actionData"
import { getOptionalUser } from "~/lib/auth.server"

const signupSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Endereço de email inválido"),
  phone: z.string().optional(),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
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
  
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string || undefined,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  }

  try {
    signupSchema.parse(data)
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

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  })

  if (existingUser) {
    return {
      errors: {
        email: "Email já está em uso"
      }
    }
  }

  const hashedPassword = await bcrypt.hash(data.password, 10)

  try {
    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
      }
    })

    return redirect("/login")
  } catch (error) {
    return {
      errors: {
        general: "Falha ao criar conta. Por favor, tente novamente."
      }
    }
  }
}

export default function Page() {
  const actionData = useActionData<ActionData>()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm errors={actionData?.errors || undefined} />
      </div>
    </div>
  )
}
