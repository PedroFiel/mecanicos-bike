import { NavLink, Form, useNavigation, useActionData } from "react-router";
import type { Route } from "./+types/appointments.$appointmentId";
import { requireAuth } from "~/lib/auth.server";
import {
  getAppointmentById,
  markAsPaid,
  type PaymentMethod,
} from "~/services/appointments.server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Spinner } from "~/components/ui/spinner";
import {
  IconEdit,
  IconUser,
  IconBike,
  IconReceipt2,
  IconCheck,
  IconCalendarTime,
  IconLink,
  IconGauge,
  IconAlertCircle,
} from "@tabler/icons-react";
import {
  formatStatus,
  formatDate,
  formatCurrency,
  getStatusColor,
  formatPaymentStatus,
  formatPaymentMethod,
  formatLinkType,
  formatReminderStatus,
  getPaymentStatusBadge,
} from "~/features/appointments/types";
import type { RouteHandle } from "~/types/route";

export const handle: RouteHandle = {
  title: "Detalhes do Atendimento",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireAuth(request);
  const appointment = await getAppointmentById(Number(params.appointmentId), userId);
  if (!appointment) {
    throw new Response("Atendimento não encontrado", { status: 404 });
  }
  return { appointment };
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireAuth(request);
  const appointmentId = Number(params.appointmentId);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "mark_as_paid") {
    const method = (formData.get("paymentMethod") as PaymentMethod) || "PIX";
    const amount = formData.get("amount")
      ? Number(formData.get("amount"))
      : undefined;

    await markAsPaid(appointmentId, userId, { method, amount });
    return { success: true, message: "Atendimento marcado como pago!" };
  }

  return { success: false };
}

export default function Page({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { appointment } = loaderData;
  const navigation = useNavigation();
  const isMarkingPaid =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "mark_as_paid";

  const paymentBadge = getPaymentStatusBadge(appointment.paymentStatus);

  // Subtotais de mão de obra e peças
  const laborTotal = appointment.items.reduce(
    (sum, it) => sum + (it.laborCost || 0),
    0
  );
  const partsTotal = appointment.items.reduce(
    (sum, it) => sum + (it.partsCost || 0),
    0
  );

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold md:text-2xl lg:text-3xl">
              {appointment.title}
            </h1>
            <Badge variant={getStatusColor(appointment.status)}>
              {formatStatus(appointment.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Atendimento #{appointment.id} realizado em{" "}
            <span className="font-medium text-foreground">
              {formatDate(appointment.serviceDate)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <NavLink to={`/appointments/${appointment.id}/edit`}>
              <IconEdit className="mr-2 h-4 w-4" />
              Editar Atendimento
            </NavLink>
          </Button>
        </div>
      </div>

      {actionData?.message && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
          <IconCheck className="h-4 w-4" />
          <span>{actionData.message}</span>
        </div>
      )}

      {/* CARDS DE RESUMO (FINANCEIRO, STATUS, TELEMETRIA) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Custo Total */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Custo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(appointment.totalCost)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Mão de obra: {formatCurrency(laborTotal)} · Peças:{" "}
              {formatCurrency(partsTotal)}
            </p>
          </CardContent>
        </Card>

        {/* Status de Pagamento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${paymentBadge.className}`}
              >
                {paymentBadge.label}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(appointment.amountPaid)} pago
              </span>
            </div>

            {appointment.paymentStatus !== "PAGO" && (
              <Form method="post" className="pt-1">
                <input type="hidden" name="intent" value="mark_as_paid" />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs w-full"
                  disabled={isMarkingPaid}
                >
                  {isMarkingPaid ? (
                    <Spinner className="mr-1 h-3 w-3" />
                  ) : (
                    <IconReceipt2 className="mr-1 h-3 w-3 text-emerald-600" />
                  )}
                  Marcar como Pago
                </Button>
              </Form>
            )}

            {appointment.paymentMethod && (
              <p className="text-xs text-muted-foreground">
                Via {formatPaymentMethod(appointment.paymentMethod)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Telemetria na data */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Telemetria na Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Odômetro:</span>
              <span className="font-semibold">
                {appointment.odometerKm != null
                  ? `${appointment.odometerKm.toLocaleString("pt-BR")} km`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Horas de uso:</span>
              <span className="font-semibold">
                {appointment.usageHours != null
                  ? `${appointment.usageHours.toLocaleString("pt-BR")} h`
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Vínculo de Encadeamento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Vínculo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointment.parent ? (
              <div className="space-y-1">
                <Badge
                  variant={
                    appointment.linkType === "GARANTIA"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  {formatLinkType(appointment.linkType)}
                </Badge>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  Origem:{" "}
                  <NavLink
                    to={`/appointments/${appointment.parent.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    #{appointment.parent.id} {appointment.parent.title}
                  </NavLink>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Atendimento independente
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DADOS DO CLIENTE E DA BIKE */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <IconUser className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Cliente</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm">
              <NavLink to={`/clients/${appointment.client.id}`}>
                Ver Cliente →
              </NavLink>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium text-base">
              {appointment.client.fullName}
            </p>
            {appointment.client.phone && (
              <p className="text-sm text-muted-foreground">
                Telefone: {appointment.client.phone}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <IconBike className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Bicicleta</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm">
              <NavLink to={`/bikes/${appointment.bike.id}`}>
                Ver Bike →
              </NavLink>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium text-base">
              {appointment.bike.brand
                ? `${appointment.bike.brand} ${appointment.bike.model}`
                : appointment.bike.model}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {appointment.bike.type && (
                <Badge variant="outline" className="text-[10px]">
                  {appointment.bike.type}
                </Badge>
              )}
              {appointment.bike.color && <span>Cor: {appointment.bike.color}</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ITENS DO ATENDIMENTO (MÃO DE OBRA E PEÇAS) */}
      <Card>
        <CardHeader>
          <CardTitle>Itens Realizados & Peças</CardTitle>
          <CardDescription>
            Discriminação de todos os serviços de mão de obra e peças aplicadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Serviço / Mão de Obra</TableHead>
                  <TableHead className="w-[15%]">Valor Mão de Obra</TableHead>
                  <TableHead className="w-[30%]">Peça Aplicada</TableHead>
                  <TableHead className="w-[15%] text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointment.items.map((item) => {
                  const subtotal = item.laborCost + item.partsCost;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>
                          <span>{item.description}</span>
                          {item.serviceTemplate && (
                            <Badge
                              variant="secondary"
                              className="ml-2 text-[10px]"
                            >
                              {item.serviceTemplate.category}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.laborCost)}</TableCell>
                      <TableCell>
                        {item.partsDescription ? (
                          <div>
                            <span>{item.partsDescription}</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({formatCurrency(item.partsCost)})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(subtotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* LEMBRETES DE REVISÃO GERADOS */}
      {appointment.items.some((it) => it.reminder) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconCalendarTime className="h-5 w-5 text-primary" />
              <CardTitle>Lembretes de Revisão Gerados</CardTitle>
            </div>
            <CardDescription>
              Critérios calculados automaticamente para o próximo retorno desta
              bicicleta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {appointment.items
                .filter((it) => it.reminder)
                .map((it) => {
                  const rem = it.reminder!;
                  return (
                    <div
                      key={rem.id}
                      className="rounded-lg border bg-muted/20 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          {it.description}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {formatReminderStatus(rem.status)}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        {rem.dueDate && (
                          <p>
                            Vence em:{" "}
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
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CADEIA DE ATENDIMENTOS (CONTINUAÇÕES E GARANTIAS) */}
      {appointment.children.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconLink className="h-5 w-5 text-primary" />
              <CardTitle>Histórico de Retornos Vinculados</CardTitle>
            </div>
            <CardDescription>
              Atendimentos realizados em sequência ou retornos de garantia
              associados a este serviço.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {appointment.children.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        child.linkType === "GARANTIA"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {formatLinkType(child.linkType)}
                    </Badge>
                    <NavLink
                      to={`/appointments/${child.id}`}
                      className="font-medium text-sm hover:underline"
                    >
                      #{child.id} - {child.title}
                    </NavLink>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(child.serviceDate)}</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(child.totalCost)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* OBSERVAÇÕES */}
      {appointment.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {appointment.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
