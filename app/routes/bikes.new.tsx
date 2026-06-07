import { redirect, useActionData, useLoaderData, useSearchParams } from "react-router"
import type { Route } from "./+types/bikes.new"
import { requireAuth } from "~/lib/auth.server"
import { apiGet, apiPost } from "~/lib/api.server"
import { BikeForm } from "~/features/bikes/components"
import { bikeFormSchema } from "~/features/bikes/types"
import { z } from "zod"
import type { RouteHandle } from "~/types/route"

export const handle: RouteHandle = {
  title: "Nova Bike",
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuth(request)
  const url = new URL(request.url)
  const clientIdParam = url.searchParams.get("clientId")

  if (!clientIdParam) {
    throw new Response("Cliente não especificado", { status: 400 })
  }

  const client = await apiGet<{ id: number; fullName: string }>(
    request,
    `/api/clients/${clientIdParam}`
  )

  return { client }
}

export async function action({ request }: Route.ActionArgs) {
  await requireAuth(request)

  const formData = await request.formData()
  const data = Object.fromEntries(formData)

  const url = new URL(request.url)
  const clientIdParam = url.searchParams.get("clientId")
  if (!clientIdParam) return { errors: { general: "Cliente não especificado" } }

  const clientId = parseInt(clientIdParam)

  let validated: z.infer<typeof bikeFormSchema>
  try {
    validated = bikeFormSchema.parse(data)
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

  const result = await apiPost(request, "/api/bikes", {
    clientId,
    model: validated.model,
    brand: validated.brand || null,
    color: validated.color || null,
    frameNumber: validated.frameNumber || null,
    characteristics: validated.characteristics || null,
  })

  if (!result.ok) return { errors: result.errors }

  return redirect(`/clients/${clientId}?tab=bikes`)
}

export default function Page() {
  const { client } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get("clientId")

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Nova Bike</h1>
        <p className="text-muted-foreground">
          Cadastrar bike para {client.fullName}
        </p>
      </div>

      <div className="mx-auto w-full">
        {actionData?.errors?.general && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200 mb-4">
            {actionData.errors.general}
          </div>
        )}

        <BikeForm
          clientId={client.id}
          clientName={client.fullName}
          errors={actionData?.errors}
        />
      </div>
    </div>
  )
}

