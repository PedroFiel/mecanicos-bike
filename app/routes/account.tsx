import { redirect, useActionData, useLoaderData } from "react-router"
import type { Route } from "./+types/account"
import { requireAuth } from "~/lib/auth.server"
import prisma from "../../prisma/prisma"
import { UserProfileForm } from "~/features/auth/components"
import { userProfileSchema, parseZodErrors } from "~/features/auth/types"
import { z } from "zod"
import type { RouteHandle } from "~/types/route"
import { AVAILABLE_AVATARS } from "~/lib/avatars"

export const handle: RouteHandle = {
  title: "Minha Conta",
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireAuth(request)

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
    },
  })

  if (!user) {
    throw new Response("Usuário não encontrado", { status: 404 })
  }

  return {
    user: {
      ...user,
      phone: user.phone || "",
      image: user.image || "",
    },
  }
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireAuth(request)

  const formData = await request.formData()
  const data = Object.fromEntries(formData)

  try {
    const validated = userProfileSchema.parse(data)

    const existingUser = await prisma.user.findFirst({
      where: {
        email: validated.email,
        NOT: {
          id: userId,
        },
      },
    })

    if (existingUser) {
      return {
        errors: {
          email: "Este email já está em uso por outro usuário",
        },
      }
    }

    if (validated.image && validated.image.trim() !== "") {
      const avatarExists = AVAILABLE_AVATARS.some(
        (avatar) => avatar.id === validated.image
      )

      if (!avatarExists) {
        return {
          errors: {
            image: "Avatar inválido",
          },
        }
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        image: validated.image && validated.image.trim() !== "" ? validated.image : null,
      },
    })

    return { success: "Perfil atualizado com sucesso!" }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { errors: parseZodErrors(error) }
    }

    console.error("Erro ao atualizar perfil:", error)
    return {
      errors: {
        general: "Erro ao atualizar perfil. Tente novamente.",
      },
    }
  }
}

export default function Page() {
  const { user } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Minha Conta
        </h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      {actionData?.errors?.general && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200 border border-red-200 dark:border-red-900">
          {actionData.errors.general}
        </div>
      )}

      <UserProfileForm
        defaultValues={user}
        errors={actionData?.errors}
        successMessage={actionData?.success}
      />
    </div>
  )
}