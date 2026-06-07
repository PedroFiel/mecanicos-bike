import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getUserFromRequest } from "~/lib/jwt.server"
import { listAppointments, createAppointment } from "~/services/appointments.server"

const createAppointmentSchema = z.object({
  clientId: z.number().int().positive("Cliente é obrigatório"),
  bikeId: z.number().int().positive("Bike é obrigatória"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  serviceDate: z.string().optional(),
  status: z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]).optional(),
  totalCost: z.number().nonnegative().optional(),
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

  const { clientId, bikeId, title, description, serviceDate, status, totalCost } = result.data

  const appointment = await createAppointment(user.userId, {
    clientId,
    bikeId,
    title,
    description: description || null,
    serviceDate: serviceDate ?? new Date().toISOString(),
    status: status ?? "CONCLUIDO",
    totalCost: totalCost ?? null,
  })

  if (!appointment) return Response.json({ error: "Cliente ou bike não encontrado" }, { status: 404 })

  return Response.json(appointment, { status: 201 })
}
