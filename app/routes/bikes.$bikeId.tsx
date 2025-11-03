import { NavLink, useLoaderData } from "react-router"
import type { Route } from "./+types/bikes.$bikeId"
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
import { IconEdit, IconPlus, IconCalendar, IconUser } from "@tabler/icons-react"
import { getBikeDisplayName } from "~/features/bikes/types"

export const handle: RouteHandle = {
  title: "Detalhes da Bike",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  const bikeId = parseInt(params.bikeId)

  const bike = await prisma.bike.findFirst({
    where: {
      id: bikeId,
      userId,
    },
    include: {
      client: true,
      appointments: {
        orderBy: {
          serviceDate: "desc",
        },
      },
    },
  })

  if (!bike) {
    throw new Response("Bike não encontrada", { status: 404 })
  }

  return { bike }
}

export default function Page() {
  const { bike } = useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {getBikeDisplayName(bike)}
          </h1>
          <p className="text-muted-foreground">
            Cliente: {bike.client.fullName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <NavLink to={`/clients/${bike.clientId}?tab=bikes`}>
              <IconUser className="mr-2 h-4 w-4" />
              Ver Cliente
            </NavLink>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <NavLink to={`/bikes/${bike.id}/edit`}>
              <IconEdit className="mr-2 h-4 w-4" />
              Editar
            </NavLink>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Bike</CardTitle>
          <CardDescription>Dados cadastrais da bicicleta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Modelo</p>
              <p className="text-base">{bike.model}</p>
            </div>

            {bike.brand && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Marca</p>
                <p className="text-base">{bike.brand}</p>
              </div>
            )}

            {bike.color && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cor</p>
                <p className="text-base">{bike.color}</p>
              </div>
            )}

            {bike.frameNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Número do Quadro
                </p>
                <p className="text-base">
                  <code className="text-sm">{bike.frameNumber}</code>
                </p>
              </div>
            )}

            {bike.characteristics && (
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Características
                </p>
                <p className="text-base whitespace-pre-wrap">
                  {bike.characteristics}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Atendimentos</CardTitle>
              <CardDescription>
                {bike.appointments.length === 0
                  ? "Nenhum atendimento registrado"
                  : `${bike.appointments.length} atendimento(s) registrado(s)`}
              </CardDescription>
            </div>
            <Button size="sm" disabled>
              <IconPlus className="mr-2 h-4 w-4" />
              Novo Atendimento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bike.appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconCalendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhum atendimento registrado para esta bike
              </p>
              <Button disabled>
                <IconPlus className="mr-2 h-4 w-4" />
                Registrar Primeiro Atendimento
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bike.appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(appointment.serviceDate).toLocaleDateString(
                          "pt-BR"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {appointment.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            appointment.status === "CONCLUIDO"
                              ? "default"
                              : appointment.status === "PENDENTE"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {appointment.totalCost
                          ? new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(appointment.totalCost)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" disabled>
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

