import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { getDashboardData } from "~/services/dashboard.server";

type Charts = Awaited<ReturnType<typeof getDashboardData>>["charts"];
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const axis = { fontSize: 12, fill: "var(--muted-foreground)" };
const tooltip = { background: "var(--popover)", color: "var(--popover-foreground)", borderColor: "var(--border)", borderRadius: 8 };

function EmptyChart() {
  return <p className="text-sm text-muted-foreground">Ainda não há atendimentos para este gráfico.</p>;
}

function CountChart({ title, rows, horizontal = false }: {
  title: string; rows: { name: string; count: number }[]; horizontal?: boolean;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.some(({ count }) => count > 0) ? (
          <ResponsiveContainer width="100%" height={horizontal ? Math.max(160, rows.length * 34) : 220}>
            <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} accessibilityLayer>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              {/* Recharts 2 só reconhece eixos como filhos diretos (não dentro de Fragment) */}
              {horizontal
                ? <XAxis type="number" allowDecimals={false} tick={axis} />
                : <XAxis dataKey="name" tick={axis} />}
              {horizontal
                ? (
                  <YAxis type="category" dataKey="name" width={130} interval={0} tick={axis}
                    tickFormatter={(name: string) => name.length > 20 ? `${name.slice(0, 19)}…` : name}
                  />
                )
                : <YAxis width={35} allowDecimals={false} tick={axis} />}
              <Tooltip contentStyle={tooltip} labelStyle={axis} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
              <Bar dataKey="count" name="Quantidade" fill="var(--chart-1)" maxBarSize={32} radius={3} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({ charts }: { charts: Charts }) {
  const payments = [
    { label: "Recebido", value: charts.payment.received, color: "var(--chart-2)" },
    { label: "Saldo parcial", value: charts.payment.partialBalance, color: "var(--chart-4)" },
    { label: "Pendente", value: charts.payment.pendingBalance, color: "var(--chart-1)" },
  ];
  const total = payments.reduce((sum, payment) => sum + payment.value, 0);
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader><CardTitle>Faturamento nos últimos 12 meses</CardTitle></CardHeader>
        <CardContent>
          {charts.revenueByMonth.some(({ labor, parts }) => labor + parts > 0) ? (
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={charts.revenueByMonth} accessibilityLayer>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={axis} minTickGap={18} />
                <YAxis width={65} tick={axis} tickFormatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`} />
                <Tooltip contentStyle={tooltip} labelStyle={axis} formatter={(value: number) => currency.format(value)} />
                <Legend />
                <Bar dataKey="labor" name="Mão de obra" stackId="revenue" fill="var(--chart-1)" />
                <Bar dataKey="parts" name="Peças" stackId="revenue" fill="var(--chart-2)" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </CardContent>
      </Card>
      <CountChart title="Serviços mais realizados" rows={charts.topServices} horizontal />
      <CountChart title="Marcas atendidas" rows={charts.topBrands} horizontal />
      <CountChart title="Atendimentos por dia da semana" rows={charts.weekday} />
      <Card>
        <CardHeader><CardTitle>Status dos pagamentos</CardTitle></CardHeader>
        <CardContent>
          {total > 0 ? (
            <>
              <div aria-hidden="true" className="mb-4 flex h-4 overflow-hidden rounded-full bg-muted">
                {payments.map(({ label, value, color }) => (
                  <span key={label} style={{ width: `${value / total * 100}%`, backgroundColor: color }} />
                ))}
              </div>
              <ul className="space-y-3 text-sm">
                {payments.map(({ label, value, color }) => (
                  <li key={label} className="flex justify-between gap-2">
                    <span><span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>
                    <span className="font-medium tabular-nums">{currency.format(value)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <EmptyChart />}
        </CardContent>
      </Card>
    </div>
  );
}
