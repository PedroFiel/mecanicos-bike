import assert from "node:assert/strict";

// Configuração de e-mail incompleta não pode derrubar o app: só o envio falha.
Object.assign(process.env, {
  NODE_ENV: "production",
  DATABASE_URL: "file:./email-config-test.sqlite",
  JWT_SECRET: "fixture-only-secret-for-email-config-tests",
  EMAIL_PROVIDER: "brevo",
  BREVO_API_KEY: "brevo-fixture-key",
  BREVO_SENDER_EMAIL: "",
});

const { emailConfigError } = await import("../app/lib/env.server");
const { sendEmail } = await import("../app/lib/email.server");

assert.match(emailConfigError ?? "", /BREVO_SENDER_EMAIL/);
await assert.rejects(
  sendEmail({ to: "recipient@example.test", subject: "Teste", html: "<p>x</p>" }),
  /Configuração do Brevo incompleta: BREVO_SENDER_EMAIL/,
);

console.log("Configuração de e-mail incompleta: app sobe e o envio informa o motivo.");
