import { redirect, useActionData, useLoaderData } from "react-router"
import type { Route } from "./+types/clients.$clientId.edit"
import { requireAuth } from "~/lib/auth.server"
import prisma from "../../prisma/prisma"
import { ClientForm } from "~/features/clients/components/client-form"
import { clientFormSchema, cleanCPF } from "~/features/clients/types"
import { z } from "zod"
import type { RouteHandle } from "~/types/route"

export const handle: RouteHandle = {
  title: "Editar Cliente",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  const clientId = parseInt(params.clientId)

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      userId,
    },
  })

  if (!client) {
    throw new Response("Cliente não encontrado", { status: 404 })
  }

  const birthDate = client.birthDate
    ? new Date(client.birthDate).toISOString().split("T")[0]
    : ""

  return {
    client: {
      ...client,
      cpf: client.cpf || "",
      email: client.email || "",
      phone: client.phone || "",
      birthDate,
      address: client.address || "",
      notes: client.notes || "",
    },
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireAuth(request)
  const clientId = parseInt(params.clientId)

  const existingClient = await prisma.client.findFirst({
    where: {
      id: clientId,
      userId,
    },
  })

  if (!existingClient) {
    throw new Response("Cliente não encontrado", { status: 404 })
  }

  const formData = await request.formData()
  const data = Object.fromEntries(formData)

  try {
    const validated = clientFormSchema.parse(data)

    const cpfCleaned = validated.cpf ? cleanCPF(validated.cpf) : null

    if (cpfCleaned) {
      const duplicateCpf = await prisma.client.findFirst({
        where: {
          cpf: cpfCleaned,
          NOT: {
            id: clientId,
          },
        },
      })

      if (duplicateCpf) {
        return {
          errors: {
            cpf: "Este CPF já está cadastrado em outro cliente",
          },
        }
      }
    }

    let birthDate = null
    if (validated.birthDate && validated.birthDate.trim() !== "") {
      birthDate = new Date(validated.birthDate)
    }

    await prisma.client.update({
      where: { id: clientId },
      data: {
        fullName: validated.fullName,
        cpf: cpfCleaned,
        email: validated.email || null,
        phone: validated.phone || null,
        birthDate,
        address: validated.address || null,
        notes: validated.notes || null,
      },
    })

    return redirect(`/clients/${clientId}`)
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

    console.error("Erro ao atualizar cliente:", error)
    return {
      errors: {
        general: "Erro ao atualizar cliente. Tente novamente.",
      },
    }
  }
}

export default function Page({ params }: Route.ComponentProps) {
  const { client } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const clientId = parseInt(params.clientId)

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Editar Cliente
        </h1>
        <p className="text-muted-foreground">
          Atualize as informações de {client.fullName}
        </p>
      </div>

      <div className="mx-auto w-full">
        {actionData?.errors?.general && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200 mb-4">
            {actionData.errors.general}
          </div>
        )}

        <ClientForm 
          isEdit 
          clientId={clientId}
          defaultValues={client} 
          errors={actionData?.errors} 
        />
      </div>
    </div>
  )
}

