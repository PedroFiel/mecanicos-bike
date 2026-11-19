import { Link, useFetcher } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import type { getDashboardData } from "~/services/dashboard.server";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type Reminder = DashboardData["clientsToCall"][number];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const fetcher = useFetcher<{ error: string | null }>();
  const busy = fetcher.state !== "idle";
  const contact = () => fetcher.submit(
    { reminderId: String(reminder.id), status: "CONTATADO" },
    { method: "post", action: "/dashboard" },
  );

  return (
    <TableRow>
      <TableCell>
        <Link className="font-medium hover:underline" to={`/clients/${reminder.clientId}`}>
          {reminder.clientName}
        </Link>
        <p className="text-sm text-muted-foreground">{reminder.bikeName}</p>
      </TableCell>
      <TableCell className="min-w-40 whitespace-normal">{reminder.service}</TableCell>
      <TableCell>
        <Badge variant={reminder.overdue ? "destructive" : "secondary"}
          className={!reminder.overdue && reminder.days !== null && reminder.days <= 7
            ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : undefined}
        >
          {reminder.urgency}
        </Badge>
        <p className="mt-1 text-sm text-muted-foreground">{reminder.criteria}</p>
      </TableCell>
      <TableCell>
        {reminder.status === "CONTATADO" ? (
          <>
            <Badge variant="outline">Contatado</Badge>
            {reminder.contactedAt && <p className="mt-1 text-sm text-muted-foreground">{date.format(reminder.contactedAt)}</p>}
          </>
        ) : "Em aberto"}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          {reminder.whatsappUrl ? (
            busy ? <Button size="sm" disabled>WhatsApp</Button> : (
              <Button size="sm" asChild>
                <a href={reminder.whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={contact}
                  aria-label={`Abrir WhatsApp de ${reminder.clientName} em nova aba`}>
                  WhatsApp
                </a>
              </Button>
            )
          ) : reminder.demoMessage ? (
            <details>
              <summary className="cursor-pointer text-sm font-medium underline underline-offset-4">Prévia do WhatsApp</summary>
              <p className="my-2 max-w-xs whitespace-normal text-sm text-muted-foreground">{reminder.demoMessage}</p>
              <Button size="sm" type="button" onClick={contact} disabled={busy}>Simular contato</Button>
            </details>
          ) : (
            <>
              <Button size="sm" disabled>WhatsApp</Button>
              <Link className="text-sm underline underline-offset-4" to={`/clients/${reminder.clientId}/edit`}>
                Cadastrar telefone
              </Link>
            </>
          )}
          <fetcher.Form method="post" action="/dashboard" className="flex gap-1">
            <input type="hidden" name="reminderId" value={reminder.id} />
            <Button size="sm" variant="outline" name="status" value="AGENDADO" disabled={busy}>Agendar</Button>
            <Button size="sm" variant="ghost" name="status" value="DISPENSADO" disabled={busy}>Dispensar</Button>
          </fetcher.Form>
        </div>
        {fetcher.data?.error && <p role="alert" className="mt-2 text-sm text-destructive">{fetcher.data.error}</p>}
      </TableCell>
    </TableRow>
  );
}

export function DashboardActions({
  clientsToCall, pendingPayments, stalledAppointments,
}: Pick<DashboardData, "clientsToCall" | "pendingPayments" | "stalledAppointments">) {
  const groups = [
    { title: "Pagamentos pendentes", entries: pendingPayments, empty: "Nenhum saldo pendente." },
    { title: "Atendimentos parados", entries: stalledAppointments, empty: "Nenhum atendimento em aberto há mais de 7 dias." },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Clientes para chamar</CardTitle>
        </CardHeader>
        <CardContent>
          {clientsToCall.length ? (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente e bike</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsToCall.map((reminder) => <ReminderRow key={reminder.id} reminder={reminder} />)}
                </TableBody>
              </Table>
            </div>
          ) : <p className="text-sm text-muted-foreground">Nenhuma revisão vencida ou prevista nos próximos 15 dias.</p>}
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {groups.map(({ title, entries, empty }) => (
          <Card key={title}>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
              {entries.length ? (
                <ul className="max-h-72 divide-y overflow-y-auto">
                  {entries.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap justify-between gap-2 py-3">
                      <div>
                        <Link className="text-sm font-medium hover:underline" to={`/appointments/${entry.id}`}>{entry.title}</Link>
                        <p className="text-sm text-muted-foreground">{entry.client.fullName}</p>
                      </div>
                      <div className="text-sm">
                        {"balance" in entry && typeof entry.balance === "number" && <span className="mr-2 font-medium">{money.format(entry.balance)}</span>}
                        <span className="text-muted-foreground">{entry.days === 0 ? "Hoje" : `${entry.days} dias`}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">{empty}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
