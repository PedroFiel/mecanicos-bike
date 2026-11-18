/**
 * dashboard.server.ts
 *
 * Consultas agregadas e métricas em tempo real para o Dashboard da Oficina.
 * Todas as consultas são estritamente isoladas por userId.
 */

import prisma from "../../prisma/prisma";
import { isReminderDue } from "./reminders.server";
import { DEFAULT_WHATSAPP_TEMPLATE } from "../lib/default-services";

export type PeriodFilter = "month" | "30days" | "90days" | "year";

export interface PeriodDates {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
}

/**
 * Calcula as janelas de datas para o período atual e o período anterior para comparação.
 */
export function getPeriodDates(period: PeriodFilter, referenceDate: Date = new Date()): PeriodDates {
  const currentEnd = new Date(referenceDate);
  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;
  let label = "Mês Atual";

  switch (period) {
    case "30days": {
      label = "Últimos 30 dias";
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() - 30);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 30);
      break;
    }
    case "90days": {
      label = "Últimos 90 dias";
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() - 90);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 90);
      break;
    }
    case "year": {
      label = "Ano Atual";
      currentStart = new Date(currentEnd.getFullYear(), 0, 1);
      previousEnd = new Date(currentEnd.getFullYear() - 1, currentEnd.getMonth(), currentEnd.getDate());
      previousStart = new Date(currentEnd.getFullYear() - 1, 0, 1);
      break;
    }
    case "month":
    default: {
      label = "Mês Atual";
      currentStart = new Date(currentEnd.getFullYear(), currentEnd.getMonth(), 1);
      // Fim do período anterior equivalente
      previousEnd = new Date(currentEnd.getFullYear(), currentEnd.getMonth() - 1, currentEnd.getDate());
      previousStart = new Date(currentEnd.getFullYear(), currentEnd.getMonth() - 1, 1);
      break;
    }
  }

  return { currentStart, currentEnd, previousStart, previousEnd, label };
}

/**
 * Calcula variação percentual segura entre dois valores.
 */
export function calculateVariation(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/**
 * Normaliza número de telefone brasileiro para formato internacional wa.me (55XXXXXXXXXXX).
 */
export function normalizePhoneForWhatsApp(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;

  // Se já tiver DDI do Brasil (55) e tiver 12 ou 13 dígitos
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // 10 dígitos (DDD + 8 dígitos) ou 11 dígitos (DDD + 9 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return null;
}

/**
 * Interpola variáveis no template de mensagem do WhatsApp.
 */
export function formatWhatsAppMessage(
  template: string,
  params: {
    clientName: string;
    bikeModel: string;
    serviceName: string;
    shopName?: string | null;
    serviceDate?: Date | string | null;
  }
): string {
  const shop = params.shopName?.trim() || "nossa oficina";
  let formattedDate = "";
  let formattedTimeAgo = "alguns meses";

  if (params.serviceDate) {
    const d = new Date(params.serviceDate);
    formattedDate = d.toLocaleDateString("pt-BR");
    const diffMonths = Math.max(
      1,
      Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.43))
    );
    formattedTimeAgo = diffMonths === 1 ? "1 mês" : `${diffMonths} meses`;
  }

  return template
    .replace(/{cliente}/g, params.clientName.trim())
    .replace(/{bike}/g, params.bikeModel.trim())
    .replace(/{servico}/g, params.serviceName.trim())
    .replace(/{oficina}/g, shop)
    .replace(/{data_ultimo}/g, formattedDate)
    .replace(/{tempo}/g, formattedTimeAgo);
}

/**
 * Obtém todos os dados do dashboard de forma consolidada e performática.
 */
export async function getDashboardData(userId: number, period: PeriodFilter = "month") {
  const dates = getPeriodDates(period);
  const now = new Date();

  // Dados do usuário (nome da oficina e template de WhatsApp)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { shopName: true, whatsappTemplate: true },
  });

  const whatsappTemplate = user?.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE;
  const shopName = user?.shopName || "Nossa Oficina";

  // 1. CARDS: Faturamento e Ticket Médio (Período Atual e Anterior)
  const currentAppointments = await prisma.appointment.findMany({
    where: {
      userId,
      serviceDate: { gte: dates.currentStart, lte: dates.currentEnd },
      status: { not: "CANCELADO" },
    },
    select: {
      id: true,
      totalCost: true,
      status: true,
      paymentStatus: true,
      amountPaid: true,
      linkType: true,
      clientId: true,
    },
  });

  const previousAppointments = await prisma.appointment.findMany({
    where: {
      userId,
      serviceDate: { gte: dates.previousStart, lte: dates.previousEnd },
      status: { not: "CANCELADO" },
    },
    select: {
      id: true,
      totalCost: true,
      status: true,
      paymentStatus: true,
      amountPaid: true,
    },
  });

  // Faturamento e ticket do período atual
  const currentCompleted = currentAppointments.filter((a) => a.status === "CONCLUIDO");
  const currentRevenue = currentCompleted.reduce((sum, a) => sum + (a.totalCost || 0), 0);
  const currentTicket = currentCompleted.length > 0 ? currentRevenue / currentCompleted.length : 0;

  // Faturamento e ticket do período anterior
  const previousCompleted = previousAppointments.filter((a) => a.status === "CONCLUIDO");
  const previousRevenue = previousCompleted.reduce((sum, a) => sum + (a.totalCost || 0), 0);
  const previousTicket = previousCompleted.length > 0 ? previousRevenue / previousCompleted.length : 0;

  const revenueVariation = calculateVariation(currentRevenue, previousRevenue);
  const ticketVariation = calculateVariation(currentTicket, previousTicket);

  // 2. CARDS: Total a Receber (geral da oficina pendente/parcial)
  const pendingPaymentsAppointments = await prisma.appointment.findMany({
    where: {
      userId,
      status: { not: "CANCELADO" },
      paymentStatus: { in: ["PENDENTE", "PARCIAL"] },
    },
    include: {
      client: { select: { id: true, fullName: true, phone: true } },
      bike: { select: { id: true, model: true, brand: true } },
    },
    orderBy: { serviceDate: "asc" },
  });

  const totalReceivable = pendingPaymentsAppointments.reduce((sum, a) => {
    const cost = a.totalCost || 0;
    const paid = a.amountPaid || 0;
    return sum + Math.max(0, cost - paid);
  }, 0);

  // 3. CARDS: Atendimentos em Aberto (status PENDENTE)
  const openAppointmentsCount = await prisma.appointment.count({
    where: {
      userId,
      status: "PENDENTE",
    },
  });

  // 4. CARDS: Lembretes de Revisão (Vencendo nos próximos 15 dias ou vencidos)
  const allActiveReminders = await prisma.maintenanceReminder.findMany({
    where: {
      userId,
      status: { in: ["ABERTO", "CONTATADO"] },
    },
    include: {
      client: { select: { id: true, fullName: true, phone: true } },
      bike: {
        select: {
          id: true,
          model: true,
          brand: true,
          currentOdometerKm: true,
          currentHours: true,
        },
      },
      appointment: { select: { id: true, title: true, serviceDate: true } },
    },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
  });

  // Filtra os que estão a vencer nos próximos 15 dias ou vencidos
  const dueReminders = allActiveReminders.filter((rem) =>
    isReminderDue(
      {
        dueDate: rem.dueDate,
        dueKm: rem.dueKm,
        dueHours: rem.dueHours,
        status: rem.status,
      },
      {
        currentOdometerKm: rem.bike.currentOdometerKm,
        currentHours: rem.bike.currentHours,
      },
      now,
      15
    )
  );

  const revisionsDueIn15DaysCount = dueReminders.length;

  // 5. CARDS: Taxa de Retorno e Retrabalho
  // Total de clientes com atendimentos na oficina
  const clientAppointmentCounts = await prisma.appointment.groupBy({
    by: ["clientId"],
    where: { userId, status: { not: "CANCELADO" } },
    _count: { id: true },
  });
  const returningClientsCount = clientAppointmentCounts.filter((c) => c._count.id > 1).length;
  const totalClientsWithAppointments = clientAppointmentCounts.length;
  const customerRetentionRate =
    totalClientsWithAppointments > 0
      ? Number(((returningClientsCount / totalClientsWithAppointments) * 100).toFixed(1))
      : 0;

  // Taxa de retrabalho no período selecionado
  const reworkCount = currentAppointments.filter(
    (a) => a.linkType === "RETORNO_GARANTIA" || a.linkType === "RETRABALHO"
  ).length;
  const reworkRate =
    currentAppointments.length > 0
      ? Number(((reworkCount / currentAppointments.length) * 100).toFixed(1))
      : 0;

  // ========================================================
  // GRÁFICOS
  // ========================================================

  // Gráfico 1: Faturamento por mês (últimos 12 meses, mão de obra x peças)
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const appointmentsLast12Months = await prisma.appointment.findMany({
    where: {
      userId,
      serviceDate: { gte: twelveMonthsAgo },
      status: "CONCLUIDO",
    },
    include: {
      items: true,
    },
    orderBy: { serviceDate: "asc" },
  });

  // Cria estrutura para os 12 meses
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const revenueByMonthMap = new Map<string, { month: string; labor: number; parts: number; total: number }>();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
    revenueByMonthMap.set(key, { month: label, labor: 0, parts: 0, total: 0 });
  }

  for (const app of appointmentsLast12Months) {
    const d = new Date(app.serviceDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = revenueByMonthMap.get(key);
    if (!entry) continue;

    if (app.items && app.items.length > 0) {
      for (const item of app.items) {
        entry.labor += Number(item.laborCost) || 0;
        entry.parts += Number(item.partsCost) || 0;
      }
    } else if (app.totalCost) {
      entry.labor += app.totalCost;
    }
    entry.total = entry.labor + entry.parts;
  }

  const revenueByMonth = Array.from(revenueByMonthMap.values());

  // Gráfico 2: Serviços mais realizados (Top 8)
  const allItems = await prisma.appointmentItem.findMany({
    where: {
      appointment: { userId, status: "CONCLUIDO" },
    },
    select: {
      description: true,
      laborCost: true,
      partsCost: true,
    },
  });

  const servicesMap = new Map<string, { name: string; count: number; total: number }>();
  for (const it of allItems) {
    const name = it.description.trim();
    const existing = servicesMap.get(name) || { name, count: 0, total: 0 };
    existing.count += 1;
    existing.total += (Number(it.laborCost) || 0) + (Number(it.partsCost) || 0);
    servicesMap.set(name, existing);
  }

  const topServices = Array.from(servicesMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Gráfico 3: Atendimentos por dia da semana
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const appointmentsByWeekday = [
    { day: "Seg", fullDay: "Segunda-feira", count: 0 },
    { day: "Ter", fullDay: "Terça-feira", count: 0 },
    { day: "Qua", fullDay: "Quarta-feira", count: 0 },
    { day: "Qui", fullDay: "Quinta-feira", count: 0 },
    { day: "Sex", fullDay: "Sexta-feira", count: 0 },
    { day: "Sáb", fullDay: "Sábado", count: 0 },
    { day: "Dom", fullDay: "Domingo", count: 0 },
  ];

  const weekdayIndexMap: Record<number, number> = {
    1: 0, // Seg
    2: 1, // Ter
    3: 2, // Qua
    4: 3, // Qui
    5: 4, // Sex
    6: 5, // Sáb
    0: 6, // Dom
  };

  for (const app of appointmentsLast12Months) {
    const dayOfWeek = new Date(app.serviceDate).getDay();
    const targetIdx = weekdayIndexMap[dayOfWeek];
    if (targetIdx !== undefined) {
      appointmentsByWeekday[targetIdx].count += 1;
    }
  }

  // Gráfico 4: Marcas de bike atendidas (Top 8)
  const bikesWithAppointments = await prisma.appointment.findMany({
    where: { userId, status: "CONCLUIDO" },
    select: { bike: { select: { brand: true } } },
  });

  const brandsMap = new Map<string, number>();
  for (const b of bikesWithAppointments) {
    const brand = b.bike.brand.trim() || "Outras";
    brandsMap.set(brand, (brandsMap.get(brand) || 0) + 1);
  }

  const topBrands = Array.from(brandsMap.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Gráfico 5: Status de pagamento
  const paymentStatusCounts = await prisma.appointment.groupBy({
    by: ["paymentStatus"],
    where: { userId, status: { not: "CANCELADO" } },
    _count: { id: true },
    _sum: { totalCost: true },
  });

  const paymentStatusMap: Record<string, { label: string; count: number; total: number; color: string }> = {
    PAGO: { label: "Pago", count: 0, total: 0, color: "var(--chart-2, #10b981)" },
    PARCIAL: { label: "Parcial", count: 0, total: 0, color: "var(--chart-4, #f59e0b)" },
    PENDENTE: { label: "Pendente", count: 0, total: 0, color: "var(--chart-1, #ef4444)" },
  };

  for (const row of paymentStatusCounts) {
    if (paymentStatusMap[row.paymentStatus]) {
      paymentStatusMap[row.paymentStatus].count = row._count.id;
      paymentStatusMap[row.paymentStatus].total = row._sum.totalCost || 0;
    }
  }

  const paymentStatusDistribution = Object.values(paymentStatusMap);

  // ========================================================
  // LISTAS DE AÇÃO
  // ========================================================

  // 1. Clientes para Chamar (ordenados pelo mais urgente)
  const clientsToCall = dueReminders.map((rem) => {
    const normalizedPhone = normalizePhoneForWhatsApp(rem.client.phone);
    const hasValidPhone = normalizedPhone !== null;

    // Critério e detalhes de urgência
    let criteria: "DATA" | "KM" | "HORAS" = "DATA";
    let urgencyLabel = "";
    let isOverdue = false;
    let daysDiff: number | null = null;

    if (rem.dueDate) {
      const diffMs = new Date(rem.dueDate).getTime() - now.getTime();
      daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (daysDiff < 0) {
        isOverdue = true;
        urgencyLabel = `Vencido há ${Math.abs(daysDiff)} dia(s)`;
      } else if (daysDiff === 0) {
        isOverdue = true;
        urgencyLabel = "Vence hoje";
      } else {
        urgencyLabel = `Vence em ${daysDiff} dia(s)`;
      }
    }

    if (
      rem.dueKm != null &&
      rem.bike.currentOdometerKm != null &&
      rem.bike.currentOdometerKm >= rem.dueKm
    ) {
      criteria = "KM";
      isOverdue = true;
      const kmExceeded = rem.bike.currentOdometerKm - rem.dueKm;
      urgencyLabel = `Km atingido (+${kmExceeded} km)`;
    } else if (
      rem.dueHours != null &&
      rem.bike.currentHours != null &&
      rem.bike.currentHours >= rem.dueHours
    ) {
      criteria = "HORAS";
      isOverdue = true;
      const hoursExceeded = rem.bike.currentHours - rem.dueHours;
      urgencyLabel = `Horímetro atingido (+${hoursExceeded} h)`;
    }

    // Mensagem formatada para o WhatsApp
    const rawMessage = formatWhatsAppMessage(whatsappTemplate, {
      clientName: rem.client.fullName,
      bikeModel: `${rem.bike.brand} ${rem.bike.model}`,
      serviceName: rem.title,
      shopName,
      serviceDate: rem.appointment.serviceDate,
    });

    const whatsappUrl = hasValidPhone
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(rawMessage)}`
      : null;

    return {
      reminderId: rem.id,
      status: rem.status,
      title: rem.title,
      criteria,
      urgencyLabel,
      isOverdue,
      daysDiff: daysDiff ?? 999,
      client: {
        id: rem.client.id,
        fullName: rem.client.fullName,
        phone: rem.client.phone,
        normalizedPhone,
        hasValidPhone,
      },
      bike: {
        id: rem.bike.id,
        brand: rem.bike.brand,
        model: rem.bike.model,
      },
      whatsappUrl,
      whatsappMessage: rawMessage,
    };
  });

  // Ordena lista de clientes para chamar: vencidos primeiro (menor daysDiff), depois próximos
  clientsToCall.sort((a, b) => a.daysDiff - b.daysDiff);

  // 2. Pagamentos Pendentes
  const pendingPaymentsList = pendingPaymentsAppointments.map((app) => {
    const total = app.totalCost || 0;
    const paid = app.amountPaid || 0;
    const balance = Math.max(0, total - paid);
    const serviceDate = new Date(app.serviceDate);
    const daysPending = Math.max(
      0,
      Math.floor((now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      appointmentId: app.id,
      title: app.title,
      client: app.client,
      bike: app.bike,
      paymentStatus: app.paymentStatus,
      totalCost: total,
      amountPaid: paid,
      balance,
      daysPending,
      serviceDate: app.serviceDate,
    };
  });

  // Ordena por dias pendentes (mais antigos primeiro)
  pendingPaymentsList.sort((a, b) => b.daysPending - a.daysPending);

  // 3. Atendimentos Parados (> 7 dias em aberto)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const staleAppointments = await prisma.appointment.findMany({
    where: {
      userId,
      status: "PENDENTE",
      serviceDate: { lte: sevenDaysAgo },
    },
    include: {
      client: { select: { id: true, fullName: true, phone: true } },
      bike: { select: { id: true, model: true, brand: true } },
    },
    orderBy: { serviceDate: "asc" },
  });

  const staleAppointmentsList = staleAppointments.map((app) => {
    const serviceDate = new Date(app.serviceDate);
    const daysStale = Math.floor((now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      appointmentId: app.id,
      title: app.title,
      client: app.client,
      bike: app.bike,
      serviceDate: app.serviceDate,
      daysStale,
      totalCost: app.totalCost,
    };
  });

  return {
    period,
    dates,
    metrics: {
      revenue: {
        value: currentRevenue,
        variation: revenueVariation,
      },
      ticket: {
        value: currentTicket,
        variation: ticketVariation,
      },
      receivable: {
        value: totalReceivable,
        count: pendingPaymentsAppointments.length,
      },
      openAppointments: {
        value: openAppointmentsCount,
      },
      revisionsDue: {
        value: revisionsDueIn15DaysCount,
      },
      retention: {
        customerRetentionRate,
        reworkRate,
      },
    },
    charts: {
      revenueByMonth,
      topServices,
      appointmentsByWeekday,
      topBrands,
      paymentStatusDistribution,
    },
    actionLists: {
      clientsToCall,
      pendingPayments: pendingPaymentsList,
      staleAppointments: staleAppointmentsList,
    },
  };
}
