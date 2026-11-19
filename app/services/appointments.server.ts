/**
 * appointments.server.ts
 *
 * Lógica de negócio para agendamentos e atendimentos:
 * - Múltiplos itens (serviços padrão e avulsos) com cálculo do total no servidor
 * - Controle de telemetria da bike (odômetro e horas)
 * - Controle de status de pagamento (Pendente, Parcial, Pago)
 * - Vínculo com atendimentos anteriores (continuação ou garantia)
 * - Sincronização automática de lembretes de revisão
 */

import prisma from "../../prisma/prisma";
import type { Prisma } from "../generated/prisma/client";
import { syncRemindersForAppointment } from "./reminders.server";

export type AppointmentStatus = "PENDENTE" | "CONCLUIDO" | "CANCELADO";
export type PaymentStatus = "PENDENTE" | "PARCIAL" | "PAGO";
export type PaymentMethod = "PIX" | "DINHEIRO" | "DEBITO" | "CREDITO";
export type AppointmentLinkType = "CONTINUACAO" | "GARANTIA";

export interface AppointmentItemInput {
  id?: number;
  serviceTemplateId?: number | null;
  description: string;
  laborCost: number;
  partsDescription?: string | null;
  partsCost: number;
}

export interface CreateAppointmentInput {
  clientId: number;
  bikeId: number;
  title: string;
  description?: string | null;
  serviceDate: string | Date;
  status?: AppointmentStatus;

  // Telemetria
  odometerKm?: number | null;
  usageHours?: number | null;

  // Pagamento
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
  paymentMethod?: PaymentMethod | null;
  paidAt?: string | Date | null;

  // Vínculo
  parentAppointmentId?: number | null;
  linkType?: AppointmentLinkType | null;

  // Itens
  items: AppointmentItemInput[];
}

export interface UpdateAppointmentInput {
  title?: string;
  description?: string | null;
  serviceDate?: string | Date;
  status?: AppointmentStatus;
  bikeId?: number;

  // Telemetria
  odometerKm?: number | null;
  usageHours?: number | null;

  // Pagamento
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
  paymentMethod?: PaymentMethod | null;
  paidAt?: string | Date | null;

  // Vínculo
  parentAppointmentId?: number | null;
  linkType?: AppointmentLinkType | null;

  // Itens
  items?: AppointmentItemInput[];
}

/**
 * Lista atendimentos da oficina com filtros.
 */
export async function listAppointments(
  userId: number,
  filters: {
    clientId?: number;
    bikeId?: number;
    status?: AppointmentStatus;
    paymentStatus?: PaymentStatus;
  } = {}
) {
  return prisma.appointment.findMany({
    where: {
      userId,
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.bikeId && { bikeId: filters.bikeId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
    },
    include: {
      client: { select: { id: true, fullName: true, phone: true } },
      bike: { select: { id: true, model: true, brand: true, type: true } },
      items: true,
      parent: { select: { id: true, title: true, serviceDate: true } },
    },
    orderBy: { serviceDate: "desc" },
  });
}

/**
 * Retorna dados completos de um atendimento, incluindo itens, cadeia e lembretes gerados.
 */
export async function getAppointmentById(id: number, userId: number) {
  return prisma.appointment.findFirst({
    where: { id, userId },
    include: {
      client: {
        include: {
          bikes: {
            select: {
              id: true,
              model: true,
              brand: true,
              currentOdometerKm: true,
              currentHours: true,
            },
          },
        },
      },
      bike: true,
      items: {
        include: {
          serviceTemplate: true,
          reminder: true,
        },
      },
      parent: {
        select: {
          id: true,
          title: true,
          serviceDate: true,
          status: true,
          totalCost: true,
          linkType: true,
        },
      },
      children: {
        select: {
          id: true,
          title: true,
          serviceDate: true,
          status: true,
          totalCost: true,
          linkType: true,
        },
        orderBy: { serviceDate: "asc" },
      },
    },
  });
}

/**
 * Lista atendimentos anteriores da mesma bike para popular o select de "Continuação de".
 */
export async function listPreviousAppointmentsForBike(
  bikeId: number,
  userId: number,
  excludeAppointmentId?: number
) {
  return prisma.appointment.findMany({
    where: {
      bikeId,
      userId,
      ...(excludeAppointmentId ? { NOT: { id: excludeAppointmentId } } : {}),
    },
    select: {
      id: true,
      title: true,
      serviceDate: true,
      totalCost: true,
    },
    orderBy: { serviceDate: "desc" },
  });
}

async function ownsAppointmentTemplates(
  db: Prisma.TransactionClient, userId: number, items: AppointmentItemInput[],
) {
  const ids = Array.from(new Set(items.flatMap((item) => item.serviceTemplateId ? [item.serviceTemplateId] : [])));
  if (!ids.length) return true;
  return await db.serviceTemplate.count({ where: { id: { in: ids }, userId } }) === ids.length;
}

/**
 * Cria um novo atendimento com seus itens e lembretes em transação atômica.
 */
export async function createAppointment(
  userId: number,
  data: CreateAppointmentInput,
  transaction?: Prisma.TransactionClient
) {
  const db = transaction ?? prisma;
  // 1. Valida cliente e bike pertencentes à oficina
  const matchedBike = await db.bike.findFirst({
    where: { id: data.bikeId, clientId: data.clientId, userId, client: { userId } },
  });
  if (!matchedBike || !await ownsAppointmentTemplates(db, userId, data.items)) return null;
  const bike = matchedBike;

  // 2. Valida vínculo com atendimento pai (mesma bike e oficina)
  if (data.parentAppointmentId) {
    const parent = await db.appointment.findFirst({
      where: { id: data.parentAppointmentId, bikeId: data.bikeId, userId },
    });
    if (!parent) return null;
  }

  // 3. Calcula total do atendimento no servidor
  const items = data.items && data.items.length > 0 ? data.items : [];
  const totalCost = items.reduce(
    (sum, item) => sum + (Number(item.laborCost) || 0) + (Number(item.partsCost) || 0),
    0
  );

  const serviceDate = new Date(data.serviceDate);

  // Determina status de pagamento se não for explicitado
  let paymentStatus: PaymentStatus = data.paymentStatus ?? "PENDENTE";
  const amountPaid = Number(data.amountPaid) || 0;
  if (!data.paymentStatus) {
    if (amountPaid >= totalCost && totalCost > 0) {
      paymentStatus = "PAGO";
    } else if (amountPaid > 0) {
      paymentStatus = "PARCIAL";
    }
  }

  // Reutiliza a transação do seed quando o chamador já abriu uma.
  async function persist(tx: Prisma.TransactionClient) {
    // Cria o atendimento
    const appointment = await tx.appointment.create({
      data: {
        userId,
        clientId: data.clientId,
        bikeId: data.bikeId,
        title: data.title.trim(),
        description: data.description || null,
        serviceDate,
        status: data.status ?? "CONCLUIDO",
        totalCost,
        odometerKm: data.odometerKm ?? null,
        usageHours: data.usageHours ?? null,
        paymentStatus,
        amountPaid,
        paymentMethod: data.paymentMethod || null,
        paidAt: data.paidAt ? new Date(data.paidAt) : paymentStatus === "PAGO" ? new Date() : null,
        parentAppointmentId: data.parentAppointmentId || null,
        linkType: data.parentAppointmentId ? data.linkType || "CONTINUACAO" : null,
      },
    });

    // Cria os itens
    const createdItems: Array<{ id: number; serviceTemplateId?: number | null }> = [];
    for (const item of items) {
      const created = await tx.appointmentItem.create({
        data: {
          appointmentId: appointment.id,
          serviceTemplateId: item.serviceTemplateId || null,
          description: item.description.trim(),
          laborCost: Number(item.laborCost) || 0,
          partsDescription: item.partsDescription?.trim() || null,
          partsCost: Number(item.partsCost) || 0,
        },
      });
      createdItems.push(created);
    }

    // Atualiza odômetro e horas na Bike se o valor for superior
    const bikeUpdate: { currentOdometerKm?: number; currentHours?: number } = {};
    if (
      data.odometerKm != null &&
      (bike.currentOdometerKm == null || data.odometerKm > bike.currentOdometerKm)
    ) {
      bikeUpdate.currentOdometerKm = data.odometerKm;
    }
    if (
      data.usageHours != null &&
      (bike.currentHours == null || data.usageHours > bike.currentHours)
    ) {
      bikeUpdate.currentHours = data.usageHours;
    }
    if (Object.keys(bikeUpdate).length > 0) {
      await tx.bike.update({
        where: { id: bike.id },
        data: bikeUpdate,
      });
    }

    // Sincroniza os lembretes de revisão
    await syncRemindersForAppointment(tx, appointment, createdItems);

    return appointment;
  }

  return transaction ? persist(transaction) : prisma.$transaction(persist);
}

/**
 * Atualiza um atendimento existente, seus itens e lembretes em transação.
 */
export async function updateAppointment(
  id: number,
  userId: number,
  data: UpdateAppointmentInput
) {
  const existing = await prisma.appointment.findFirst({
    where: { id, userId },
    include: { items: true },
  });
  if (!existing) return null;

  const targetBikeId = data.bikeId ?? existing.bikeId;
  if (data.bikeId !== undefined && !await prisma.bike.findFirst({
    where: { id: targetBikeId, userId, clientId: existing.clientId },
  })) return null;
  if (data.items && !await ownsAppointmentTemplates(prisma, userId, data.items)) return null;

  const parentId = data.parentAppointmentId === undefined ? existing.parentAppointmentId : data.parentAppointmentId;
  if (parentId && (data.parentAppointmentId !== undefined || data.bikeId !== undefined)) {
    const parent = await prisma.appointment.findFirst({
      where: {
        id: parentId,
        bikeId: targetBikeId,
        userId,
        NOT: { id },
      },
    });
    if (!parent) return null;
  }

  return prisma.$transaction(async (tx) => {
    let totalCost = existing.totalCost;

    let createdItems: Array<{ id: number; serviceTemplateId?: number | null }> = [];

    // Se novos itens foram fornecidos, substitui os itens antigos
    if (data.items) {
      totalCost = data.items.reduce(
        (sum, item) => sum + (Number(item.laborCost) || 0) + (Number(item.partsCost) || 0),
        0
      );

      // Remove itens antigos (onDelete: Cascade remove lembretes antigos do item)
      await tx.appointmentItem.deleteMany({
        where: { appointmentId: id },
      });

      // Cria novos itens
      for (const item of data.items) {
        const created = await tx.appointmentItem.create({
          data: {
            appointmentId: id,
            serviceTemplateId: item.serviceTemplateId || null,
            description: item.description.trim(),
            laborCost: Number(item.laborCost) || 0,
            partsDescription: item.partsDescription?.trim() || null,
            partsCost: Number(item.partsCost) || 0,
          },
        });
        createdItems.push(created);
      }
    } else {
      createdItems = existing.items;
    }

    const serviceDate = data.serviceDate
      ? new Date(data.serviceDate)
      : existing.serviceDate;

    // Atualiza atendimento
    const updated = await tx.appointment.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.serviceDate && { serviceDate }),
        ...(data.status && { status: data.status }),
        ...(data.bikeId && { bikeId: data.bikeId }),
        totalCost,
        ...(data.odometerKm !== undefined && { odometerKm: data.odometerKm }),
        ...(data.usageHours !== undefined && { usageHours: data.usageHours }),
        ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
        ...(data.amountPaid !== undefined && { amountPaid: data.amountPaid }),
        ...(data.paymentMethod !== undefined && {
          paymentMethod: data.paymentMethod,
        }),
        ...(data.paidAt !== undefined && {
          paidAt: data.paidAt ? new Date(data.paidAt) : null,
        }),
        ...(data.parentAppointmentId !== undefined && {
          parentAppointmentId: data.parentAppointmentId || null,
        }),
        ...((data.parentAppointmentId !== undefined || data.linkType !== undefined) && {
          linkType: parentId ? data.linkType ?? existing.linkType ?? "CONTINUACAO" : null,
        }),
      },
    });

    // Atualiza bike
    if (data.odometerKm != null || data.usageHours != null) {
      const bike = await tx.bike.findUnique({ where: { id: targetBikeId } });
      if (bike) {
        const bikeUpdate: { currentOdometerKm?: number; currentHours?: number } = {};
        if (
          data.odometerKm != null &&
          (bike.currentOdometerKm == null || data.odometerKm > bike.currentOdometerKm)
        ) {
          bikeUpdate.currentOdometerKm = data.odometerKm;
        }
        if (
          data.usageHours != null &&
          (bike.currentHours == null || data.usageHours > bike.currentHours)
        ) {
          bikeUpdate.currentHours = data.usageHours;
        }
        if (Object.keys(bikeUpdate).length > 0) {
          await tx.bike.update({ where: { id: targetBikeId }, data: bikeUpdate });
        }
      }
    }

    // Sincroniza lembretes
    await syncRemindersForAppointment(tx, updated, createdItems);

    return updated;
  });
}

/**
 * Marca um atendimento como pago de forma rápida.
 */
export async function markAsPaid(
  id: number,
  userId: number,
  options: {
    method?: PaymentMethod;
    amount?: number;
  } = {}
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, userId },
  });
  if (!appointment) return null;

  const amountPaid = options.amount ?? appointment.totalCost ?? 0;
  const paymentMethod = options.method ?? appointment.paymentMethod ?? "PIX";

  return prisma.appointment.update({
    where: { id },
    data: {
      paymentStatus: "PAGO",
      amountPaid,
      paymentMethod,
      paidAt: new Date(),
    },
  });
}

/**
 * Exclui um atendimento e seus itens / lembretes vinculados.
 */
export async function deleteAppointment(id: number, userId: number) {
  const exists = await prisma.appointment.findFirst({ where: { id, userId } });
  if (!exists) return false;

  await prisma.appointment.delete({ where: { id } });
  return true;
}
