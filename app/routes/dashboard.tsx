import { data, Link } from "react-router";
import { z } from "zod";
import { DashboardActions } from "~/features/dashboard/components/dashboard-actions";
import { DashboardCharts } from "~/features/dashboard/components/dashboard-charts";
import { DashboardMetrics } from "~/features/dashboard/components/dashboard-metrics";
import { requireAuth } from "~/lib/auth.server";
import { getDashboardData } from "~/services/dashboard.server";
import { updateReminderStatus } from "~/services/reminders.server";
import type { RouteHandle } from "~/types/route";
import type { Route } from "./+types/dashboard";

export const handle: RouteHandle = { title: "Dashboard" };

const periods = {
  mes: "Mês atual",
  trimestre: "Últimos 90 dias",
  ano: "Ano atual",
} as const;

const periodSchema = z.enum(["mes", "trimestre", "ano"]);
const statusSchema = z.object({
  reminderId: z.coerce.number().int().positive(),
  status: z.enum(["CONTATADO", "AGENDADO", "DISPENSADO"]),
});

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireAuth(request);
  const period = periodSchema.catch("mes").parse(new URL(request.url).searchParams.get("periodo"));
  return { period, ...await getDashboardData(userId, period) };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireAuth(request);
  if (request.method !== "POST") return data({ error: "Método não permitido." }, { status: 405 });
  if (request.headers.get("Sec-Fetch-Site") === "cross-site") {
    return data({ error: "Origem da requisição inválida." }, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  const result = statusSchema.safeParse({
    reminderId: form?.get("reminderId"), status: form?.get("status"),
  });
  if (!result.success) return data({ error: "Dados do lembrete inválidos." }, { status: 400 });

  const updated = await updateReminderStatus(result.data.reminderId, userId, result.data.status);
  if (!updated) return data({ error: "Lembrete indisponível ou já atualizado." }, { status: 404 });
  return { error: null };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return (
    <main className="flex min-w-0 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Visão da oficina</h1>
        <nav aria-label="Período do dashboard" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {Object.entries(periods).map(([value, label]) => (
            <Link
              key={value}
              to={`?periodo=${value}`}
              preventScrollReset
              aria-current={loaderData.period === value ? "true" : undefined}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground aria-current:bg-background aria-current:text-foreground aria-current:shadow-sm"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <DashboardMetrics metrics={loaderData.metrics} />
      <DashboardActions
        clientsToCall={loaderData.clientsToCall}
        pendingPayments={loaderData.pendingPayments}
        stalledAppointments={loaderData.stalledAppointments}
      />
      <DashboardCharts charts={loaderData.charts} />
    </main>
  );
}
