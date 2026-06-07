import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import prisma from "../../prisma/prisma"
import { getUserFromRequest } from "~/lib/jwt.server"

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
  if (!user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const url = new URL(request.url)
  const clientId = url.searchParams.get("clientId")
  const status = url.searchParams.get("status") as
    | "PENDENTE"
    | "CONCLUIDO"
    | "CANCELADO"
    | null

  const validStatuses = ["PENDENTE", "CONCLUIDO", "CANCELADO"]

  const appointments = await prisma.appointment.findMany({
    where: {
      userId: user.userId,
      ...(clientId && !isNaN(Number(clientId)) && { clientId: Number(clientId) }),
      ...(status && validStatuses.includes(status) && { status }),
    },
    include: {
      client: { select: { id: true, fullName: true } },
      bike: { select: { id: true, model: true, brand: true } },
      serviceDetails: true,
    },
    orderBy: { serviceDate: "desc" },
  })

  return Response.json(appointments)
}

// POST /api/appointments — registra um novo atendimento
export async function action({ request }: ActionFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

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

  const { clientId, bikeId, title, description, serviceDate, status, totalCost } =
    result.data

  const clientExists = await prisma.client.findFirst({
    where: { id: clientId, userId: user.userId },
  })
  if (!clientExists) {
    return Response.json({ error: "Cliente não encontrado" }, { status: 404 })
  }

  const bikeExists = await prisma.bike.findFirst({
    where: { id: bikeId, userId: user.userId },
  })
  if (!bikeExists) {
    return Response.json({ error: "Bike não encontrada" }, { status: 404 })
  }

  const appointment = await prisma.appointment.create({
    data: {
      userId: user.userId,
      clientId,
      bikeId,
      title,
      description: description || null,
      serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
      status: status ?? "CONCLUIDO",
      totalCost: totalCost ?? null,
    },
    include: {
      client: { select: { fullName: true } },
      bike: { select: { model: true, brand: true } },
    },
  })

  return Response.json(appointment, { status: 201 })
}
