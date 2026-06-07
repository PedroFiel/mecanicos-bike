import { NavLink, useLoaderData, useSearchParams } from "react-router"
import type { Route } from "./+types/clients.$clientId"
import { requireAuth } from "~/lib/auth.server"
import { apiGet } from "~/lib/api.server"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Badge } from "~/components/ui/badge"
import { 
  IconEdit, 
  IconPlus, 
  IconBike, 
  IconCalendar,
  IconUser
} from "@tabler/icons-react"
import { formatCPF, formatPhone } from "~/features/clients/types"
import {
  formatStatus,
  formatDate,
  formatCurrency,
  getStatusColor,
} from "~/features/appointments/types"

export const handle: RouteHandle = {
  title: "Detalhes do Cliente",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAuth(request)
  type Status = "PENDENTE" | "CONCLUIDO" | "CANCELADO"
  type Bike = { id: number; model: string; brand: string | null; color: string | null }
  type Appt = {
    id: number; title: string; serviceDate: string; status: Status
    totalCost: number | null; bikeId: number
    bike: { id: number; model: string; brand: string | null }
  }
  type Client = {
    id: number; fullName: string; cpf: string | null; email: string | null
    phone: string | null; birthDate: string | null; address: string | null; notes: string | null
    bikes: Bike[]; appointments: Appt[]
  }
  const client = await apiGet<Client>(request, `/api/clients/${params.clientId}`)
  return { client }
}

export default function Page() {
  const { client } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get("tab") || "informacoes"

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {client.fullName}
          </h1>
          <p className="text-muted-foreground">Detalhes do cliente</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <NavLink to={`/clients/${client.id}/edit`}>
            <IconEdit className="mr-2 h-4 w-4" />
            Editar Cliente
          </NavLink>
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="informacoes" className="gap-2">
            <IconUser className="h-4 w-4" />
            <span className="hidden sm:inline">Informações</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="bikes" className="gap-2">
            <IconBike className="h-4 w-4" />
            Bikes
            <Badge variant="secondary" className="ml-1">
              {client.bikes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="atendimentos" className="gap-2">
            <IconCalendar className="h-4 w-4" />
            <span className="hidden sm:inline">Atendimentos</span>
            <span className="sm:hidden">Atend.</span>
            <Badge variant="secondary" className="ml-1">
              {client.appointments.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="informacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Dados cadastrais do cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Nome Completo
                  </p>
                  <p className="text-base">{client.fullName}</p>
                </div>

                {client.cpf && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      CPF
                    </p>
                    <p className="text-base">
                      <code className="text-base">{formatCPF(client.cpf)}</code>
                    </p>
                  </div>
                )}

                {client.email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Email
                    </p>
                    <p className="text-base">{client.email}</p>
                  </div>
                )}

                {client.phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Telefone
                    </p>
                    <p className="text-base">{formatPhone(client.phone)}</p>
                  </div>
                )}

                {client.birthDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Data de Nascimento
                    </p>
                    <p className="text-base">
                      {new Date(client.birthDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}

                {client.address && (
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Endereço
                    </p>
                    <p className="text-base">{client.address}</p>
                  </div>
                )}

                {client.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Observações
                    </p>
                    <p className="text-base whitespace-pre-wrap">
                      {client.notes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bikes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bikes do Cliente</CardTitle>
                  <CardDescription>
                    {client.bikes.length === 0
                      ? "Nenhuma bike cadastrada"
                      : `${client.bikes.length} bike(s) cadastrada(s)`}
                  </CardDescription>
                </div>
                <Button size="sm" asChild>
                  <NavLink to={`/bikes/new?clientId=${client.id}`}>
                    <IconPlus className="mr-2 h-4 w-4" />
                    Nova Bike
                  </NavLink>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {client.bikes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <IconBike className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Este cliente ainda não possui bikes cadastradas
                  </p>
                  <Button asChild>
                    <NavLink to={`/bikes/new?clientId=${client.id}`}>
                      <IconPlus className="mr-2 h-4 w-4" />
                      Cadastrar Primeira Bike
                    </NavLink>
                  </Button>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Cor</TableHead>
                        <TableHead className="text-center">
                          Atendimentos
                        </TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.bikes.map((bike) => {
                        const appointmentCount = client.appointments.filter(
                          (apt) => apt.bikeId === bike.id
                        ).length

                        return (
                          <TableRow key={bike.id}>
                            <TableCell className="font-medium">
                              {bike.model}
                            </TableCell>
                            <TableCell>
                              {bike.brand || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {bike.color || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">
                                {appointmentCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <NavLink to={`/bikes/${bike.id}`}>
                                  Ver Detalhes
                                </NavLink>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atendimentos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Atendimentos</CardTitle>
                  <CardDescription>
                    {client.appointments.length === 0
                      ? "Nenhum atendimento registrado"
                      : `${client.appointments.length} atendimento(s) registrado(s)`}
                  </CardDescription>
                </div>
                <Button size="sm" disabled={client.bikes.length === 0} asChild={client.bikes.length > 0}>
                  {client.bikes.length > 0 ? (
                    <NavLink to={`/appointments/new?clientId=${client.id}`}>
                      <IconPlus className="mr-2 h-4 w-4" />
                      Novo Atendimento
                    </NavLink>
                  ) : (
                    <>
                      <IconPlus className="mr-2 h-4 w-4" />
                      Novo Atendimento
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {client.appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <IconCalendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Nenhum atendimento registrado para este cliente
                  </p>
                  {client.bikes.length === 0 && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Cadastre uma bike primeiro para criar atendimentos
                    </p>
                  )}
                  <Button disabled={client.bikes.length === 0} asChild={client.bikes.length > 0}>
                    {client.bikes.length > 0 ? (
                      <NavLink to={`/appointments/new?clientId=${client.id}`}>
                        <IconPlus className="mr-2 h-4 w-4" />
                        Registrar Primeiro Atendimento
                      </NavLink>
                    ) : (
                      <>
                        <IconPlus className="mr-2 h-4 w-4" />
                        Registrar Primeiro Atendimento
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Bike</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(appointment.serviceDate)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {appointment.title}
                          </TableCell>
                          <TableCell>{appointment.bike.model}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(appointment.status)}>
                              {formatStatus(appointment.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {appointment.totalCost
                              ? formatCurrency(appointment.totalCost)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <NavLink to={`/appointments/${appointment.id}`}>
                                Ver Detalhes
                              </NavLink>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
