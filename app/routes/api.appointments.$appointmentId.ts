import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import prisma from "../../prisma/prisma"
import { getUserFromRequest } from "~/lib/jwt.server"

const updateAppointmentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  serviceDate: z.string().optional(),
  status: z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]).optional(),
  totalCost: z.number().nonnegative().optional().nullable(),
})

// GET /api/appointments/:appointmentId — retorna um atendimento com todos os detalhes
export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const appointmentId = Number(params.appointmentId)
  if (isNaN(appointmentId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, userId: user.userId },
    include: {
      client: { select: { id: true, fullName: true, phone: true } },
      bike: true,
      serviceDetails: true,
    },
  })

  if (!appointment) {
    return Response.json({ error: "Atendimento não encontrado" }, { status: 404 })
  }

  return Response.json(appointment)
}

// PUT /api/appointments/:appointmentId — atualiza um atendimento
// DELETE /api/appointments/:appointmentId — remove um atendimento
export async function action({ request, params }: ActionFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const appointmentId = Number(params.appointmentId)
  if (isNaN(appointmentId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  const exists = await prisma.appointment.findFirst({
    where: { id: appointmentId, userId: user.userId },
  })
  if (!exists) {
    return Response.json({ error: "Atendimento não encontrado" }, { status: 404 })
  }

  if (request.method === "DELETE") {
    // Remove os detalhes do serviço antes de remover o atendimento (FK constraint)
    await prisma.serviceDetail.deleteMany({ where: { appointmentId } })
    await prisma.appointment.delete({ where: { id: appointmentId } })
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

    const { serviceDate, ...rest } = result.data
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...rest,
        ...(serviceDate !== undefined && { serviceDate: new Date(serviceDate) }),
      },
      include: {
        client: { select: { fullName: true } },
        bike: { select: { model: true } },
        serviceDetails: true,
      },
    })

    return Response.json(updated)
  }

  return Response.json({ error: "Método não permitido" }, { status: 405 })
}
