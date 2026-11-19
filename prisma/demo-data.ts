/**
 * Dados simulados de uma oficina (clientes, bikes, 12 meses de atendimentos,
 * pagamentos, vínculos e lembretes). Usado pelo seed da conta demo e pelo
 * seed de uma conta existente (prisma/seed-account.ts).
 */
import { fakerPT_BR as faker } from "@faker-js/faker";
import type { Prisma } from "../app/generated/prisma/client";
import { createAppointment, type CreateAppointmentInput, type PaymentMethod } from "../app/services/appointments.server";
import { computeDue } from "../app/services/reminders.server";

const DAY_MS = 86_400_000;
const models = [
  { brand: "Caloi", model: "Elite", type: "MTB" },
  { brand: "Specialized", model: "Allez", type: "Speed" },
  { brand: "Trek", model: "Domane", type: "Speed" },
  { brand: "Oggi", model: "Big Wheel 7.3", type: "MTB" },
  { brand: "Sense", model: "Easy", type: "Urbana" },
  { brand: "Scott", model: "Scale 970", type: "MTB" },
  { brand: "Soul", model: "SL 329", type: "MTB" },
  { brand: "Cannondale", model: "Trail Neo", type: "E-bike" },
];
const paymentMethods: PaymentMethod[] = ["PIX", "CREDITO", "DEBITO", "DINHEIRO"];
const parts = {
  "troca-corrente": { description: "Corrente", min: 80, max: 250 },
  "troca-pastilhas-sapatas": { description: "Pastilhas", min: 40, max: 120 },
  "troca-cabos-conduites": { description: "Cabos e conduítes", min: 45, max: 90 },
  "reposicao-selante-tubeless": { description: "Selante", min: 30, max: 60 },
};

function demoCpf(index: number) {
  const digits = String(900_123_000 + index).split("").map(Number);
  for (const size of [9, 10]) {
    const sum = digits.reduce((total, digit, position) => total + digit * (size + 1 - position), 0);
    digits.push((sum * 10 % 11) % 10);
  }
  return digits.join("");
}

function appointmentSchedule(now: Date) {
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const weightedDates: Date[] = [];
  for (let offset = 1; offset <= 365; offset++) {
    const date = new Date(today.getTime() - offset * DAY_MS);
    weightedDates.push(date);
    if ([5, 6].includes(date.getDay())) weightedDates.push(date, date);
    if ([11, 0, 1, 2].includes(date.getMonth())) weightedDates.push(date);
  }

  const visits = Array.from({ length: 285 }, (_, index) => ({
    date: index < 12 ? new Date(today.getFullYear(), today.getMonth() - index, index === 0 ? 1 : 15, 12)
      : faker.helpers.arrayElement(weightedDates),
    bikeIndex: faker.number.int({ min: 0, max: 44 }),
  }));
  visits[0].date = new Date(Math.min(now.getTime() - 1_000, visits[0].date.getTime()));

  // Limpeza da transmissão gera prazo em dois meses. Reserve bikes para
  // que outro atendimento do histórico não feche esses lembretes.
  const dueDates = new Map<number, Date>();
  for (const date of weightedDates) {
    const due = computeDue({ serviceDate: date, intervalMonths: 2 }).dueDate;
    if (due) dueDates.set(Math.round((due.getTime() - today.getTime()) / DAY_MS), date);
  }
  const dueWindows = [[-14, -1], [1, 7], [20, 32]];
  const selected = dueWindows.flatMap(([from, to]) => {
    const candidates = Array.from(dueDates).filter(([offset]) => offset >= from && offset <= to)
      .sort(([a], [b]) => b - a);
    return Array.from({ length: 5 }, (_, index) => candidates[index % candidates.length][1]);
  });
  const followUps = selected.map((date, index) => ({ bikeIndex: 45 + index, date }));

  return [...visits, ...followUps].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface PopulateOptions {
  now: Date;
  /** Texto gravado nas observações dos clientes criados, para identificá-los depois. */
  clientNote?: string;
}

/** Popula a oficina com dados simulados. Os serviços padrão da oficina já devem existir. */
export async function populateShop(tx: Prisma.TransactionClient, userId: number, { now, clientNote }: PopulateOptions) {
  faker.seed(42);
  const templates = await tx.serviceTemplate.findMany({ where: { userId }, orderBy: { id: "asc" } });
  const featured = ["revisao-basica", "limpeza-lubrificacao-transmissao", "regulagem-cambio"];
  const weighted = [...templates, ...templates.filter(({ key }) => featured.some((value) => value === key)),
    ...templates.filter(({ key }) => featured.some((value) => value === key))];
  const followUpService = templates.find(({ key }) => key === "limpeza-lubrificacao-transmissao");
  if (!followUpService) throw new Error("O catálogo padrão está incompleto.");

  const clients = [];
  for (let index = 0; index < 40; index++) {
    clients.push(await tx.client.create({
      data: {
        userId, fullName: faker.person.fullName(), cpf: demoCpf(index), notes: clientNote ?? null,
        phone: index % 7 === 0 ? null : `119${String(1000 + index)}0000`,
      },
    }));
  }

  const bikes = [];
  for (let index = 0; index < 60; index++) {
    const bike = await tx.bike.create({
      data: {
        userId, clientId: clients[index % clients.length].id, ...models[index % models.length],
        currentOdometerKm: 0, currentHours: 0,
      },
    });
    bikes.push({ ...bike, km: 0, hours: 0, priorId: undefined as number | undefined });
  }

  const schedule = appointmentSchedule(now);
  let links = 0;
  let contacted = 0;
  for (let index = 0; index < schedule.length; index++) {
    const visit = schedule[index];
    const bike = bikes[visit.bikeIndex];
    const followUp = visit.bikeIndex >= 45;
    const services = followUp ? [followUpService] : Array.from(new Set(
      Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.helpers.arrayElement(weighted)),
    ));
    const items = services.map((template) => {
      const part = parts[template.key as keyof typeof parts];
      return {
        serviceTemplateId: template.id,
        description: template.name,
        laborCost: template.defaultLaborCost,
        partsDescription: part?.description,
        partsCost: part ? faker.number.int({ min: part.min, max: part.max }) : 0,
      };
    });

    bike.km += faker.number.int({ min: 40, max: 340 });
    bike.hours += faker.number.int({ min: 3, max: 26 });
    const total = items.reduce((sum, item) => sum + item.laborCost + item.partsCost, 0);
    const paymentBucket = index % 20;
    const paymentStatus = paymentBucket < 2 ? "PENDENTE" : paymentBucket === 2 ? "PARCIAL" : "PAGO";
    const status = !followUp && index > 235 && index % 5 === 0 ? "PENDENTE" : "CONCLUIDO";
    const linked = !followUp && Boolean(bike.priorId) && links < Math.floor((index + 1) / 20);
    const input: CreateAppointmentInput = {
      clientId: bike.clientId, bikeId: bike.id, title: items[0].description, items, status,
      serviceDate: visit.date, odometerKm: bike.km, usageHours: bike.hours,
      paymentStatus, amountPaid: paymentStatus === "PAGO" ? total : paymentStatus === "PARCIAL" ? total / 2 : 0,
      paymentMethod: paymentStatus === "PENDENTE" ? null : faker.helpers.arrayElement(paymentMethods),
      paidAt: paymentStatus === "PENDENTE" ? null : visit.date,
      parentAppointmentId: linked ? bike.priorId : null,
      linkType: linked ? (links % 2 === 0 ? "GARANTIA" : "CONTINUACAO") : null,
    };
    const appointment = await createAppointment(userId, input, tx);
    if (!appointment) throw new Error("Não foi possível criar um atendimento da demo.");
    bike.priorId = appointment.id;
    if (linked) links++;
    if (followUp && [45, 46, 50].includes(visit.bikeIndex)) {
      const updated = await tx.maintenanceReminder.updateMany({
        where: { userId, appointmentItem: { appointmentId: appointment.id } },
        data: { status: "CONTATADO", contactedAt: now },
      });
      contacted += updated.count;
    }
  }

  const reminders = await tx.maintenanceReminder.count({ where: { userId } });
  return { clientes: clients.length, bikes: bikes.length, atendimentos: schedule.length, vínculos: links, lembretes: reminders, contatados: contacted };
}
