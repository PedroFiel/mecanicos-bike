import { NavLink, useLoaderData } from "react-router"
import type { Route } from "./+types/clients"
import { requireAuth } from "~/lib/auth.server"
import prisma from "../../prisma/prisma"
import type { RouteHandle } from "~/types/route"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { Badge } from "~/components/ui/badge"
import { IconPlus, IconEye, IconUsers } from "@tabler/icons-react"
import { formatCPF } from "~/types/client"

export const handle: RouteHandle = {
  title: "Clientes",
};

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireAuth(request)

  const clients = await prisma.client.findMany({
    where: { userId },
    include: {
      bikes: true,
      appointments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return { clients }
}

export default function ClientsPage() {
  const { clients } = useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e seus atendimentos
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <NavLink to="/clients/new">
            <IconPlus className="mr-2 h-4 w-4" />
            Adicionar Cliente
          </NavLink>
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <IconUsers className="h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">
              Nenhum cliente cadastrado
            </CardTitle>
            <CardDescription className="text-center mb-6">
              Comece adicionando seu primeiro cliente para gerenciar
              atendimentos e bikes
            </CardDescription>
            <Button asChild>
              <NavLink to="/clients/new">
                <IconPlus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Cliente
              </NavLink>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              Total de {clients.length} cliente(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead className="min-w-[120px]">CPF</TableHead>
                    <TableHead className="text-center min-w-[80px]">Bikes</TableHead>
                    <TableHead className="text-center min-w-[120px]">Atendimentos</TableHead>
                    <TableHead className="text-right min-w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.fullName}
                      </TableCell>
                      <TableCell>
                        {client.cpf ? (
                          <code className="text-base whitespace-nowrap">{formatCPF(client.cpf)}</code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{client.bikes.length}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {client.appointments.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <NavLink to={`/clients/${client.id}`}>
                            <IconEye className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Ver Detalhes</span>
                            <span className="sm:hidden">Ver</span>
                          </NavLink>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

