import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import prisma from "../../prisma/prisma"
import { getUserFromRequest } from "~/lib/jwt.server"

const createClientSchema = z.object({
  fullName: z.string().min(1, "Nome completo é obrigatório"),
  cpf: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

// GET /api/clients — lista todos os clientes do usuário autenticado
export async function loader({ request }: LoaderFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const url = new URL(request.url)
  const search = url.searchParams.get("search") || ""

  const clients = await prisma.client.findMany({
    where: {
      userId: user.userId,
      ...(search && { fullName: { contains: search } }),
    },
    include: {
      _count: { select: { bikes: true, appointments: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return Response.json(clients)
}

// POST /api/clients — cria um novo cliente
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

  const result = createClientSchema.safeParse(body)
  if (!result.success) {
    return Response.json(
      { error: "Dados inválidos", details: result.error.flatten() },
      { status: 400 }
    )
  }

  const { fullName, cpf, email, phone, birthDate, address, notes } = result.data

  const client = await prisma.client.create({
    data: {
      userId: user.userId,
      fullName,
      cpf: cpf || null,
      email: email || null,
      phone: phone || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      address: address || null,
      notes: notes || null,
    },
  })

  return Response.json(client, { status: 201 })
}
