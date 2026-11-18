import {
  IconTrendingUp,
  IconTrendingDown,
  IconCash,
  IconReceipt,
  IconClock,
  IconAlertTriangle,
  IconCalendarEvent,
  IconRefresh,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface MetricsProps {
  metrics: {
    revenue: {
      value: number;
      variation: number | null;
    };
    ticket: {
      value: number;
      variation: number | null;
    };
    receivable: {
      value: number;
      count: number;
    };
    openAppointments: {
      value: number;
    };
    revisionsDue: {
      value: number;
    };
    retention: {
      customerRetentionRate: number;
      reworkRate: number;
    };
  };
  periodLabel: string;
}

function formatCurrency(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function DashboardMetrics({ metrics, periodLabel }: MetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* 1. Faturamento */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Faturamento
          </CardTitle>
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <IconCash className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {formatCurrency(metrics.revenue.value)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {metrics.revenue.variation !== null ? (
              <Badge
                variant={metrics.revenue.variation >= 0 ? "default" : "destructive"}
                className="h-5 px-1.5 text-[11px] font-medium"
              >
                {metrics.revenue.variation >= 0 ? (
                  <IconTrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <IconTrendingDown className="mr-1 h-3 w-3" />
                )}
                {metrics.revenue.variation >= 0 ? "+" : ""}
                {metrics.revenue.variation}%
              </Badge>
            ) : null}
            <span>vs. período anterior</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Ticket Médio */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ticket Médio
          </CardTitle>
          <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
            <IconReceipt className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {formatCurrency(metrics.ticket.value)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {metrics.ticket.variation !== null ? (
              <Badge
                variant={metrics.ticket.variation >= 0 ? "default" : "destructive"}
                className="h-5 px-1.5 text-[11px] font-medium"
              >
                {metrics.ticket.variation >= 0 ? (
                  <IconTrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <IconTrendingDown className="mr-1 h-3 w-3" />
                )}
                {metrics.ticket.variation >= 0 ? "+" : ""}
                {metrics.ticket.variation}%
              </Badge>
            ) : null}
            <span>por atendimento</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Total a Receber */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total a Receber
          </CardTitle>
          <div className="rounded-full bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
            <IconAlertTriangle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {formatCurrency(metrics.receivable.value)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {metrics.receivable.count} pagamento(s) pendente(s)
          </p>
        </CardContent>
      </Card>

      {/* 4. Atendimentos em Aberto */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Em Aberto
          </CardTitle>
          <div className="rounded-full bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
            <IconClock className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {metrics.openAppointments.value}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Orçamentos ou serviços em curso
          </p>
        </CardContent>
      </Card>

      {/* 5. Revisões em até 15 dias */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Revisões Próximas
          </CardTitle>
          <div className="rounded-full bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
            <IconCalendarEvent className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
            {metrics.revisionsDue.value}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Vencidas ou a vencer em 15 dias
          </p>
        </CardContent>
      </Card>

      {/* 6. Retenção & Retrabalho */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Retenção / Garantia
          </CardTitle>
          <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
            <IconRefresh className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {metrics.retention.customerRetentionRate}%
            </span>
            <span className="text-xs text-muted-foreground">retorno</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Retrabalho:{" "}
            <strong className={metrics.retention.reworkRate > 5 ? "text-amber-500" : "text-foreground"}>
              {metrics.retention.reworkRate}%
            </strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
