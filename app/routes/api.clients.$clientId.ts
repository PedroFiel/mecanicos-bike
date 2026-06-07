import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import prisma from "../../prisma/prisma"
import { getUserFromRequest } from "~/lib/jwt.server"

const updateClientSchema = z.object({
  fullName: z.string().min(1).optional(),
  cpf: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// GET /api/clients/:clientId — retorna dados completos de um cliente
export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const clientId = Number(params.clientId)
  if (isNaN(clientId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: user.userId },
    include: {
      bikes: true,
      appointments: {
        include: { serviceDetails: true },
        orderBy: { serviceDate: "desc" },
      },
    },
  })

  if (!client) {
    return Response.json({ error: "Cliente não encontrado" }, { status: 404 })
  }

  return Response.json(client)
}

// PUT /api/clients/:clientId — atualiza dados do cliente
// DELETE /api/clients/:clientId — remove o cliente
export async function action({ request, params }: ActionFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const clientId = Number(params.clientId)
  if (isNaN(clientId)) {
    return Response.json({ error: "ID inválido" }, { status: 400 })
  }

  const exists = await prisma.client.findFirst({
    where: { id: clientId, userId: user.userId },
  })
  if (!exists) {
    return Response.json({ error: "Cliente não encontrado" }, { status: 404 })
  }

  if (request.method === "DELETE") {
    await prisma.client.delete({ where: { id: clientId } })
    return Response.json({ message: "Cliente removido com sucesso" })
  }

  if (request.method === "PUT" || request.method === "PATCH") {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: "Body da requisição inválido" }, { status: 400 })
    }

    const result = updateClientSchema.safeParse(body)
    if (!result.success) {
      return Response.json(
        { error: "Dados inválidos", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { birthDate, ...rest } = result.data
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...rest,
        ...(birthDate !== undefined && {
          birthDate: birthDate ? new Date(birthDate) : null,
        }),
      },
    })

    return Response.json(updated)
  }

  return Response.json({ error: "Método não permitido" }, { status: 405 })
}
