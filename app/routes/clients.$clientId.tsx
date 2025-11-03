import { useLoaderData } from "react-router"
import type { Route } from "./+types/clients.$clientId"
import { requireAuth } from "~/lib/auth.server"
import prisma from "../../prisma/prisma"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { formatCPF, formatPhone } from "~/types/client"

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  const clientId = parseInt(params.clientId)

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      userId,
    },
    include: {
      bikes: true,
      appointments: {
        include: {
          bike: true,
        },
        orderBy: {
          serviceDate: "desc",
        },
      },
    },
  })

  if (!client) {
    throw new Response("Cliente não encontrado", { status: 404 })
  }

  return { client }
}

export default function ClientDetailPage() {
  const { client } = useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{client.fullName}</h1>
        <p className="text-muted-foreground">Detalhes do cliente</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Cliente</CardTitle>
          <CardDescription>
            Esta página será implementada com abas: Informações Pessoais, Bikes
            e Histórico de Atendimentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nome</p>
                <p className="text-base">{client.fullName}</p>
              </div>
              {client.cpf && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CPF</p>
                  <p className="text-base">
                    <code className="text-sm">{formatCPF(client.cpf)}</code>
                  </p>
                </div>
              )}
              {client.email && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base">{client.email}</p>
                </div>
              )}
              {client.phone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p className="text-base">{formatPhone(client.phone)}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Bikes</p>
                <p className="text-base">{client.bikes.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Atendimentos</p>
                <p className="text-base">{client.appointments.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

