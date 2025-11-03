import { redirect, useActionData, useLoaderData } from "react-router"
import type { Route } from "./+types/bikes.$bikeId.edit"
import { requireAuth } from "~/lib/auth.server"
import prisma from "../../prisma/prisma"
import { BikeForm } from "~/features/bikes/components/bike-form"
import { bikeFormSchema } from "~/features/bikes/types"
import { z } from "zod"
import type { RouteHandle } from "~/types/route"

export const handle: RouteHandle = {
  title: "Editar Bike",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  const bikeId = parseInt(params.bikeId)

  const bike = await prisma.bike.findFirst({
    where: {
      id: bikeId,
      userId,
    },
    include: {
      client: true,
    },
  })

  if (!bike) {
    throw new Response("Bike não encontrada", { status: 404 })
  }

  return {
    bike: {
      ...bike,
      brand: bike.brand || "",
      color: bike.color || "",
      frameNumber: bike.frameNumber || "",
      characteristics: bike.characteristics || "",
    },
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireAuth(request)
  const bikeId = parseInt(params.bikeId)

  const existingBike = await prisma.bike.findFirst({
    where: {
      id: bikeId,
      userId,
    },
  })

  if (!existingBike) {
    throw new Response("Bike não encontrada", { status: 404 })
  }

  const formData = await request.formData()
  const data = Object.fromEntries(formData)

  try {
    const validated = bikeFormSchema.parse(data)

    await prisma.bike.update({
      where: { id: bikeId },
      data: {
        model: validated.model,
        brand: validated.brand || null,
        color: validated.color || null,
        frameNumber: validated.frameNumber || null,
        characteristics: validated.characteristics || null,
      },
    })

    return redirect(`/bikes/${bikeId}`)
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

    console.error("Erro ao atualizar bike:", error)
    return {
      errors: {
        general: "Erro ao atualizar bike. Tente novamente.",
      },
    }
  }
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

