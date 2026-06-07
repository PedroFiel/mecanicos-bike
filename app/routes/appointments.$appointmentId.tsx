import { NavLink } from "react-router"
import type { Route } from "./+types/appointments.$appointmentId"
import { requireAuth } from "~/lib/auth.server"
import { getAppointmentById } from "~/services/appointments.server"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { IconEdit, IconUser, IconBike } from "@tabler/icons-react"
import {
  formatStatus,
  formatDate,
  formatCurrency,
  getStatusColor,
} from "~/features/appointments/types"
import type { RouteHandle } from "~/types/route"

export const handle: RouteHandle = {
  title: "Detalhes do Atendimento",
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  const appointment = await getAppointmentById(Number(params.appointmentId), userId)
  if (!appointment) throw new Response("Atendimento não encontrado", { status: 404 })
  return { appointment }
}

export default function Page({
  loaderData,
}: Route.ComponentProps) {
  const { appointment } = loaderData

  return (
    <div className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold md:text-2xl lg:text-3xl">
            {appointment.title}
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(appointment.status)}>
              {formatStatus(appointment.status)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button asChild className="w-full sm:w-auto">
            <NavLink to={`/appointments/${appointment.id}/edit`}>
              <IconEdit className="mr-2 h-4 w-4" />
              Editar
            </NavLink>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatDate(appointment.serviceDate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {appointment.totalCost
                ? formatCurrency(appointment.totalCost)
                : "Não informado"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={getStatusColor(appointment.status)} className="text-base">
              {formatStatus(appointment.status)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconUser className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Cliente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nome</p>
              <p className="text-base font-medium">
                {appointment.client.fullName}
              </p>
            </div>
            {appointment.client.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Telefone
                </p>
                <p className="text-base">{appointment.client.phone}</p>
              </div>
            )}
            <Button asChild variant="outline" size="sm" className="mt-2">
              <NavLink to={`/clients/${appointment.client.id}`}>
                Ver Cliente
              </NavLink>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconBike className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Bike</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Modelo</p>
              <p className="text-base font-medium">
                {appointment.bike.brand
                  ? `${appointment.bike.brand} ${appointment.bike.model}`
                  : appointment.bike.model}
              </p>
            </div>
            {appointment.bike.color && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cor</p>
                <p className="text-base">{appointment.bike.color}</p>
              </div>
            )}
            <Button asChild variant="outline" size="sm" className="mt-2">
              <NavLink to={`/bikes/${appointment.bike.id}`}>
                Ver Bike
              </NavLink>
            </Button>
          </CardContent>
        </Card>
      </div>

      {appointment.description && (
        <Card>
          <CardHeader>
            <CardTitle>Descrição do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base whitespace-pre-wrap">
              {appointment.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

