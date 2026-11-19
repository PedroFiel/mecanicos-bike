/**
 * env.server.ts
 *
 * Valida as variáveis de ambiente obrigatórias na inicialização do servidor.
 * Se alguma estiver ausente ou inválida, o app falha imediatamente com mensagem
 * clara — melhor do que falhas silenciosas em tempo de requisição.
 *
 * Importar este módulo no entry.server.tsx para garantir a validação antes
 * de qualquer requisição ser processada.
 */

import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Banco de dados
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),

  // JWT — mínimo 32 caracteres para garantir segurança mínima
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),

  EMAIL_PROVIDER: z.enum(["resend", "brevo"]).default("resend"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  BREVO_API_KEY: z.string().trim().optional(),
  BREVO_SENDER_EMAIL: z.string().trim().optional(),
  BREVO_SENDER_NAME: z.string().trim().optional(),

  // URL pública da aplicação — opcional em desenvolvimento
  APP_URL: z.string().url("APP_URL deve ser uma URL válida").optional(),

  // Conta demo — opcional: necessária apenas ao rodar o seed
  DEMO_PASSWORD: z.string().optional(),

  // Turso (produção) — opcionais em desenvolvimento local
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),

  // Ambiente Node
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Problemas na configuração de e-mail não derrubam o app (o resto do sistema funciona);
 * o envio falha com esta mensagem e ela aparece no log ao iniciar.
 */
function checkEmailConfig(config: z.infer<typeof envSchema>): string | null {
  if (config.EMAIL_PROVIDER === "brevo") {
    const missing = [
      !config.BREVO_API_KEY && "BREVO_API_KEY",
      !z.email().safeParse(config.BREVO_SENDER_EMAIL).success && "BREVO_SENDER_EMAIL (e-mail verificado no Brevo)",
    ].filter(Boolean);
    return missing.length ? `Configuração do Brevo incompleta: ${missing.join(", ")}.` : null;
  }
  if (config.NODE_ENV === "production" && !config.RESEND_API_KEY) {
    return "RESEND_API_KEY não configurada (ou use EMAIL_PROVIDER=brevo).";
  }
  return null;
}

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `  • ${e.path.join(".")}: ${e.message}`)
      .join("\n");

    throw new Error(
      `\n\n❌ Variáveis de ambiente inválidas ou ausentes:\n${errors}\n\n` +
        `Copie o arquivo .env.example para .env e preencha os valores.\n`
    );
  }

  return result.data;
}

export const env = validateEnv();

export const emailConfigError = checkEmailConfig(env);
if (emailConfigError) console.error(`[e-mail] ${emailConfigError} Os e-mails não serão enviados.`);
if (env.NODE_ENV === "production" && !env.APP_URL) {
  console.error("[e-mail] APP_URL não configurada: os links de redefinição de senha apontarão para localhost.");
}

export type Env = typeof env;
