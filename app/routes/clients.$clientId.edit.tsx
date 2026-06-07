import { redirect, useActionData, useLoaderData } from "react-router"
import type { Route } from "./+types/clients.$clientId.edit"
import { requireAuth } from "~/lib/auth.server"
import { getClientById, updateClient } from "~/services/clients.server"
import { ClientForm } from "~/features/clients/components"
import { clientFormSchema, cleanCPF } from "~/features/clients/types"
import { z } from "zod"
import type { RouteHandle } from "~/types/route"

export const handle: RouteHandle = {
  title: "Editar Cliente",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  const raw = await getClientById(Number(params.clientId), userId)
  if (!raw) throw new Response("Cliente não encontrado", { status: 404 })

  return {
    client: {
      ...raw,
      cpf: raw.cpf ?? "",
      email: raw.email ?? "",
      phone: raw.phone ?? "",
      birthDate: raw.birthDate ? new Date(raw.birthDate).toISOString().split("T")[0] : "",
      address: raw.address ?? "",
      notes: raw.notes ?? "",
    },
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireAuth(request)
  const clientId = parseInt(params.clientId)

  const formData = await request.formData()
  const data = Object.fromEntries(formData)

  let validated: z.infer<typeof clientFormSchema>
  try {
    validated = clientFormSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.issues.forEach((issue) => {
        if (issue.path[0]) errors[issue.path[0].toString()] = issue.message
      })
      return { errors }
    }
    throw error
  }

  try {
    const updated = await updateClient(clientId, userId, {
      fullName: validated.fullName,
      cpf: validated.cpf ? cleanCPF(validated.cpf) : null,
      email: validated.email || null,
      phone: validated.phone || null,
      birthDate: validated.birthDate || null,
      address: validated.address || null,
      notes: validated.notes || null,
    })
    if (!updated) return { errors: { general: "Cliente não encontrado" } }
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return { errors: { cpf: "Este CPF já está cadastrado em outro cliente" } }
    }
    throw error
  }

  return redirect(`/clients/${clientId}`)
}

function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  )
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

