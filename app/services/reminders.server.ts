/**
 * reminders.server.ts
 *
 * Gerenciamento e cálculo de lembretes de revisão periódica de bikes.
 */

import prisma from "../../prisma/prisma";

export interface ComputeDueParams {
  serviceDate: Date;
  odometerKm?: number | null;
  usageHours?: number | null;
  intervalMonths?: number | null;
  intervalKm?: number | null;
  intervalHours?: number | null;
}

export interface ComputedDueResult {
  dueDate: Date | null;
  dueKm: number | null;
  dueHours: number | null;
  hasReminder: boolean;
}

/**
 * Calcula os prazos de vencimento da revisão por data, km e horas de uso.
 */
export function computeDue({
  serviceDate,
  odometerKm,
  usageHours,
  intervalMonths,
  intervalKm,
  intervalHours,
}: ComputeDueParams): ComputedDueResult {
  let dueDate: Date | null = null;
  if (intervalMonths && intervalMonths > 0) {
    dueDate = new Date(serviceDate);
    dueDate.setMonth(dueDate.getMonth() + intervalMonths);
  }

  let dueKm: number | null = null;
  if (intervalKm && intervalKm > 0 && odometerKm != null) {
    dueKm = odometerKm + intervalKm;
  }

  let dueHours: number | null = null;
  if (intervalHours && intervalHours > 0 && usageHours != null) {
    dueHours = usageHours + intervalHours;
  }

  const hasReminder = dueDate !== null || dueKm !== null || dueHours !== null;

  return { dueDate, dueKm, dueHours, hasReminder };
}

/**
 * Função pura e testável para verificar se um lembrete está vencido ou a vencer
 * dentro de uma janela de dias (default: 15 dias).
 */
export function isReminderDue(
  reminder: {
    dueDate?: Date | string | null;
    dueKm?: number | null;
    dueHours?: number | null;
    status: string;
  },
  bike?: {
    currentOdometerKm?: number | null;
    currentHours?: number | null;
  } | null,
  today: Date = new Date(),
  withinDays: number = 15
): boolean {
  if (reminder.status !== "ABERTO" && reminder.status !== "CONTATADO") {
    return false;
  }

  // 1. Critério por Data
  if (reminder.dueDate) {
    const dueDate = new Date(reminder.dueDate);
    const windowLimit = new Date(today);
    windowLimit.setDate(windowLimit.getDate() + withinDays);

    if (dueDate <= windowLimit) {
      return true;
    }
  }

  // 2. Critério por Quilometragem
  if (
    reminder.dueKm != null &&
    bike?.currentOdometerKm != null &&
    bike.currentOdometerKm >= reminder.dueKm
  ) {
    return true;
  }

  // 3. Critério por Horas de Uso
  if (
    reminder.dueHours != null &&
    bike?.currentHours != null &&
    bike.currentHours >= reminder.dueHours
  ) {
    return true;
  }

  return false;
}

/**
 * Sincroniza lembretes para um atendimento:
 * - Cria um MaintenanceReminder para cada item que possui intervalo
 * - Fecha como CONCLUIDO lembretes anteriores ainda abertos do mesmo serviço na mesma bike
 */
export async function syncRemindersForAppointment(
  tx: any,
  appointment: {
    id: number;
    userId: number;
    bikeId: number;
    serviceDate: Date;
    odometerKm?: number | null;
    usageHours?: number | null;
  },
  items: Array<{
    id: number;
    serviceTemplateId?: number | null;
  }>
) {
  for (const item of items) {
    if (!item.serviceTemplateId) continue;

    const template = await tx.serviceTemplate.findUnique({
      where: { id: item.serviceTemplateId },
    });

    if (!template) continue;

    const { dueDate, dueKm, dueHours, hasReminder } = computeDue({
      serviceDate: appointment.serviceDate,
      odometerKm: appointment.odometerKm,
      usageHours: appointment.usageHours,
      intervalMonths: template.intervalMonths,
      intervalKm: template.intervalKm,
      intervalHours: template.intervalHours,
    });

    if (!hasReminder) continue;

    // Fecha lembretes anteriores em aberto para o mesmo serviço na mesma bike
    await tx.maintenanceReminder.updateMany({
      where: {
        userId: appointment.userId,
        bikeId: appointment.bikeId,
        serviceTemplateId: template.id,
        status: { in: ["ABERTO", "CONTATADO", "AGENDADO"] },
        NOT: { appointmentItemId: item.id },
      },
      data: { status: "CONCLUIDO" },
    });

    // Cria ou atualiza o lembrete vinculado a este item
    await tx.maintenanceReminder.upsert({
      where: { appointmentItemId: item.id },
      create: {
        userId: appointment.userId,
        bikeId: appointment.bikeId,
        appointmentItemId: item.id,
        serviceTemplateId: template.id,
        dueDate,
        dueKm,
        dueHours,
        status: "ABERTO",
      },
      update: {
        dueDate,
        dueKm,
        dueHours,
      },
    });
  }
}

/**
 * Lista todos os lembretes que estão vencidos ou próximos de vencer (dentro de N dias).
 */
export async function listDueReminders(
  userId: number,
  options: { withinDays?: number } = {}
) {
  const withinDays = options.withinDays ?? 15;
  const today = new Date();
  const futureLimit = new Date();
  futureLimit.setDate(today.getDate() + withinDays);

  const reminders = await prisma.maintenanceReminder.findMany({
    where: {
      userId,
      status: { in: ["ABERTO", "CONTATADO"] },
    },
    include: {
      bike: {
        include: {
          client: true,
        },
      },
      serviceTemplate: true,
      appointmentItem: {
        include: {
          appointment: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  // Filtra por isReminderDue
  return reminders.filter((rem) =>
    isReminderDue(rem, rem.bike, today, withinDays)
  );
}

/**
 * Atualiza o status de um lembrete (ABERTO, CONTATADO, AGENDADO, CONCLUIDO, DISPENSADO)
 */
export async function updateReminderStatus(
  id: number,
  userId: number,
  status: "ABERTO" | "CONTATADO" | "AGENDADO" | "CONCLUIDO" | "DISPENSADO",
  contactedAt?: Date | null
) {
  const reminder = await prisma.maintenanceReminder.findFirst({
    where: { id, userId },
  });

  if (!reminder) return null;

  return prisma.maintenanceReminder.update({
    where: { id },
    data: {
      status,
      ...(status === "CONTATADO" && { contactedAt: contactedAt ?? new Date() }),
    },
  });
}
