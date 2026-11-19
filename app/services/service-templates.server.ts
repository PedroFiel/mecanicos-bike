/**
 * service-templates.server.ts
 *
 * Gerenciamento de templates de serviços da oficina.
 */

import prisma from "../../prisma/prisma";
import type { Prisma } from "../generated/prisma/client";
import { DEFAULT_SERVICES, type ServiceCategory } from "~/lib/default-services";

export interface CreateServiceTemplateInput {
  name: string;
  category: ServiceCategory | string;
  defaultLaborCost: number;
  estimatedMinutes?: number | null;
  intervalMonths?: number | null;
  intervalKm?: number | null;
  intervalHours?: number | null;
  key?: string | null;
}

export interface UpdateServiceTemplateInput {
  name?: string;
  category?: ServiceCategory | string;
  defaultLaborCost?: number;
  estimatedMinutes?: number | null;
  intervalMonths?: number | null;
  intervalKm?: number | null;
  intervalHours?: number | null;
  active?: boolean;
}

/**
 * Lista todos os templates de serviço de uma oficina.
 */
export async function listServiceTemplates(
  userId: number,
  options: { includeInactive?: boolean } = {}
) {
  return prisma.serviceTemplate.findMany({
    where: {
      userId,
      ...(options.includeInactive ? {} : { active: true }),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

/**
 * Busca um template específico por ID garantindo isolamento por oficina.
 */
export async function getServiceTemplateById(id: number, userId: number) {
  return prisma.serviceTemplate.findFirst({
    where: { id, userId },
  });
}

/**
 * Cria um novo serviço para a oficina.
 */
export async function createServiceTemplate(
  userId: number,
  data: CreateServiceTemplateInput
) {
  return prisma.serviceTemplate.create({
    data: {
      userId,
      name: data.name.trim(),
      category: data.category,
      defaultLaborCost: data.defaultLaborCost,
      estimatedMinutes: data.estimatedMinutes ?? null,
      intervalMonths: data.intervalMonths ?? null,
      intervalKm: data.intervalKm ?? null,
      intervalHours: data.intervalHours ?? null,
      key: data.key ?? null,
      active: true,
    },
  });
}

/**
 * Atualiza um serviço existente da oficina.
 */
export async function updateServiceTemplate(
  id: number,
  userId: number,
  data: UpdateServiceTemplateInput
) {
  const existing = await getServiceTemplateById(id, userId);
  if (!existing) return null;

  return prisma.serviceTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.defaultLaborCost !== undefined && {
        defaultLaborCost: data.defaultLaborCost,
      }),
      ...(data.estimatedMinutes !== undefined && {
        estimatedMinutes: data.estimatedMinutes,
      }),
      ...(data.intervalMonths !== undefined && {
        intervalMonths: data.intervalMonths,
      }),
      ...(data.intervalKm !== undefined && { intervalKm: data.intervalKm }),
      ...(data.intervalHours !== undefined && {
        intervalHours: data.intervalHours,
      }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });
}

/**
 * Ativa ou desativa um serviço (nunca remove para não quebrar histórico de atendimentos).
 */
export async function setServiceTemplateActive(
  id: number,
  userId: number,
  active: boolean
) {
  const existing = await getServiceTemplateById(id, userId);
  if (!existing) return null;

  return prisma.serviceTemplate.update({
    where: { id },
    data: { active },
  });
}

/**
 * Copia os 18 serviços padrão para uma oficina recém-criada.
 */
export async function seedDefaultServices(
  userId: number,
  dbClient: Prisma.TransactionClient = prisma
) {
  const data = DEFAULT_SERVICES.map((s) => ({
    userId,
    key: s.key,
    name: s.name,
    category: s.category,
    defaultLaborCost: s.defaultLaborCost,
    estimatedMinutes: s.estimatedMinutes,
    intervalMonths: s.intervalMonths,
    intervalKm: s.intervalKm,
    intervalHours: s.intervalHours,
    active: true,
  }));

  return dbClient.serviceTemplate.createMany({
    data,
  });
}

/**
 * Restaura os serviços padrão que ainda não existem para a oficina.
 * Não duplica serviços existentes (mesmo que tenham sido desativados ou renomeados).
 */
export async function restoreDefaultServices(userId: number) {
  const existingTemplates = await prisma.serviceTemplate.findMany({
    where: { userId },
    select: { key: true },
  });

  const existingKeys = new Set(
    existingTemplates.map((t) => t.key).filter(Boolean)
  );

  const missingServices = DEFAULT_SERVICES.filter(
    (service) => !existingKeys.has(service.key)
  );

  if (missingServices.length === 0) {
    return { restoredCount: 0 };
  }

  const data = missingServices.map((s) => ({
    userId,
    key: s.key,
    name: s.name,
    category: s.category,
    defaultLaborCost: s.defaultLaborCost,
    estimatedMinutes: s.estimatedMinutes,
    intervalMonths: s.intervalMonths,
    intervalKm: s.intervalKm,
    intervalHours: s.intervalHours,
    active: true,
  }));

  const result = await prisma.serviceTemplate.createMany({
    data,
  });

  return { restoredCount: result.count };
}
