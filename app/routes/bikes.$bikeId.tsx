import { NavLink, useFetcher, useLoaderData } from "react-router"
import type { Route } from "./+types/bikes.$bikeId"
import { requireAuth } from "~/lib/auth.server"
import { getBikeById } from "~/services/bikes.server"
import type { RouteHandle } from "~/types/route"
import { MarkAsPaidButton } from "~/features/appointments/components"
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
import { IconEdit, IconPlus, IconCalendar, IconUser, IconCalendarTime } from "@tabler/icons-react"
import { getBikeDisplayName } from "~/features/bikes/types"
import {
  formatStatus,
  formatDate,
  formatCurrency,
  getStatusColor,
  getPaymentStatusBadge,
  formatReminderStatus,
} from "~/features/appointments/types"

export const handle: RouteHandle = {
  title: "Detalhes da Bike",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  const bike = await getBikeById(Number(params.bikeId), userId)
  if (!bike) throw new Response("Bike não encontrada", { status: 404 })
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

            {bike.type && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <Badge variant="outline" className="mt-0.5">{bike.type}</Badge>
              </div>
            )}

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

            {bike.currentOdometerKm != null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Odômetro Atual</p>
                <p className="text-base font-semibold">{bike.currentOdometerKm.toLocaleString("pt-BR")} km</p>
              </div>
            )}

            {bike.currentHours != null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Horímetro Atual</p>
                <p className="text-base font-semibold">{bike.currentHours.toLocaleString("pt-BR")} horas</p>
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

      {/* SEÇÃO DE PRÓXIMAS REVISÕES */}
      {bike.reminders && bike.reminders.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconCalendarTime className="h-5 w-5 text-primary" />
              <CardTitle>Próximas Revisões Recomendadas</CardTitle>
            </div>
            <CardDescription>
              Serviços programados com base em tempo decorrido, odômetro ou horas de uso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bike.reminders.map((rem: any) => (
                <div
                  key={rem.id}
                  className="rounded-lg border bg-muted/20 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {rem.serviceTemplate?.name || "Revisão"}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {formatReminderStatus(rem.status)}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {rem.dueDate && (
                      <p>
                        Vencimento:{" "}
                        <strong className="text-foreground">
                          {formatDate(rem.dueDate)}
                        </strong>
                      </p>
                    )}
                    {rem.dueKm != null && (
                      <p>
                        Odômetro alvo:{" "}
                        <strong className="text-foreground">
                          {rem.dueKm.toLocaleString("pt-BR")} km
                        </strong>
                      </p>
                    )}
                    {rem.dueHours != null && (
                      <p>
                        Horímetro alvo:{" "}
                        <strong className="text-foreground">
                          {rem.dueHours.toLocaleString("pt-BR")} h
                        </strong>
                      </p>
                    )}
                  </div>
                  <ReminderActions id={rem.id} status={rem.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            <Button size="sm" asChild>
              <NavLink to={`/appointments/new?clientId=${bike.clientId}`}>
                <IconPlus className="mr-2 h-4 w-4" />
                Novo Atendimento
              </NavLink>
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
              <Button asChild>
                <NavLink to={`/appointments/new?clientId=${bike.clientId}`}>
                  <IconPlus className="mr-2 h-4 w-4" />
                  Registrar Primeiro Atendimento
                </NavLink>
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
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bike.appointments.map((appointment) => {
                    const payBadge = getPaymentStatusBadge(appointment.paymentStatus)
                    return (
                      <TableRow key={appointment.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(appointment.serviceDate)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {appointment.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(appointment.status)}>
                            {formatStatus(appointment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={payBadge.className}>
                            {payBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {appointment.totalCost
                            ? formatCurrency(appointment.totalCost)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap space-x-1">
                          {appointment.paymentStatus !== "PAGO" && appointment.status !== "CANCELADO" && (
                            <MarkAsPaidButton appointmentId={appointment.id} />
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <NavLink to={`/appointments/${appointment.id}`}>
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
    </div>
  )
}


function ReminderActions({ id, status }: { id: number; status: string }) {
  const fetcher = useFetcher<{ error: string | null }>()
  const busy = fetcher.state !== "idle"
  return (
    <fetcher.Form method="post" action="/dashboard" className="flex flex-wrap gap-1.5 pt-1">
      <input type="hidden" name="reminderId" value={id} />
      {status !== "AGENDADO" && (
        <Button size="sm" variant="outline" name="status" value="AGENDADO" disabled={busy}>
          Agendado
        </Button>
      )}
      <Button size="sm" variant="ghost" name="status" value="DISPENSADO" disabled={busy}>
        Dispensar
      </Button>
      {fetcher.data?.error && <p className="w-full text-xs text-red-500">{fetcher.data.error}</p>}
    </fetcher.Form>
  )
}
