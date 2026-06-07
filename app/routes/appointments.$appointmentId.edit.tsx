import { redirect } from "react-router"
import type { Route } from "./+types/appointments.$appointmentId.edit"
import { requireAuth } from "~/lib/auth.server"
import { getAppointmentById, updateAppointment } from "~/services/appointments.server"
import { AppointmentForm } from "~/features/appointments/components"
import { appointmentFormSchema } from "~/features/appointments/types"
import { z } from "zod"
import type { RouteHandle } from "~/types/route"

export const handle: RouteHandle = {
  title: "Editar Atendimento",
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  const appointment = await getAppointmentById(Number(params.appointmentId), userId)
  if (!appointment) throw new Response("Atendimento não encontrado", { status: 404 })
  return { appointment }
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireAuth(request)
  const appointmentId = parseInt(params.appointmentId)
  const formData = await request.formData()

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
    validatedData = appointmentFormSchema.parse(data as unknown)
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

  const updated = await updateAppointment(appointmentId, userId, {
    title: validatedData.title,
    description: validatedData.description || null,
    serviceDate: validatedData.serviceDate,
    status: validatedData.status as "PENDENTE" | "CONCLUIDO" | "CANCELADO",
    totalCost: validatedData.totalCost ? parseFloat(validatedData.totalCost) : null,
    bikeId: parseInt(validatedData.bikeId),
  })

  if (!updated) return { errors: { general: "Atendimento não encontrado" } }

  return redirect(`/appointments/${appointmentId}`)
}

export default function Page({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { appointment } = loaderData
  const errors = actionData?.errors

  const serviceDate = new Date(appointment.serviceDate)
  const formattedDate = serviceDate.toISOString().split("T")[0]

  const defaultValues = {
    title: appointment.title,
    description: appointment.description || "",
    serviceDate: formattedDate,
    status: appointment.status as "PENDENTE" | "CONCLUIDO" | "CANCELADO",
    totalCost: appointment.totalCost?.toString() || "",
    bikeId: appointment.bikeId.toString(),
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold md:text-2xl lg:text-3xl">
          Editar Atendimento
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Atualize os dados do atendimento de {appointment.client.fullName}
        </p>
      </div>

      <div>
        <AppointmentForm
          errors={errors}
          defaultValues={defaultValues}
          isEdit
          appointmentId={appointment.id}
          clientId={appointment.clientId}
          clientName={appointment.client.fullName}
          bikes={appointment.client.bikes}
        />
      </div>
    </div>
  )
}

