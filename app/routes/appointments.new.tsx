import { redirect } from "react-router"
import type { Route } from "./+types/appointments.new"
import { requireAuth } from "~/lib/auth.server"
import { getClientById } from "~/services/clients.server"
import { createAppointment } from "~/services/appointments.server"
import { AppointmentForm } from "~/features/appointments/components"
import { appointmentFormSchema } from "~/features/appointments/types"
import { z } from "zod"
import type { RouteHandle } from "~/types/route"

export const handle: RouteHandle = {
  title: "Novo Atendimento",
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  const url = new URL(request.url)
  const clientIdParam = url.searchParams.get("clientId")

  if (!clientIdParam) throw redirect("/clients")

  const client = await getClientById(Number(clientIdParam), userId)
  if (!client) throw new Response("Cliente não encontrado", { status: 404 })

  if (client.bikes.length === 0) {
    throw redirect(`/clients/${clientIdParam}?tab=bikes`)
  }

  return { client }
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireAuth(request)
  const formData = await request.formData()
  const url = new URL(request.url)
  const clientIdParam = url.searchParams.get("clientId")

  if (!clientIdParam) return { errors: { general: "Cliente não especificado" } }

  const data = {
    title: formData.get("title"),
    description: formData.get("description"),
    serviceDate: formData.get("serviceDate"),
    status: formData.get("status"),
    totalCost: formData.get("totalCost"),
    bikeId: formData.get("bikeId"),
  }

  let validatedData: z.infer<typeof appointmentFormSchema>
  try {
    validatedData = appointmentFormSchema.parse(data)
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

  const appointment = await createAppointment(userId, {
    clientId: parseInt(clientIdParam),
    bikeId: parseInt(validatedData.bikeId),
    title: validatedData.title,
    description: validatedData.description || null,
    serviceDate: validatedData.serviceDate ?? new Date().toISOString(),
    status: validatedData.status ?? "CONCLUIDO",
    totalCost: validatedData.totalCost ? parseFloat(validatedData.totalCost) : null,
  })

  if (!appointment) return { errors: { general: "Cliente ou bike não encontrado" } }

  return redirect(`/clients/${clientIdParam}?tab=atendimentos`)
}

export default function Page({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { client } = loaderData
  const errors = actionData?.errors

  return (
    <div className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold md:text-2xl lg:text-3xl">
          Novo Atendimento
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Cadastre um novo atendimento para {client.fullName}
        </p>
      </div>

      <div>
        <AppointmentForm
          errors={errors}
          clientId={client.id}
          clientName={client.fullName}
          bikes={client.bikes}
        />
      </div>
    </div>
  )
}

