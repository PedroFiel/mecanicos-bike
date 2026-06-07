import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import prisma from "../../prisma/prisma"
import { getUserFromRequest } from "~/lib/jwt.server"

const createBikeSchema = z.object({
  clientId: z.number().int().positive("Cliente é obrigatório"),
  model: z.string().min(1, "Modelo é obrigatório"),
  brand: z.string().optional(),
  color: z.string().optional(),
  frameNumber: z.string().optional(),
  characteristics: z.string().optional(),
})

// GET /api/bikes — lista todas as bikes do usuário autenticado
// Query params opcionais: ?clientId=1
export async function loader({ request }: LoaderFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const url = new URL(request.url)
  const clientId = url.searchParams.get("clientId")

  const bikes = await prisma.bike.findMany({
    where: {
      userId: user.userId,
      ...(clientId && !isNaN(Number(clientId)) && { clientId: Number(clientId) }),
    },
    include: {
      client: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return Response.json(bikes)
}

// POST /api/bikes — cadastra uma nova bike para um cliente
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

  const result = createBikeSchema.safeParse(body)
  if (!result.success) {
    return Response.json(
      { error: "Dados inválidos", details: result.error.flatten() },
      { status: 400 }
    )
  }

  const { clientId, model, brand, color, frameNumber, characteristics } = result.data

  const clientExists = await prisma.client.findFirst({
    where: { id: clientId, userId: user.userId },
  })
  if (!clientExists) {
    return Response.json({ error: "Cliente não encontrado" }, { status: 404 })
  }

  const bike = await prisma.bike.create({
    data: {
      userId: user.userId,
      clientId,
      model,
      brand: brand || null,
      color: color || null,
      frameNumber: frameNumber || null,
      characteristics: characteristics || null,
    },
    include: {
      client: { select: { fullName: true } },
    },
  })

  return Response.json(bike, { status: 201 })
}
