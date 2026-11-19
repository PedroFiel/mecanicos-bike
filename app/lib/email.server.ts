import { Resend } from "resend";
import { env } from "~/lib/env.server";

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<void> {
  if (env.EMAIL_PROVIDER === "brevo") {
    const apiKey = env.BREVO_API_KEY;
    const senderEmail = env.BREVO_SENDER_EMAIL;
    if (!apiKey || !senderEmail) throw new Error("Configuração do Brevo incompleta.");

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: env.BREVO_SENDER_NAME || "Mecânicos Bike" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new Error(`Brevo recusou o envio (HTTP ${response.status}).`);
    return;
  }

  if (env.RESEND_API_KEY) {
    const resend = new Resend(env.RESEND_API_KEY);
    const from = env.EMAIL_FROM ?? "Mecânicos Bike <noreply@mecanicosbike.com.br>";
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) throw new Error(`Falha ao enviar e-mail: ${error.message}`);
    return;
  }

  if (env.NODE_ENV === "production") throw new Error("RESEND_API_KEY não configurada.");
  console.log("[EMAIL — MODO DEV]", { to, subject, html });
}
