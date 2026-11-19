import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { appointmentItemsSchema, dateInputSchema } from "~/features/appointments/types"
import { getOptionalUser } from "~/lib/auth.server"
import { AppointmentRuleError } from "~/services/appointments.server"
import { getAppointmentById, updateAppointment, deleteAppointment } from "~/services/appointments.server"

const updateAppointmentSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  serviceDate: dateInputSchema.optional(),
  status: z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]).optional(),
  totalCost: z.number().nonnegative().max(1_000_000).optional().nullable(),
  bikeId: z.number().int().positive().optional(),
  odometerKm: z.number().nonnegative().max(1_000_000).optional().nullable(),
  usageHours: z.number().nonnegative().max(100_000).optional().nullable(),
  paymentStatus: z.enum(["PENDENTE", "PARCIAL", "PAGO"]).optional(),
  amountPaid: z.number().nonnegative().nullish().transform((amount) => amount ?? undefined),
  paymentMethod: z.enum(["PIX", "DINHEIRO", "CREDITO", "DEBITO", "CARTAO_CREDITO", "CARTAO_DEBITO"])
    .transform((method) => method === "CARTAO_CREDITO" ? "CREDITO" as const : method === "CARTAO_DEBITO" ? "DEBITO" as const : method).optional().nullable(),
  paidAt: dateInputSchema.nullish(),
  parentAppointmentId: z.number().int().positive().optional().nullable(),
  linkType: z.enum(["CONTINUACAO", "GARANTIA", "RETORNO_GARANTIA", "RETRABALHO"])
    .transform((type) => type === "CONTINUACAO" ? type : "GARANTIA" as const).optional().nullable(),
  items: appointmentItemsSchema.optional(),
})

// GET /api/appointments/:appointmentId — retorna um atendimento com todos os detalhes
export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await getOptionalUser(request)
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
  const user = await getOptionalUser(request)
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

    const { totalCost, items, ...fields } = result.data
    let updated
    try {
      updated = await updateAppointment(appointmentId, user.userId, {
        ...fields,
        items: items ?? (totalCost == null ? undefined : [{
          description: "Serviço avulso", laborCost: totalCost, partsCost: 0,
        }]),
      })
    } catch (error) {
      if (error instanceof AppointmentRuleError) {
        return Response.json({ error: error.message, details: { fieldErrors: { [error.field]: [error.message] } } }, { status: 400 })
      }
      throw error
    }
    if (!updated) return Response.json({ error: "Atendimento não encontrado" }, { status: 404 })

    return Response.json(updated)
  }

  return Response.json({ error: "Método não permitido" }, { status: 405 })
}
