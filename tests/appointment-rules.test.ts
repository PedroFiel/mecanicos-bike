import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { isValidCPF } from "../app/lib/br-documents";
import { parseDateInput, toDateInputValue } from "../app/features/appointments/types";

// ── Funções puras ────────────────────────────────────────────────────────────
assert.equal(isValidCPF("529.982.247-25"), true);
assert.equal(isValidCPF("52998224725"), true);
assert.equal(isValidCPF("11111111111"), false);
assert.equal(isValidCPF("52998224724"), false);
assert.equal(toDateInputValue(parseDateInput("2026-11-19")), "2026-11-19");

const directory = await mkdtemp(join(tmpdir(), "mecanicos-bike-rules-"));
const filename = join(directory, "test.sqlite");
const environment = {
  ...process.env,
  DATABASE_URL: `file:${filename.split(sep).join("/")}`,
  TURSO_DATABASE_URL: "",
  TURSO_AUTH_TOKEN: "",
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "",
  JWT_SECRET: randomBytes(32).toString("hex"),
  NODE_ENV: "test",
};
Object.assign(process.env, environment);

try {
  await writeFile(filename, "", { flag: "wx" });
  const cli = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));
  execFileSync(process.execPath, [cli, "db", "push", "--skip-generate"], { env: environment });
  const { default: prisma } = await import("../prisma/prisma");

  try {
    const service = await import("../app/services/appointments.server");
    const { createAppointment, updateAppointment, markAsPaid, AppointmentRuleError, getAppointmentChain } = service;
    const { createToken } = await import("../app/lib/jwt.server");
    const newRoute = await import("../app/routes/appointments.new");
    const loginRoute = await import("../app/routes/login");
    const clientsApi = await import("../app/routes/api.clients");
    const bcrypt = (await import("bcryptjs")).default;

    const user = await prisma.user.create({
      data: { name: "Oficina", email: "oficina@teste.test", password: await bcrypt.hash("SenhaForte123", 10) },
    });
    const client = await prisma.client.create({ data: { userId: user.id, fullName: "Cliente" } });
    const bike = await prisma.bike.create({ data: { userId: user.id, clientId: client.id, model: "Epic" } });
    const otherBike = await prisma.bike.create({ data: { userId: user.id, clientId: client.id, model: "Caloi" } });
    const template = await prisma.serviceTemplate.create({
      data: { userId: user.id, name: "Suspensão 50h", category: "Suspensão", defaultLaborCost: 150, intervalMonths: 6, intervalHours: 50 },
    });
    const cookie = `token=${createToken({ userId: user.id, email: user.email, tokenVersion: user.tokenVersion })}`;
    const args = (path: string, body: URLSearchParams | object, method = "POST"): ActionFunctionArgs & LoaderFunctionArgs => {
      const headers = new Headers({ Cookie: cookie });
      if (!(body instanceof URLSearchParams)) headers.set("Content-Type", "application/json");
      return {
        request: new Request(`http://localhost${path}`, {
          method, headers, body: body instanceof URLSearchParams ? body : JSON.stringify(body),
        }),
        params: {}, context: {}, unstable_pattern: path,
      };
    };
    const base = { clientId: client.id, bikeId: bike.id, title: "Atendimento" };
    const suspension = { serviceTemplateId: template.id, description: "Suspensão 50h", laborCost: 150, partsCost: 50 };

    // ── Formulário: itens validados no servidor ──────────────────────────────
    async function submit(fields: Record<string, string>) {
      const form = new URLSearchParams({
        title: "Teste", serviceDate: "2026-11-19", status: "CONCLUIDO", bikeId: String(bike.id), ...fields,
      });
      return newRoute.action(args(`/appointments/new?clientId=${client.id}`, form) as never) as Promise<unknown>;
    }
    const before = await prisma.appointment.count();
    for (const itemsJson of [
      '[{"description":"Desconto","laborCost":-500,"partsCost":0}]',
      "[]",
      '[{"description":"","laborCost":10}]',
      '[{"description":"x","laborCost":"abc"}]',
    ]) {
      const result = await submit({ itemsJson }) as { errors?: Record<string, string> };
      assert.ok(result?.errors?.itemsJson, `itens inválidos deveriam falhar: ${itemsJson}`);
    }
    const badDate = await submit({ serviceDate: "abc", itemsJson: '[{"description":"x","laborCost":10}]' }) as { errors: Record<string, string> };
    assert.equal(badDate.errors.serviceDate, "Data inválida");
    const overpaid = await submit({ amountPaid: "9999", itemsJson: '[{"description":"x","laborCost":10}]' }) as { errors: Record<string, string> };
    assert.match(overpaid.errors.amountPaid, /maior que o total/);
    assert.ok(!JSON.stringify(overpaid).includes("prisma"));
    assert.equal(await prisma.appointment.count(), before);

    // ── Pagamento calculado pelo valor pago ──────────────────────────────────
    const paidInFull = await createAppointment(user.id, {
      ...base, serviceDate: "2026-05-10", paymentStatus: "PENDENTE", amountPaid: 200, usageHours: 100, items: [suspension],
    });
    assert.equal(paidInFull?.paymentStatus, "PAGO");
    const partial = await createAppointment(user.id, {
      ...base, serviceDate: "2026-05-11", amountPaid: 50, items: [{ description: "Regulagem", laborCost: 120, partsCost: 0 }],
    });
    assert.equal(partial?.paymentStatus, "PARCIAL");
    const pending = await createAppointment(user.id, {
      ...base, serviceDate: "2026-05-12", paymentStatus: "PAGO", amountPaid: 0, paymentMethod: "PIX",
      items: [{ description: "Regulagem", laborCost: 80, partsCost: 0 }],
    });
    assert.equal(pending?.paymentStatus, "PAGO");
    assert.equal(pending?.amountPaid, 80);
    const raised = await updateAppointment(pending!.id, user.id, {
      items: [{ description: "Regulagem", laborCost: 80, partsCost: 0 }, { description: "Peça", laborCost: 0, partsCost: 40 }],
    });
    assert.equal(raised?.paymentStatus, "PARCIAL");
    assert.equal((await markAsPaid(pending!.id, user.id))?.amountPaid, 120);
    await assert.rejects(markAsPaid(pending!.id, user.id, { amount: 999 }), AppointmentRuleError);

    // ── Lembretes: cancelado não gera nem fecha; mais recente vence ─────────
    const reminders = () => prisma.maintenanceReminder.findMany({ orderBy: { id: "asc" } });
    assert.equal((await reminders()).length, 1);
    assert.equal((await reminders())[0].dueHours, 150);
    await createAppointment(user.id, {
      ...base, serviceDate: "2026-06-01", status: "CANCELADO", usageHours: 400, items: [suspension],
    });
    assert.deepEqual((await reminders()).map((reminder) => reminder.status), ["ABERTO"]);
    assert.equal((await prisma.bike.findUniqueOrThrow({ where: { id: bike.id } })).currentHours, 100);

    await prisma.maintenanceReminder.updateMany({ data: { status: "CONTATADO", contactedAt: new Date() } });
    const newer = await createAppointment(user.id, { ...base, serviceDate: "2026-07-01", usageHours: 120, items: [suspension] });
    assert.deepEqual((await reminders()).map((reminder) => reminder.status), ["CONCLUIDO", "ABERTO"]);
    // Atendimento lançado com data antiga não reabre nem fecha o lembrete mais novo
    await createAppointment(user.id, { ...base, serviceDate: "2026-04-01", usageHours: 90, items: [suspension] });
    assert.deepEqual((await reminders()).map((reminder) => reminder.status), ["CONCLUIDO", "ABERTO", "CONCLUIDO"]);

    // Editar o atendimento mantendo o item preserva o lembrete e o status de contato
    const newerItem = await prisma.appointmentItem.findFirstOrThrow({ where: { appointmentId: newer!.id } });
    await prisma.maintenanceReminder.update({ where: { appointmentItemId: newerItem.id }, data: { status: "CONTATADO" } });
    await updateAppointment(newer!.id, user.id, { items: [{ ...suspension, id: newerItem.id, laborCost: 170 }] });
    const kept = await prisma.maintenanceReminder.findUniqueOrThrow({ where: { appointmentItemId: newerItem.id } });
    assert.equal(kept.status, "CONTATADO");
    // Cancelar remove o lembrete do atendimento
    await updateAppointment(newer!.id, user.id, { status: "CANCELADO" });
    assert.equal(await prisma.maintenanceReminder.count({ where: { appointmentItemId: newerItem.id } }), 0);

    // ── Vínculos: mesma bike, data anterior, sem ciclo ───────────────────────
    const first = await createAppointment(user.id, { ...base, serviceDate: "2026-08-01", items: [{ description: "A", laborCost: 10, partsCost: 0 }] });
    const second = await createAppointment(user.id, {
      ...base, serviceDate: "2026-08-05", parentAppointmentId: first!.id, linkType: "GARANTIA",
      items: [{ description: "B", laborCost: 0, partsCost: 0 }],
    });
    const third = await createAppointment(user.id, {
      ...base, serviceDate: "2026-08-09", parentAppointmentId: second!.id,
      items: [{ description: "C", laborCost: 0, partsCost: 0 }],
    });
    await assert.rejects(updateAppointment(first!.id, user.id, { parentAppointmentId: third!.id }), /data anterior|ciclo/);
    await assert.rejects(updateAppointment(first!.id, user.id, { parentAppointmentId: first!.id }), AppointmentRuleError);
    await assert.rejects(createAppointment(user.id, {
      ...base, serviceDate: "2026-07-01", parentAppointmentId: first!.id, items: [{ description: "D", laborCost: 1, partsCost: 0 }],
    }), /data anterior/);
    await assert.rejects(createAppointment(user.id, {
      ...base, bikeId: otherBike.id, serviceDate: "2026-09-01", parentAppointmentId: first!.id,
      items: [{ description: "E", laborCost: 1, partsCost: 0 }],
    }), /mesma bike/);
    // Ciclo também é barrado quando as datas permitiriam
    await updateAppointment(first!.id, user.id, { serviceDate: "2026-08-10" });
    await assert.rejects(updateAppointment(first!.id, user.id, { parentAppointmentId: third!.id }), /ciclo/);
    const chain = await getAppointmentChain(third!.id, user.id);
    // A cadeia vai do original aos retornos, em ordem de data
    assert.deepEqual(chain.map((entry) => entry.id), [second!.id, third!.id, first!.id]);
    assert.deepEqual(chain.map((entry) => entry.depth), [1, 2, 0]);

    // ── Clientes: CPF validado e normalizado ─────────────────────────────────
    const created = await clientsApi.action(args("/api/clients", { fullName: "Cliente CPF", cpf: "529.982.247-25", phone: "(11) 91234-5678" }));
    assert.equal(created.status, 201);
    const stored = await created.json();
    assert.equal(stored.cpf, "52998224725");
    assert.equal(stored.phone, "11912345678");
    assert.equal((await clientsApi.action(args("/api/clients", { fullName: "Duplicado", cpf: "52998224725" }))).status, 409);
    assert.equal((await clientsApi.action(args("/api/clients", { fullName: "Inválido", cpf: "11111111111" }))).status, 400);

    // ── Login: e-mail sem diferenciar maiúsculas e bloqueio sem revelar a conta ─
    const login = async (email: string, password: string, ip: string) => loginRoute.action({
      request: new Request("http://localhost/login", {
        method: "POST", body: new URLSearchParams({ email, password }), headers: { "x-real-ip": ip },
      }),
      params: {}, context: {}, unstable_pattern: "/login",
    } as never) as Promise<unknown>;
    const viaUppercase = await login("  Oficina@Teste.TEST ", "SenhaForte123", "10.0.0.1");
    assert.ok(viaUppercase instanceof Response && viaUppercase.headers.get("Location") === "/login/verify");
    for (let attempt = 0; attempt < 5; attempt++) await login("oficina@teste.test", "Errada123", "10.0.0.2");
    const lockedMessage = JSON.stringify(await login("oficina@teste.test", "SenhaForte123", "10.0.0.3"));
    const unknownMessage = JSON.stringify(await login("ninguem@teste.test", "SenhaForte123", "10.0.0.3"));
    assert.equal(lockedMessage, unknownMessage);
    assert.match(lockedMessage, /E-mail ou senha inválidos/);

    console.log("Regras de atendimento, pagamento, lembretes, vínculos, CPF e login verificadas.");
  } finally {
    await prisma.$disconnect();
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
