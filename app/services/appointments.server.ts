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
import { parseDateInput } from "../features/appointments/types";

export type AppointmentStatus = "PENDENTE" | "CONCLUIDO" | "CANCELADO";
export type PaymentStatus = "PENDENTE" | "PARCIAL" | "PAGO";
export type PaymentMethod = "PIX" | "DINHEIRO" | "DEBITO" | "CREDITO";
export type AppointmentLinkType = "CONTINUACAO" | "GARANTIA";

export interface AppointmentItemInput {
  id?: number | null;
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

const MAX_CHAIN = 200;

/**
 * Lista atendimentos do cliente para o campo "Continuação de".
 * O formulário mostra só os da bike escolhida e com data anterior ou igual.
 */
export async function listLinkableAppointments(clientId: number, userId: number) {
  return prisma.appointment.findMany({
    where: { clientId, userId },
    select: { id: true, title: true, serviceDate: true, totalCost: true, bikeId: true, parentAppointmentId: true },
    orderBy: { serviceDate: "desc" },
  });
}

/**
 * Retorna a cadeia inteira de atendimentos ligados (original → continuações/retornos),
 * em ordem de data, com a profundidade de cada um na árvore.
 */
export async function getAppointmentChain(id: number, userId: number) {
  const select = {
    id: true, title: true, serviceDate: true, status: true, totalCost: true,
    linkType: true, parentAppointmentId: true,
  } as const;
  type ChainEntry = {
    id: number; title: string; serviceDate: Date; status: AppointmentStatus;
    totalCost: number | null; linkType: AppointmentLinkType | null; parentAppointmentId: number | null;
  };
  const start: ChainEntry | null = await prisma.appointment.findFirst({ where: { id, userId }, select });
  if (!start) return [];

  let root: ChainEntry = start;
  const visited = new Set<number>([root.id]);
  while (root.parentAppointmentId && visited.size < MAX_CHAIN) {
    const parent: ChainEntry | null = await prisma.appointment.findFirst({
      where: { id: root.parentAppointmentId, userId }, select,
    });
    if (!parent || visited.has(parent.id)) break;
    visited.add(parent.id);
    root = parent;
  }

  const chain: Array<ChainEntry & { depth: number }> = [{ ...root, depth: 0 }];
  const seen = new Set<number>([root.id]);
  let level = [root.id];
  for (let depth = 1; level.length && seen.size < MAX_CHAIN; depth++) {
    const children = await prisma.appointment.findMany({
      where: { userId, parentAppointmentId: { in: level } }, select, orderBy: { serviceDate: "asc" },
    });
    level = [];
    for (const child of children) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      level.push(child.id);
      chain.push({ ...child, depth });
    }
  }
  return chain.length > 1 ? chain.sort((a, b) => a.serviceDate.getTime() - b.serviceDate.getTime()) : [];
}


/** Erro de regra de negócio, exibido para o usuário no campo indicado. */
export class AppointmentRuleError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
    this.name = "AppointmentRuleError";
  }
}

const cents = (value: number) => Math.round(value * 100) / 100;

function sumItems(items: AppointmentItemInput[]) {
  return cents(items.reduce(
    (sum, item) => sum + (Number(item.laborCost) || 0) + (Number(item.partsCost) || 0),
    0,
  ));
}

/**
 * Calcula o status do pagamento a partir do valor pago e do total.
 * Escolher "Pago" sem informar valor considera o total pago.
 */
export function resolvePayment(input: {
  total: number;
  amountPaid?: number | null;
  requestedStatus?: PaymentStatus | null;
  paymentMethod?: PaymentMethod | null;
  paidAt?: Date | null;
  previousPaidAt?: Date | null;
  now?: Date;
}) {
  const total = cents(Math.max(0, input.total));
  const informed = cents(Math.max(0, Number(input.amountPaid) || 0));
  const amountPaid = input.requestedStatus === "PAGO" && informed === 0 ? total : informed;
  if (amountPaid > total) {
    throw new AppointmentRuleError("amountPaid", "O valor pago não pode ser maior que o total do atendimento.");
  }

  const paymentStatus: PaymentStatus = amountPaid >= total ? "PAGO" : amountPaid > 0 ? "PARCIAL" : "PENDENTE";
  const hasPayment = amountPaid > 0;
  return {
    amountPaid,
    paymentStatus,
    paymentMethod: hasPayment ? input.paymentMethod ?? null : null,
    paidAt: hasPayment ? input.paidAt ?? input.previousPaidAt ?? input.now ?? new Date() : null,
  };
}

/**
 * Confere o atendimento de origem: mesma bike e oficina, data anterior ou igual
 * e sem formar ciclo. Retorna false quando o atendimento não existe para a oficina.
 */
async function validateParent(
  db: Prisma.TransactionClient,
  userId: number,
  input: { id?: number; parentId: number; bikeId: number; serviceDate: Date },
) {
  if (input.id && input.parentId === input.id) {
    throw new AppointmentRuleError("parentAppointmentId", "Um atendimento não pode ser continuação dele mesmo.");
  }
  const parent = await db.appointment.findFirst({
    where: { id: input.parentId, userId },
    select: { id: true, bikeId: true, serviceDate: true, parentAppointmentId: true },
  });
  if (!parent) return false;
  if (parent.bikeId !== input.bikeId) {
    throw new AppointmentRuleError("parentAppointmentId", "O atendimento de origem precisa ser da mesma bike.");
  }
  if (parent.serviceDate.getTime() > input.serviceDate.getTime()) {
    throw new AppointmentRuleError("parentAppointmentId", "O atendimento de origem precisa ter data anterior a este.");
  }
  if (input.id) {
    let ancestorId = parent.parentAppointmentId;
    for (let step = 0; ancestorId && step < MAX_CHAIN; step++) {
      if (ancestorId === input.id) {
        throw new AppointmentRuleError("parentAppointmentId", "Esse vínculo formaria um ciclo entre atendimentos.");
      }
      const ancestor = await db.appointment.findFirst({
        where: { id: ancestorId, userId }, select: { parentAppointmentId: true },
      });
      ancestorId = ancestor?.parentAppointmentId ?? null;
    }
  }
  return true;
}

async function ownsAppointmentTemplates(
  db: Prisma.TransactionClient, userId: number, items: AppointmentItemInput[],
) {
  const ids = Array.from(new Set(items.flatMap((item) => item.serviceTemplateId ? [item.serviceTemplateId] : [])));
  if (!ids.length) return true;
  return await db.serviceTemplate.count({ where: { id: { in: ids }, userId } }) === ids.length;
}

/** Atualiza odômetro e horas da bike quando os valores informados forem maiores. */
async function updateBikeTelemetry(
  tx: Prisma.TransactionClient,
  bikeId: number,
  telemetry: { odometerKm?: number | null; usageHours?: number | null },
) {
  if (telemetry.odometerKm == null && telemetry.usageHours == null) return;
  const bike = await tx.bike.findUnique({ where: { id: bikeId } });
  if (!bike) return;
  const bikeUpdate: { currentOdometerKm?: number; currentHours?: number } = {};
  if (telemetry.odometerKm != null && (bike.currentOdometerKm == null || telemetry.odometerKm > bike.currentOdometerKm)) {
    bikeUpdate.currentOdometerKm = telemetry.odometerKm;
  }
  if (telemetry.usageHours != null && (bike.currentHours == null || telemetry.usageHours > bike.currentHours)) {
    bikeUpdate.currentHours = telemetry.usageHours;
  }
  if (Object.keys(bikeUpdate).length > 0) {
    await tx.bike.update({ where: { id: bikeId }, data: bikeUpdate });
  }
}

function itemData(item: AppointmentItemInput) {
  return {
    serviceTemplateId: item.serviceTemplateId || null,
    description: item.description.trim(),
    laborCost: cents(Number(item.laborCost) || 0),
    partsDescription: item.partsDescription?.trim() || null,
    partsCost: cents(Number(item.partsCost) || 0),
  };
}

/**
 * Cria um novo atendimento com seus itens e lembretes em transação atômica.
 * Retorna null quando cliente, bike, serviço ou atendimento de origem não pertencem à oficina.
 */
export async function createAppointment(
  userId: number,
  data: CreateAppointmentInput,
  transaction?: Prisma.TransactionClient
) {
  const db = transaction ?? prisma;
  const items = data.items ?? [];
  if (!items.length) throw new AppointmentRuleError("items", "O atendimento deve ter pelo menos um item.");

  // 1. Valida cliente, bike e serviços pertencentes à oficina
  const bike = await db.bike.findFirst({
    where: { id: data.bikeId, clientId: data.clientId, userId, client: { userId } },
  });
  if (!bike || !await ownsAppointmentTemplates(db, userId, items)) return null;
  const bikeId = bike.id;

  const serviceDate = parseDateInput(data.serviceDate);
  if (Number.isNaN(serviceDate.getTime())) throw new AppointmentRuleError("serviceDate", "Data inválida.");

  // 2. Valida vínculo com atendimento de origem
  if (data.parentAppointmentId && !await validateParent(db, userId, {
    parentId: data.parentAppointmentId, bikeId: data.bikeId, serviceDate,
  })) return null;

  // 3. Total e pagamento calculados no servidor
  const totalCost = sumItems(items);
  const payment = resolvePayment({
    total: totalCost,
    amountPaid: data.amountPaid,
    requestedStatus: data.paymentStatus,
    paymentMethod: data.paymentMethod,
    paidAt: data.paidAt ? parseDateInput(data.paidAt) : null,
  });
  const status = data.status ?? "CONCLUIDO";

  // Reutiliza a transação do seed quando o chamador já abriu uma.
  async function persist(tx: Prisma.TransactionClient) {
    const appointment = await tx.appointment.create({
      data: {
        userId,
        clientId: data.clientId,
        bikeId: data.bikeId,
        title: data.title.trim(),
        description: data.description || null,
        serviceDate,
        status,
        totalCost,
        odometerKm: data.odometerKm ?? null,
        usageHours: data.usageHours ?? null,
        ...payment,
        parentAppointmentId: data.parentAppointmentId || null,
        linkType: data.parentAppointmentId ? data.linkType || "CONTINUACAO" : null,
      },
    });

    const createdItems: Array<{ id: number; serviceTemplateId?: number | null }> = [];
    for (const item of items) {
      createdItems.push(await tx.appointmentItem.create({
        data: { appointmentId: appointment.id, ...itemData(item) },
      }));
    }

    // Atendimento cancelado não altera a bike nem gera lembretes
    if (status !== "CANCELADO") {
      await updateBikeTelemetry(tx, bikeId, data);
    }
    await syncRemindersForAppointment(tx, appointment, createdItems);

    return appointment;
  }

  return transaction ? persist(transaction) : prisma.$transaction(persist);
}

/**
 * Atualiza um atendimento existente, seus itens e lembretes em transação.
 * Itens enviados com id são atualizados no lugar, preservando o lembrete (e o status de contato).
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

  if (data.items && !data.items.length) {
    throw new AppointmentRuleError("items", "O atendimento deve ter pelo menos um item.");
  }

  const targetBikeId = data.bikeId ?? existing.bikeId;
  if (data.bikeId !== undefined && !await prisma.bike.findFirst({
    where: { id: targetBikeId, userId, clientId: existing.clientId },
  })) return null;
  if (data.items && !await ownsAppointmentTemplates(prisma, userId, data.items)) return null;

  const serviceDate = data.serviceDate ? parseDateInput(data.serviceDate) : existing.serviceDate;
  if (Number.isNaN(serviceDate.getTime())) throw new AppointmentRuleError("serviceDate", "Data inválida.");

  const parentId = data.parentAppointmentId === undefined ? existing.parentAppointmentId : data.parentAppointmentId;
  if (parentId && !await validateParent(prisma, userId, {
    id, parentId, bikeId: targetBikeId, serviceDate,
  })) return null;

  const totalCost = data.items ? sumItems(data.items) : existing.totalCost ?? 0;
  const paymentChanged = data.items !== undefined || data.amountPaid !== undefined
    || data.paymentStatus !== undefined || data.paymentMethod !== undefined || data.paidAt !== undefined;
  const payment = paymentChanged ? resolvePayment({
    total: totalCost,
    amountPaid: data.amountPaid ?? existing.amountPaid,
    requestedStatus: data.paymentStatus,
    paymentMethod: data.paymentMethod === undefined ? existing.paymentMethod : data.paymentMethod,
    paidAt: data.paidAt ? parseDateInput(data.paidAt) : null,
    previousPaidAt: existing.paidAt,
  }) : {};
  const status = data.status ?? existing.status;

  return prisma.$transaction(async (tx) => {
    let items: Array<{ id: number; serviceTemplateId?: number | null }> = existing.items;

    if (data.items) {
      const existingIds = new Set(existing.items.map((item) => item.id));
      const keptIds = new Set<number>();
      items = [];
      for (const item of data.items) {
        if (item.id && existingIds.has(item.id) && !keptIds.has(item.id)) {
          keptIds.add(item.id);
          items.push(await tx.appointmentItem.update({ where: { id: item.id }, data: itemData(item) }));
        } else {
          items.push(await tx.appointmentItem.create({ data: { appointmentId: id, ...itemData(item) } }));
        }
      }
      // Itens removidos levam junto o lembrete (onDelete: Cascade)
      await tx.appointmentItem.deleteMany({
        where: { appointmentId: id, id: { notIn: items.map((item) => item.id) } },
      });
    }

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
        ...payment,
        ...(data.parentAppointmentId !== undefined && {
          parentAppointmentId: data.parentAppointmentId || null,
        }),
        ...((data.parentAppointmentId !== undefined || data.linkType !== undefined) && {
          linkType: parentId ? data.linkType ?? existing.linkType ?? "CONTINUACAO" : null,
        }),
      },
    });

    if (status !== "CANCELADO") {
      await updateBikeTelemetry(tx, targetBikeId, data);
    }
    // Lembretes ficam presos à bike: ao trocar a bike, recria a partir dos itens
    if (data.bikeId && data.bikeId !== existing.bikeId) {
      await tx.maintenanceReminder.deleteMany({ where: { appointmentItem: { appointmentId: id } } });
    }
    await syncRemindersForAppointment(tx, updated, items);

    return updated;
  });
}

/**
 * Marca um atendimento como pago (total ou valor informado).
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

  const payment = resolvePayment({
    total: appointment.totalCost ?? 0,
    amountPaid: options.amount,
    requestedStatus: "PAGO",
    paymentMethod: options.method ?? appointment.paymentMethod ?? "PIX",
    previousPaidAt: null,
  });

  return prisma.appointment.update({ where: { id }, data: payment });
}

/**
 * Exclui um atendimento e seus itens / lembretes vinculados.
 * Atendimentos que apontavam para ele deixam de ter vínculo.
 */
export async function deleteAppointment(id: number, userId: number) {
  const exists = await prisma.appointment.findFirst({ where: { id, userId } });
  if (!exists) return false;

  await prisma.$transaction([
    prisma.appointment.updateMany({
      where: { parentAppointmentId: id, userId },
      data: { parentAppointmentId: null, linkType: null },
    }),
    prisma.appointment.delete({ where: { id } }),
  ]);
  return true;
}
