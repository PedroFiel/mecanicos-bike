import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import prisma from "../../prisma/prisma"
import { getUserFromRequest } from "~/lib/jwt.server"

const updateBikeSchema = z.object({
  model: z.string().min(1).optional(),
  brand: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  frameNumber: z.string().optional().nullable(),
  characteristics: z.string().optional().nullable(),
})

// GET /api/bikes/:bikeId — retorna dados completos de uma bike
export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const bikeId = Number(params.bikeId)
  if (isNaN(bikeId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  const bike = await prisma.bike.findFirst({
    where: { id: bikeId, userId: user.userId },
    include: {
      client: { select: { id: true, fullName: true } },
      appointments: {
        orderBy: { serviceDate: "desc" },
      },
    },
  })

  if (!bike) {
    return Response.json({ error: "Bike não encontrada" }, { status: 404 })
  }

  return Response.json(bike)
}

// PUT /api/bikes/:bikeId — atualiza dados de uma bike
// DELETE /api/bikes/:bikeId — remove uma bike
export async function action({ request, params }: ActionFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const bikeId = Number(params.bikeId)
  if (isNaN(bikeId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  const exists = await prisma.bike.findFirst({
    where: { id: bikeId, userId: user.userId },
  })
  if (!exists) {
    return Response.json({ error: "Bike não encontrada" }, { status: 404 })
  }

  if (request.method === "DELETE") {
    await prisma.bike.delete({ where: { id: bikeId } })
    return Response.json({ message: "Bike removida com sucesso" })
  }

  if (request.method === "PUT" || request.method === "PATCH") {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: "Body da requisição inválido" }, { status: 400 })
    }

    const result = updateBikeSchema.safeParse(body)
    if (!result.success) {
      return Response.json(
        { error: "Dados inválidos", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await prisma.bike.update({
      where: { id: bikeId },
      data: result.data,
    })

    return Response.json(updated)
  }

  return Response.json({ error: "Método não permitido" }, { status: 405 })
}
