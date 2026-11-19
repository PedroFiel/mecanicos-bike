import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { mock } from "node:test";
import { fileURLToPath } from "node:url";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

const directory = await mkdtemp(join(tmpdir(), "mecanicos-bike-test-"));
const filename = join(directory, "test.sqlite");
const database = `file:${filename.split(sep).join("/")}`;
const environment = {
  ...process.env,
  DATABASE_URL: database,
  TURSO_DATABASE_URL: "",
  TURSO_AUTH_TOKEN: "",
  RESEND_API_KEY: "",
  EMAIL_PROVIDER: "brevo",
  BREVO_API_KEY: "fixture-brevo-key",
  BREVO_SENDER_EMAIL: "sender@example.test",
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
    const { createToken } = await import("../app/lib/jwt.server");
    const { createChallengeCookie, getLoginChallenge } = await import("../app/lib/auth.server");
    const { getDashboardData } = await import("../app/services/dashboard.server");
    const { createAppointment } = await import("../app/services/appointments.server");
    const { action: reminderAction } = await import("../app/routes/dashboard");
    const { action: verifyLogin } = await import("../app/routes/login.verify");
    const { action: resetPassword } = await import("../app/routes/reset-password");
    const clients = await import("../app/routes/api.clients");
    const clientDetail = await import("../app/routes/api.clients.$clientId");
    const bikes = await import("../app/routes/api.bikes");
    const bikeDetail = await import("../app/routes/api.bikes.$bikeId");
    const appointments = await import("../app/routes/api.appointments");
    const appointmentDetail = await import("../app/routes/api.appointments.$appointmentId");

    const now = new Date("2026-11-18T16:00:00Z");
    async function fixture(label: string, amount: number) {
      const user = await prisma.user.create({
        data: { name: label, email: `${label}@oficina.test`, password: "fixture" },
      });
      const client = await prisma.client.create({
        data: { userId: user.id, fullName: label, phone: "11912345678" },
      });
      const bike = await prisma.bike.create({
        data: { userId: user.id, clientId: client.id, model: label },
      });
      const template = await prisma.serviceTemplate.create({
        data: { userId: user.id, name: label, category: "Revisão", defaultLaborCost: amount, intervalKm: 1 },
      });
      const appointment = await createAppointment(user.id, {
        clientId: client.id, bikeId: bike.id, title: label, odometerKm: 0,
        serviceDate: new Date("2026-11-10T15:00:00Z"),
        items: [{ serviceTemplateId: template.id, description: label, laborCost: amount, partsCost: 0 }],
      });
      assert.ok(appointment);
      await prisma.bike.update({ where: { id: bike.id }, data: { currentOdometerKm: 10 } });
      const reminder = await prisma.maintenanceReminder.findFirstOrThrow({ where: { userId: user.id } });
      return { user, client, bike, template, appointment, reminder };
    }

    const own = await fixture("oficina-a", 100);
    const other = await fixture("oficina-b", 300);
    const cookie = `token=${createToken({
      userId: own.user.id, email: own.user.email, tokenVersion: own.user.tokenVersion,
    })}`;

    function requestArgs(
      path: string, method: string, params: Record<string, string> = {},
      body?: object | URLSearchParams, session = cookie,
    ): ActionFunctionArgs & LoaderFunctionArgs {
      const headers = new Headers({ Cookie: session });
      if (body && !(body instanceof URLSearchParams)) headers.set("Content-Type", "application/json");
      return {
        request: new Request(`http://localhost${path}`, {
          method, headers, body: body instanceof URLSearchParams ? body : body && JSON.stringify(body),
        }),
        params, context: {}, unstable_pattern: path,
      };
    }

    for (const [route, parameter, foreignId, patch] of [
      [clientDetail, "clientId", other.client.id, { fullName: "Outra oficina" }],
      [bikeDetail, "bikeId", other.bike.id, { model: "Outro modelo" }],
      [appointmentDetail, "appointmentId", other.appointment.id, { title: "Outro serviço" }],
    ] as const) {
      const path = `/api/${parameter}/${foreignId}`;
      const params = { [parameter]: String(foreignId) };
      assert.equal((await route.loader(requestArgs(path, "GET", params))).status, 404);
      assert.equal((await route.action(requestArgs(path, "PUT", params, patch))).status, 404);
      assert.equal((await route.action(requestArgs(path, "DELETE", params))).status, 404);
    }

    for (const [route, path, id] of [
      [clients, "/api/clients", own.client.id],
      [bikes, "/api/bikes", own.bike.id],
      [appointments, "/api/appointments", own.appointment.id],
    ] as const) {
      const response = await route.loader(requestArgs(path, "GET"));
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).map((row: { id: number }) => row.id), [id]);
    }

    assert.equal((await bikes.action(requestArgs("/api/bikes", "POST", {}, {
      model: "Bike", clientId: other.client.id,
    }))).status, 404);
    const appointmentInput = { title: "Revisão", clientId: own.client.id, bikeId: own.bike.id };
    for (const invalid of [
      { ...appointmentInput, bikeId: other.bike.id },
      { ...appointmentInput, clientId: other.client.id },
      { ...appointmentInput, parentAppointmentId: other.appointment.id },
      { ...appointmentInput, items: [{ description: "Revisão", serviceTemplateId: other.template.id }] },
    ]) {
      assert.equal((await appointments.action(requestArgs("/api/appointments", "POST", {}, invalid))).status, 404);
    }
    assert.equal((await appointmentDetail.action(requestArgs("/api/appointments", "PUT", {
      appointmentId: String(own.appointment.id),
    }, { bikeId: other.bike.id }))).status, 404);

    const dashboard = await getDashboardData(own.user.id, "mes", now);
    assert.equal(dashboard.metrics.revenue.value, 100);
    assert.equal(dashboard.metrics.receivable.value, 100);
    assert.deepEqual(dashboard.clientsToCall.map(({ id }) => id), [own.reminder.id]);
    assert.ok(dashboard.clientsToCall[0].whatsappUrl?.startsWith("https://wa.me/"));
    assert.equal(dashboard.charts.revenueByMonth.at(-1)?.labor, 100);

    async function markReminder(id: number, status: string) {
      return reminderAction(requestArgs("/dashboard", "POST", {}, new URLSearchParams({
        reminderId: String(id), status,
      })) as Parameters<typeof reminderAction>[0]);
    }
    assert.equal((await markReminder(other.reminder.id, "CONTATADO") as { init: ResponseInit }).init.status, 404);
    assert.deepEqual(await markReminder(own.reminder.id, "CONTATADO"), { error: null });
    const contacted = await prisma.maintenanceReminder.findUniqueOrThrow({ where: { id: own.reminder.id } });
    assert.equal(contacted.status, "CONTATADO");
    assert.ok(contacted.contactedAt);
    assert.deepEqual(await markReminder(own.reminder.id, "AGENDADO"), { error: null });
    assert.equal((await getDashboardData(own.user.id, "mes", now)).clientsToCall.length, 0);

    const digest = (secret: string) => createHash("sha256").update(secret).digest("hex");
    const challenge = await prisma.authToken.create({
      data: {
        userId: own.user.id, type: "2fa_code", tokenHash: digest("123456"),
        expiresAt: new Date(Date.now() + 600_000),
      },
    });
    const challengeCookie = createChallengeCookie(own.user.id, challenge.id, own.user.tokenVersion).split(";")[0];
    const verification = (code: string) =>
      verifyLogin(requestArgs("/login/verify", "POST", {}, new URLSearchParams({ code }), challengeCookie));
    assert.equal(getLoginChallenge(new Request("http://localhost/login/verify", {
      headers: { Cookie: `challenge_uid=${own.user.id}` },
    })), null);
    for (let attempt = 1; attempt < 5; attempt++) await verification("000000");
    assert.ok(await verification("000000") instanceof Response);
    const locked = await prisma.authToken.findUniqueOrThrow({ where: { id: challenge.id } });
    assert.equal(locked.attempts, 5);
    assert.ok(locked.usedAt);

    const rawReset = randomBytes(32).toString("hex");
    await prisma.authToken.create({
      data: { userId: own.user.id, type: "reset_password", tokenHash: digest(rawReset), expiresAt: new Date(Date.now() + 60_000) },
    });
    const resetArgs = () => requestArgs("/reset-password", "POST", {}, new URLSearchParams({
      token: rawReset, password: "SenhaTeste123", confirmPassword: "SenhaTeste123",
    }));
    const emailFetch = mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ messageId: "fixture" }, { status: 201 }),
    );
    try {
      assert.ok(await resetPassword(resetArgs()) instanceof Response);
      assert.equal(emailFetch.mock.callCount(), 1);
      const [url, request] = emailFetch.mock.calls[0].arguments;
      assert.equal(String(url), "https://api.brevo.com/v3/smtp/email");
      const notification = JSON.parse(String(request?.body));
      assert.deepEqual(notification.to, [{ email: own.user.email }]);
      assert.match(notification.subject, /Sua senha foi alterada/);

      const reused = await resetPassword(resetArgs());
      assert.ok(reused && "errors" in reused);
      assert.equal(emailFetch.mock.callCount(), 1);
    } finally {
      emailFetch.mock.restore();
    }
    assert.equal((await clients.loader(requestArgs("/api/clients", "GET"))).status, 401);
    console.log("Dashboard, isolamento da API, lembretes, 2FA e revogação de sessão verificados.");
  } finally {
    await prisma.$disconnect();
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
