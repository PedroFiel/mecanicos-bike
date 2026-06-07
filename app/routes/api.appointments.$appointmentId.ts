import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getUserFromRequest } from "~/lib/jwt.server"
import { getAppointmentById, updateAppointment, deleteAppointment } from "~/services/appointments.server"

const updateAppointmentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  serviceDate: z.string().optional(),
  status: z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]).optional(),
  totalCost: z.number().nonnegative().optional().nullable(),
  bikeId: z.number().int().positive().optional(),
})

// GET /api/appointments/:appointmentId — retorna um atendimento com todos os detalhes
export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 })

  const appointmentId = Number(params.appointmentId)
  if (isNaN(appointmentId)) return Response.json({ error: "ID inválido" }, { status: 400 })

  const appointment = await getAppointmentById(appointmentId, user.userId)
  if (!appointment) return Response.json({ error: "Atendimento não encontrado" }, { status: 404 })

  return Response.json(appointment)
}

// PUT /api/appointments/:appointmentId — atualiza um atendimento
// DELETE /api/appointments/:appointmentId — remove um atendimento
export async function action({ request, params }: ActionFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 })

  const appointmentId = Number(params.appointmentId)
  if (isNaN(appointmentId)) return Response.json({ error: "ID inválido" }, { status: 400 })

  if (request.method === "DELETE") {
    const deleted = await deleteAppointment(appointmentId, user.userId)
    if (!deleted) return Response.json({ error: "Atendimento não encontrado" }, { status: 404 })
    return Response.json({ message: "Atendimento removido com sucesso" })
  }

  if (request.method === "PUT" || request.method === "PATCH") {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: "Body da requisição inválido" }, { status: 400 })
    }

    const result = updateAppointmentSchema.safeParse(body)
    if (!result.success) {
      return Response.json(
        { error: "Dados inválidos", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await updateAppointment(appointmentId, user.userId, result.data)
    if (!updated) return Response.json({ error: "Atendimento não encontrado" }, { status: 404 })

    return Response.json(updated)
  }

  return Response.json({ error: "Método não permitido" }, { status: 405 })
}
