import assert from "node:assert/strict";
import { mock } from "node:test";

Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "file:./email-test.sqlite",
  JWT_SECRET: "fixture-only-secret-for-email-tests",
  EMAIL_PROVIDER: "brevo",
  BREVO_API_KEY: "brevo-fixture-key",
  BREVO_SENDER_EMAIL: "verified@example.test",
  BREVO_SENDER_NAME: "Mecânicos Bike Teste",
  RESEND_API_KEY: "resend-fixture-key",
  EMAIL_FROM: "Mecânicos Bike <resend@example.test>",
  RESEND_BASE_URL: "https://api.resend.com",
});

const { sendEmail } = await import("../app/lib/email.server");
const { env } = await import("../app/lib/env.server");
const email = { to: "recipient@example.test", subject: "Código de acesso", html: "<p>123456</p>" };
const fetchMock = mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, _init?: RequestInit) =>
  Response.json({ messageId: "fixture" }, { status: 201 }),
);

try {
  await sendEmail(email);
  const [brevoUrl, brevoRequest] = fetchMock.mock.calls[0].arguments;
  assert.equal(String(brevoUrl), "https://api.brevo.com/v3/smtp/email");
  assert.equal(brevoRequest?.method, "POST");
  assert.equal(new Headers(brevoRequest?.headers).get("api-key"), "brevo-fixture-key");
  assert.deepEqual(JSON.parse(String(brevoRequest?.body)), {
    sender: { email: "verified@example.test", name: "Mecânicos Bike Teste" },
    to: [{ email: email.to }],
    subject: email.subject,
    htmlContent: email.html,
  });

  fetchMock.mock.mockImplementationOnce(async () =>
    Response.json({ message: "private-provider-response" }, { status: 403 }),
  );
  await assert.rejects(sendEmail(email), { message: "Brevo recusou o envio (HTTP 403)." });
  assert.equal(fetchMock.mock.callCount(), 2);

  env.EMAIL_PROVIDER = "resend";
  fetchMock.mock.mockImplementationOnce(async () => Response.json({ id: "fixture" }));
  await sendEmail(email);
  const [resendUrl, resendRequest] = fetchMock.mock.calls[2].arguments;
  assert.equal(String(resendUrl), "https://api.resend.com/emails");
  assert.equal(new Headers(resendRequest?.headers).get("Authorization"), "Bearer resend-fixture-key");
  const resendBody = JSON.parse(String(resendRequest?.body));
  assert.deepEqual(resendBody, { from: "Mecânicos Bike <resend@example.test>", ...email });
} finally {
  fetchMock.mock.restore();
}

console.log("Brevo e Resend: requisições validadas sem envio real.");
