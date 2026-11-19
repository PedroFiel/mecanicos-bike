import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { appointmentItemsSchema, dateInputSchema } from "~/features/appointments/types"
import { getOptionalUser } from "~/lib/auth.server"
import { AppointmentRuleError } from "~/services/appointments.server"
import { listAppointments, createAppointment } from "~/services/appointments.server"

const createAppointmentSchema = z.object({
  clientId: z.number().int().positive("Cliente é obrigatório"),
  bikeId: z.number().int().positive("Bike é obrigatória"),
  title: z.string().trim().min(1, "Título é obrigatório").max(100),
  description: z.string().max(500).optional().nullable(),
  serviceDate: dateInputSchema.optional(),
  status: z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]).optional(),
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
  totalCost: z.number().nonnegative().max(1_000_000).optional().nullable(),
}).refine((data) => data.items !== undefined || data.totalCost != null, {
  message: "Informe os itens do atendimento (ou totalCost para um item avulso)",
  path: ["items"],
})

// GET /api/appointments — lista todos os atendimentos do usuário autenticado
// Query params opcionais: ?clientId=1&status=PENDENTE
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getOptionalUser(request)
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
  const user = await getOptionalUser(request)
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

  let appointment
  try {
    appointment = await createAppointment(user.userId, {
      clientId: result.data.clientId,
      bikeId: result.data.bikeId,
      title: result.data.title,
      description: result.data.description || null,
      serviceDate: result.data.serviceDate ?? new Date(),
      status: result.data.status ?? "CONCLUIDO",
      odometerKm: result.data.odometerKm,
      usageHours: result.data.usageHours,
      paymentStatus: result.data.paymentStatus,
      amountPaid: result.data.amountPaid,
      paymentMethod: result.data.paymentMethod,
      paidAt: result.data.paidAt ?? null,
      parentAppointmentId: result.data.parentAppointmentId,
      linkType: result.data.linkType,
      items: result.data.items ?? [{
        description: "Serviço avulso", laborCost: result.data.totalCost ?? 0, partsCost: 0,
      }],
    })
  } catch (error) {
    if (error instanceof AppointmentRuleError) {
      return Response.json({ error: error.message, details: { fieldErrors: { [error.field]: [error.message] } } }, { status: 400 })
    }
    throw error
  }

  if (!appointment) return Response.json({ error: "Cliente ou bike não encontrado" }, { status: 404 })

  return Response.json(appointment, { status: 201 })
}
