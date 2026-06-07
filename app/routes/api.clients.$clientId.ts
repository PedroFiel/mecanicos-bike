import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getUserFromRequest } from "~/lib/jwt.server"
import { getClientById, updateClient, deleteClient } from "~/services/clients.server"

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
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 })

  const clientId = Number(params.clientId)
  if (isNaN(clientId)) return Response.json({ error: "ID inválido" }, { status: 400 })

  const client = await getClientById(clientId, user.userId)
  if (!client) return Response.json({ error: "Cliente não encontrado" }, { status: 404 })

  return Response.json(client)
}

// PUT /api/clients/:clientId — atualiza dados do cliente
// DELETE /api/clients/:clientId — remove o cliente
export async function action({ request, params }: ActionFunctionArgs) {
  const user = getUserFromRequest(request)
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 })

  const clientId = Number(params.clientId)
  if (isNaN(clientId)) return Response.json({ error: "ID inválido" }, { status: 400 })

  if (request.method === "DELETE") {
    const deleted = await deleteClient(clientId, user.userId)
    if (!deleted) return Response.json({ error: "Cliente não encontrado" }, { status: 404 })
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

    try {
      const updated = await updateClient(clientId, user.userId, result.data)
      if (!updated) return Response.json({ error: "Cliente não encontrado" }, { status: 404 })
      return Response.json(updated)
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        return Response.json(
          { error: "CPF já cadastrado", details: { fieldErrors: { cpf: ["Este CPF já está cadastrado em outro cliente"] } } },
          { status: 409 }
        )
      }
      return Response.json({ error: "Erro interno do servidor" }, { status: 500 })
    }
  }

  return Response.json({ error: "Método não permitido" }, { status: 405 })
}

function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  )
}
