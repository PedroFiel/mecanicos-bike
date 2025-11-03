import { SignupForm } from "~/components/signup-form"
import { redirect, useActionData } from "react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { z } from "zod"
import bcrypt from "bcryptjs"
import prisma from "../../prisma/prisma"
import type { ActionData } from "~/types/actionData"
import { getOptionalUser } from "~/lib/auth.server"
import { signupSchema, parseZodErrors } from "~/types/auth"

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
      return { errors: parseZodErrors(error) }
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
