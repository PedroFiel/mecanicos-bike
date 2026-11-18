/**
 * email.server.ts
 *
 * Módulo de envio de e-mail com suporte a Resend (produção) e console (dev).
 *
 * Em produção: defina RESEND_API_KEY no .env e EMAIL_FROM (ex: "Bike <noreply@seudominio.com>")
 * Em desenvolvimento: os e-mails são impressos no console.
 *
 * // Execute: npm install resend
 */

import { env } from "~/lib/env.server";

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envia um e-mail via Resend se RESEND_API_KEY estiver configurada,
 * caso contrário imprime no console (modo dev/fallback).
 * Usa dynamic import para não quebrar a aplicação caso o pacote `resend` ainda não esteja instalado.
 */
export async function sendEmail({ to, subject, html }: EmailParams): Promise<void> {
  if (env.RESEND_API_KEY) {
    try {
      // @ts-expect-error resend pode não estar instalado em ambiente dev
      const { Resend } = await import("resend");
      const resend = new Resend(env.RESEND_API_KEY);
      const from = env.EMAIL_FROM ?? "Mecânicos Bike <noreply@mecanicosbike.com.br>";

      const { error } = await resend.emails.send({ from, to, subject, html });

      if (error) {
        throw new Error(`Falha ao enviar e-mail: ${error.message}`);
      }
    } catch (err: any) {
      console.error("[EMAIL] Erro no envio com Resend, imprimindo no console:", err?.message || err);
      printEmailToConsole({ to, subject, html });
    }
  } else {
    // Modo dev: imprime o e-mail no console
    printEmailToConsole({ to, subject, html });
  }
}

function printEmailToConsole({ to, subject, html }: EmailParams) {
  console.log(
    "\n━━━━━━━━━━━━━━━━ [EMAIL — MODO DEV] ━━━━━━━━━━━━━━━━\n" +
      `Para:     ${to}\n` +
      `Assunto:  ${subject}\n` +
      `─────────────────────────────────────────────────────\n` +
      `${html}\n` +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
  );
}
