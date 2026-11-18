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

import { z } from "zod";

const envSchema = z.object({
  // Banco de dados
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),

  // JWT — mínimo 32 caracteres para garantir segurança mínima
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),

  // Resend (e-mail) — opcional: sem a chave, o app usa fallback para console
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

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

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
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

export type Env = typeof env;
