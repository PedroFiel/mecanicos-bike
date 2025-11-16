import { redirect, useActionData } from "react-router"
import type { Route } from "./+types/clients.new"
import { requireAuth } from "~/lib/auth.server"
import prisma from "../../prisma/prisma"
import { ClientForm } from "~/features/clients/components"
import { clientFormSchema, cleanCPF } from "~/features/clients/types"
import { z } from "zod"
import type { RouteHandle } from "~/types/route"

export const handle: RouteHandle = {
  title: "Novo Cliente",
};

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireAuth(request)

  const formData = await request.formData()
  const data = Object.fromEntries(formData)

  try {
    const validated = clientFormSchema.parse(data)

    const cpfCleaned = validated.cpf ? cleanCPF(validated.cpf) : null

    if (cpfCleaned) {
      const existingClient = await prisma.client.findUnique({
        where: { cpf: cpfCleaned },
      })

      if (existingClient) {
        return {
          errors: {
            cpf: "Este CPF já está cadastrado",
          },
        }
      }
    }

    let birthDate = null
    if (validated.birthDate && validated.birthDate.trim() !== "") {
      birthDate = new Date(validated.birthDate)
    }

    await prisma.client.create({
      data: {
        userId,
        fullName: validated.fullName,
        cpf: cpfCleaned,
        email: validated.email || null,
        phone: validated.phone || null,
        birthDate,
        address: validated.address || null,
        notes: validated.notes || null,
      },
    })

    return redirect("/clients?success=Cliente cadastrado com sucesso")
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message
        }
      })
      return { errors }
    }

    console.error("Erro ao criar cliente:", error)
    return {
      errors: {
        general: "Erro ao cadastrar cliente. Tente novamente.",
      },
    }
  }
}

export default function Page() {
  const actionData = useActionData<typeof action>()

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Novo Cliente</h1>
        <p className="text-muted-foreground">
          Adicione um novo cliente ao sistema
        </p>
      </div>

      <div className="mx-auto w-full">
        {actionData?.errors?.general && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200 mb-4">
            {actionData.errors.general}
          </div>
        )}

        <ClientForm errors={actionData?.errors} />
      </div>
    </div>
  )
}

