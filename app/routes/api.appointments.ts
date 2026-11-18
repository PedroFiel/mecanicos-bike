import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getUserFromRequest } from "~/lib/jwt.server"
import { listAppointments, createAppointment } from "~/services/appointments.server"

const appointmentItemInputSchema = z.object({
  serviceTemplateId: z.number().int().positive().optional().nullable(),
  description: z.string().min(1, "Descrição do item é obrigatória"),
  laborCost: z.number().nonnegative().default(0),
  partsDescription: z.string().optional().nullable(),
  partsCost: z.number().nonnegative().default(0),
})

const createAppointmentSchema = z.object({
  clientId: z.number().int().positive("Cliente é obrigatório"),
  bikeId: z.number().int().positive("Bike é obrigatória"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional().nullable(),
  serviceDate: z.string().optional(),
  status: z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]).optional(),
  odometerKm: z.number().int().nonnegative().optional().nullable(),
  usageHours: z.number().int().nonnegative().optional().nullable(),
  paymentStatus: z.enum(["PENDENTE", "PARCIAL", "PAGO", "CANCELADO"]).optional(),
  amountPaid: z.number().nonnegative().optional().nullable(),
  paymentMethod: z.enum(["PIX", "DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "OUTRO"]).optional().nullable(),
  paidAt: z.string().optional().nullable(),
  parentAppointmentId: z.number().int().positive().optional().nullable(),
  linkType: z.enum(["REVISAO_PROGRAMADA", "RETORNO_GARANTIA", "RETRABALHO", "AVULSO"]).optional().nullable(),
  items: z.array(appointmentItemInputSchema).optional(),
  totalCost: z.number().nonnegative().optional().nullable(),
})

// GET /api/appointments — lista todos os atendimentos do usuário autenticado
// Query params opcionais: ?clientId=1&status=PENDENTE
export async function loader({ request }: LoaderFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 })

  const url = new URL(request.url)
  const clientIdParam = url.searchParams.get("clientId")
  const statusParam = url.searchParams.get("status")

  const validStatuses = ["PENDENTE", "CONCLUIDO", "CANCELADO"]
  const clientId = clientIdParam && !isNaN(Number(clientIdParam)) ? Number(clientIdParam) : undefined
  const status = statusParam && validStatuses.includes(statusParam)
    ? (statusParam as "PENDENTE" | "CONCLUIDO" | "CANCELADO")
    : undefined

  const appointments = await listAppointments(user.userId, { clientId, status })
  return Response.json(appointments)
}

// POST /api/appointments — registra um novo atendimento
export async function action({ request }: ActionFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 })

  if (request.method !== "POST") {
    return Response.json({ error: "Método não permitido" }, { status: 405 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Body da requisição inválido" }, { status: 400 })
  }

  const result = createAppointmentSchema.safeParse(body)
  if (!result.success) {
    return Response.json(
      { error: "Dados inválidos", details: result.error.flatten() },
      { status: 400 }
    )
  }

  const appointment = await createAppointment(user.userId, {
    clientId: result.data.clientId,
    bikeId: result.data.bikeId,
    title: result.data.title,
    description: result.data.description || null,
    serviceDate: result.data.serviceDate ?? new Date().toISOString(),
    status: result.data.status ?? "CONCLUIDO",
    odometerKm: result.data.odometerKm,
    usageHours: result.data.usageHours,
    paymentStatus: result.data.paymentStatus,
    amountPaid: result.data.amountPaid,
    paymentMethod: result.data.paymentMethod,
    paidAt: result.data.paidAt ? new Date(result.data.paidAt) : null,
    parentAppointmentId: result.data.parentAppointmentId,
    linkType: result.data.linkType,
    items: result.data.items,
    totalCost: result.data.totalCost ?? null,
  })

  if (!appointment) return Response.json({ error: "Cliente ou bike não encontrado" }, { status: 404 })

  return Response.json(appointment, { status: 201 })
}
