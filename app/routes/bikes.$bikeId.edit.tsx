import { redirect, useActionData, useLoaderData } from "react-router"
import type { Route } from "./+types/bikes.$bikeId.edit"
import { requireAuth } from "~/lib/auth.server"
import { getBikeById, updateBike } from "~/services/bikes.server"
import { BikeForm } from "~/features/bikes/components"
import { bikeFormSchema } from "~/features/bikes/types"
import { z } from "zod"
import type { RouteHandle } from "~/types/route"

export const handle: RouteHandle = {
  title: "Editar Bike",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  const raw = await getBikeById(Number(params.bikeId), userId)
  if (!raw) throw new Response("Bike não encontrada", { status: 404 })

  return {
    bike: {
      ...raw,
      brand: raw.brand ?? "",
      color: raw.color ?? "",
      frameNumber: raw.frameNumber ?? "",
      characteristics: raw.characteristics ?? "",
    },
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireAuth(request)
  const bikeId = parseInt(params.bikeId)

  const formData = await request.formData()
  const data = Object.fromEntries(formData)

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

  const updated = await updateBike(bikeId, userId, {
    model: validated.model,
    brand: validated.brand || null,
    color: validated.color || null,
    frameNumber: validated.frameNumber || null,
    characteristics: validated.characteristics || null,
  })

  if (!updated) return { errors: { general: "Bike não encontrada" } }

  return redirect(`/bikes/${bikeId}`)
}

export default function EditBikePage({ params }: Route.ComponentProps) {
  const { bike } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const bikeId = parseInt(params.bikeId)

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Editar Bike
        </h1>
        <p className="text-muted-foreground">
          Atualizar informações da bike de {bike.client.fullName}
        </p>
      </div>

      <div className="mx-auto w-full">
        {actionData?.errors?.general && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200 mb-4">
            {actionData.errors.general}
          </div>
        )}

        <BikeForm
          isEdit
          bikeId={bikeId}
          clientId={bike.clientId}
          clientName={bike.client.fullName}
          defaultValues={bike}
          errors={actionData?.errors}
        />
      </div>
    </div>
  )
}

