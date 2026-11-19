import prisma from "../../prisma/prisma";
import { DEFAULT_WHATSAPP_TEMPLATE } from "../lib/default-services";
import { buildWhatsAppLink, renderTemplate } from "../lib/whatsapp";
import { listDueReminders } from "./reminders.server";

export type PeriodFilter = "mes" | "trimestre" | "ano";

const DAY_MS = 86_400_000;
const calendar = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
});
const shortDate = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
const weekdayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function calendarDay(date: Date) {
  return new Date(`${calendar.format(date)}T00:00:00Z`);
}

// Brasília is UTC−3 for the periods reported by this dashboard.
function startOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1, 3));
}

export function getPeriodDates(period: PeriodFilter, now: Date) {
  const today = calendarDay(now);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const monthStart = startOfMonth(year, month);
  if (period === "trimestre") {
    const start = new Date(now.getTime() - 90 * DAY_MS);
    return { start, previousStart: new Date(start.getTime() - 90 * DAY_MS), previousEnd: start };
  }

  const start = period === "ano" ? startOfMonth(year, 0) : monthStart;
  const previousStart = period === "ano" ? startOfMonth(year - 1, 0) : startOfMonth(year, month - 1);
  const previousEnd = new Date(Math.min(start.getTime(), previousStart.getTime() + now.getTime() - start.getTime()));
  return { start, previousStart, previousEnd };
}

function variation(current: number, previous: number) {
  return previous === 0 ? (current === 0 ? 0 : null) : Math.round((current / previous - 1) * 1000) / 10;
}

function rate(part: number, total: number) {
  return total ? Math.round(part / total * 1000) / 10 : 0;
}

function topEight(labels: string[]) {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return Array.from(counts, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, 8);
}

export async function getDashboardData(userId: number, period: PeriodFilter, now = new Date()) {
  const today = calendarDay(now);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const { start, previousStart, previousEnd } = getPeriodDates(period, now);
  const chartStart = startOfMonth(year, month - 11);
  const historyStart = new Date(Math.min(chartStart.getTime(), previousStart.getTime()));
  const cutoff = new Date(now.getTime() - 7 * DAY_MS);

  const [user, history, paymentQueue, openAppointments, reminders] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { shopName: true, whatsappTemplate: true, isDemo: true } }),
    prisma.appointment.findMany({
      where: { userId, serviceDate: { gte: historyStart, lt: now }, status: { not: "CANCELADO" } },
      select: {
        serviceDate: true, status: true, totalCost: true, amountPaid: true, paymentStatus: true,
        linkType: true, clientId: true, bike: { select: { brand: true } },
        items: { select: { description: true, laborCost: true, partsCost: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { userId, status: { not: "CANCELADO" }, paymentStatus: { in: ["PENDENTE", "PARCIAL"] } },
      select: { id: true, title: true, totalCost: true, amountPaid: true, serviceDate: true, client: { select: { fullName: true } } },
      orderBy: [{ serviceDate: "asc" }, { id: "asc" }],
    }),
    prisma.appointment.findMany({
      where: { userId, status: "PENDENTE" },
      select: { id: true, title: true, serviceDate: true, client: { select: { fullName: true } } },
      orderBy: [{ serviceDate: "asc" }, { id: "asc" }],
    }),
    listDueReminders(userId, { withinDays: 15, today: now }),
  ]);

  const current = history.filter((entry) => entry.serviceDate >= start);
  const previous = history.filter((entry) => entry.serviceDate >= previousStart && entry.serviceDate < previousEnd);
  function summarize(entries: typeof history) {
    const completed = entries.filter((entry) => entry.status === "CONCLUIDO");
    const revenue = completed.reduce((total, entry) => total + (entry.totalCost ?? 0), 0);
    const visits = new Map<number, number>();
    for (const entry of entries) visits.set(entry.clientId, (visits.get(entry.clientId) ?? 0) + 1);
    return {
      revenue,
      ticket: completed.length ? revenue / completed.length : 0,
      retention: rate(Array.from(visits.values()).filter((count) => count > 1).length, visits.size),
      rework: rate(entries.filter((entry) => entry.linkType === "GARANTIA").length, entries.length),
    };
  }
  const summary = summarize(current);
  const prior = summarize(previous);
  const daysSince = (date: Date) => Math.max(0, (today.getTime() - calendarDay(date).getTime()) / DAY_MS);
  const pendingPayments = paymentQueue
    .map(({ totalCost, amountPaid, ...entry }) => ({
      ...entry, balance: Math.max(0, (totalCost ?? 0) - amountPaid), days: daysSince(entry.serviceDate),
    }))
    .filter(({ balance }) => balance > 0);
  const stalledAppointments = openAppointments.filter(({ serviceDate }) => serviceDate < cutoff)
    .map((entry) => ({ ...entry, days: daysSince(entry.serviceDate) }));

  const revenueByMonth = Array.from({ length: 12 }, (_, index) => {
    const date = startOfMonth(year, month - 11 + index);
    const label = new Intl.DateTimeFormat("pt-BR", {
      month: "short", year: "2-digit", timeZone: "America/Sao_Paulo",
    }).format(date);
    return { month: label, labor: 0, parts: 0 };
  });
  for (const entry of history) {
    if (entry.status !== "CONCLUIDO" || entry.serviceDate < chartStart) continue;
    const date = calendarDay(entry.serviceDate);
    const index = 11 - ((year - date.getUTCFullYear()) * 12 + month - date.getUTCMonth());
    const bucket = revenueByMonth[index];
    if (!bucket) continue;
    bucket.labor += entry.items.length
      ? entry.items.reduce((total, item) => total + item.laborCost, 0)
      : entry.totalCost ?? 0;
    bucket.parts += entry.items.reduce((total, item) => total + item.partsCost, 0);
  }

  const weekday = weekdayNames.map((name) => ({ name, count: 0 }));
  for (const entry of current) weekday[(calendarDay(entry.serviceDate).getUTCDay() + 6) % 7].count++;
  const completed = current.filter((entry) => entry.status === "CONCLUIDO");
  const payment = { received: 0, partialBalance: 0, pendingBalance: 0 };
  for (const entry of current) {
    const cost = Math.max(0, entry.totalCost ?? 0);
    const paid = Math.min(cost, Math.max(0, entry.amountPaid));
    payment.received += paid;
    if (entry.paymentStatus === "PARCIAL") payment.partialBalance += cost - paid;
    if (entry.paymentStatus === "PENDENTE") payment.pendingBalance += cost - paid;
  }

  const clientsToCall = reminders.map((reminder) => {
    const { bike, dueDate, dueKm, dueHours } = reminder;
    const days = dueDate ? (calendarDay(dueDate).getTime() - today.getTime()) / DAY_MS : null;
    const kmReached = dueKm != null && bike.currentOdometerKm != null && bike.currentOdometerKm >= dueKm;
    const hoursReached = dueHours != null && bike.currentHours != null && bike.currentHours >= dueHours;
    const criteria = [
      kmReached ? `${dueKm!.toLocaleString("pt-BR")} km` : "",
      hoursReached ? `${dueHours!.toLocaleString("pt-BR")} h` : "",
      dueDate && (days === null || days <= 15) ? shortDate.format(dueDate) : "",
    ].filter(Boolean);
    const overdue = kmReached || hoursReached || (days !== null && days < 0);
    const urgency = overdue ? "Vencido" : days === 0 ? "Vence hoje" : `Vence em ${days} dias`;
    const bikeName = [bike.brand, bike.model].filter(Boolean).join(" ");
    const service = reminder.serviceTemplate.name;
    const serviceDate = reminder.appointmentItem.appointment.serviceDate;
    const message = renderTemplate(user?.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE, {
      cliente: bike.client.fullName, bike: bikeName, servico: service,
      oficina: user?.shopName || "nossa oficina", data_ultimo: shortDate.format(serviceDate),
      tempo: `${Math.max(1, Math.round(daysSince(serviceDate) / 30))} mês(es)`,
    });
    return {
      id: reminder.id, status: reminder.status, contactedAt: reminder.contactedAt,
      clientId: bike.client.id, clientName: bike.client.fullName, bikeName, service,
      criteria: criteria.join(" · "), urgency, overdue, days,
      whatsappUrl: user?.isDemo ? null : buildWhatsAppLink(bike.client.phone, message),
      demoMessage: user?.isDemo && buildWhatsAppLink(bike.client.phone, message) ? message : null,
    };
  }).sort((a, b) => Number(b.overdue) - Number(a.overdue)
    || (a.days ?? 0) - (b.days ?? 0) || a.id - b.id);

  return {
    metrics: {
      revenue: { value: summary.revenue, variation: variation(summary.revenue, prior.revenue) },
      ticket: { value: summary.ticket, variation: variation(summary.ticket, prior.ticket) },
      receivable: { value: pendingPayments.reduce((total, entry) => total + entry.balance, 0), count: pendingPayments.length },
      openAppointments: { value: openAppointments.length },
      revisionsDue: { value: reminders.length },
      retention: {
        customerRetentionRate: summary.retention,
        reworkRate: summary.rework,
        retentionChange: Math.round((summary.retention - prior.retention) * 10) / 10,
        reworkChange: Math.round((summary.rework - prior.rework) * 10) / 10,
      },
    },
    charts: {
      revenueByMonth, weekday, payment,
      topServices: topEight(completed.flatMap((entry) => entry.items.map((item) => item.description.trim()))),
      topBrands: topEight(current.map((entry) => entry.bike.brand?.trim() || "Sem marca")),
    },
    clientsToCall, pendingPayments, stalledAppointments,
  };
}
