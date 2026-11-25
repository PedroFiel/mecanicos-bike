/**
 * Preenche uma conta EXISTENTE do banco de produção (Turso) com os dados de demonstração.
 *
 *   npm run db:seed:account -- <email>             # mostra o que seria feito, sem gravar
 *   npm run db:seed:account -- <email> --gravar    # grava no Turso
 *   npm run db:seed:account -- <email> --remover   # remove só os dados de demonstração
 *
 * Nada que a pessoa cadastrou é apagado: os clientes criados levam a marca SEED_NOTE nas
 * observações, e rodar de novo substitui apenas esses clientes (com bikes, atendimentos e
 * lembretes deles). Senha, e-mail e configurações da conta não mudam.
 *
 * Os dados são gerados num SQLite temporário (rápido) com os mesmos ids que terão em produção
 * e enviados ao Turso num único lote atômico, sem segurar uma transação longa no banco.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { createClient, type Client, type InStatement, type InValue } from "@libsql/client";

const SEED_NOTE = "[demonstração] Cliente gerado pelo seed da apresentação.";
const TABLES = ["clients", "bikes", "appointments", "appointment_items", "maintenance_reminders"] as const;

const [email, flag] = process.argv.slice(2);
const mode = flag === "--gravar" ? "gravar" : flag === "--remover" ? "remover" : "simular";
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;
if (!email) throw new Error("Uso: npm run db:seed:account -- <email> [--gravar | --remover]");
if (!tursoUrl) throw new Error("Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no .env.");

const remote = createClient({ url: tursoUrl, authToken: tursoToken });

/** Comandos que removem os dados de demonstração já existentes da conta. */
function removeSeededStatements(userId: number): InStatement[] {
  const seededClients = `SELECT id FROM clients WHERE userId = ${userId} AND notes = ?`;
  const seededAppointments = `SELECT id FROM appointments WHERE clientId IN (${seededClients})`;
  return [
    { sql: `DELETE FROM maintenance_reminders WHERE appointmentItemId IN (SELECT id FROM appointment_items WHERE appointmentId IN (${seededAppointments}))`, args: [SEED_NOTE] },
    { sql: `DELETE FROM maintenance_reminders WHERE bikeId IN (SELECT id FROM bikes WHERE clientId IN (${seededClients}))`, args: [SEED_NOTE] },
    { sql: `DELETE FROM appointment_items WHERE appointmentId IN (${seededAppointments})`, args: [SEED_NOTE] },
    { sql: `UPDATE appointments SET parentAppointmentId = NULL, linkType = NULL WHERE parentAppointmentId IN (${seededAppointments})`, args: [SEED_NOTE] },
    { sql: `DELETE FROM appointments WHERE clientId IN (${seededClients})`, args: [SEED_NOTE] },
    { sql: `DELETE FROM bikes WHERE clientId IN (${seededClients})`, args: [SEED_NOTE] },
    { sql: `DELETE FROM clients WHERE userId = ${userId} AND notes = ?`, args: [SEED_NOTE] },
  ];
}

async function countSeeded(db: Client, userId: number) {
  const row = (await db.execute({ sql: "SELECT count(*) AS n FROM clients WHERE userId = ? AND notes = ?", args: [userId, SEED_NOTE] })).rows[0];
  return Number(row.n);
}

/** Gera os dados num SQLite temporário, com ids a partir dos maiores ids de produção. */
async function generate(user: Record<string, InValue>, templates: Record<string, InValue>[], startIds: Record<string, number>) {
  const directory = await mkdtemp(join(tmpdir(), "mecanicos-bike-seed-"));
  const filename = join(directory, "seed.sqlite");
  const localUrl = `file:${filename.split(sep).join("/")}`;
  await writeFile(filename, "");
  try {
    // O app passa a usar o SQLite temporário pelo mesmo adaptador libSQL da produção,
    // para as datas ficarem no mesmo formato (texto ISO) que o Turso guarda.
    // O Turso de verdade fica só no cliente "remote".
    process.env.TURSO_DATABASE_URL = localUrl;
    delete process.env.TURSO_AUTH_TOKEN;
    process.env.DATABASE_URL = localUrl;
    const cli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
    execFileSync(process.execPath, [cli, "db", "push", "--skip-generate"], {
      env: { ...process.env, DATABASE_URL: localUrl }, stdio: "ignore",
    });

    const local = createClient({ url: localUrl });
    const insert = (table: string, row: Record<string, InValue>) => {
      const columns = Object.keys(row);
      return local.execute({
        sql: `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        args: columns.map((c) => row[c]),
      });
    };
    await insert("users", user);
    for (const template of templates) await insert("service_templates", template);
    for (const table of TABLES) {
      await local.execute({ sql: `INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)`, args: [table, startIds[table]] });
    }

    const { default: prisma } = await import("./prisma");
    const { populateShop } = await import("./demo-data");
    const summary = await prisma.$transaction(
      (tx) => populateShop(tx, Number(user.id), { now: new Date(), clientNote: SEED_NOTE }),
      { timeout: 300_000 },
    );
    await prisma.$disconnect();

    const rows: Record<string, Record<string, InValue>[]> = {};
    for (const table of TABLES) {
      const result = await local.execute(`SELECT * FROM "${table}" ORDER BY id`);
      rows[table] = result.rows.map((row) => Object.fromEntries(result.columns.map((column) => [column, row[column] as InValue])));
    }
    local.close();
    return { summary, rows };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** INSERTs de várias linhas por comando, na ordem que respeita as chaves estrangeiras. */
function insertStatements(rows: Record<string, Record<string, InValue>[]>): InStatement[] {
  const statements: InStatement[] = [];
  for (const table of TABLES) {
    // Atendimento pai vem antes do filho (ids crescentes) — a FK de parentAppointmentId é satisfeita
    const list = rows[table];
    for (let start = 0; start < list.length; start += 50) {
      const chunk = list.slice(start, start + 50);
      const columns = Object.keys(chunk[0]);
      statements.push({
        sql: `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES ${chunk
          .map(() => `(${columns.map(() => "?").join(", ")})`).join(", ")}`,
        args: chunk.flatMap((row) => columns.map((c) => row[c])),
      });
    }
  }
  return statements;
}

try {
  const user = (await remote.execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email.trim().toLowerCase()] })).rows[0];
  if (!user) throw new Error(`Nenhuma conta com o e-mail ${email}. Cadastre a conta pelo app antes.`);
  const userId = Number(user.id);
  const existing = await countSeeded(remote, userId);
  console.log(`Conta #${userId} (${user.name}). Clientes de demonstração já existentes: ${existing}.`);

  if (mode === "remover") {
    await remote.batch(removeSeededStatements(userId), "write");
    console.log(`Dados de demonstração removidos. Restam ${await countSeeded(remote, userId)}.`);
  } else {
    const templateResult = await remote.execute({ sql: "SELECT * FROM service_templates WHERE userId = ? ORDER BY id", args: [userId] });
    const templates = templateResult.rows.map((row) => Object.fromEntries(templateResult.columns.map((c) => [c, row[c] as InValue])));
    const keys = new Set(templates.map((template) => template.key));
    for (const key of ["revisao-basica", "limpeza-lubrificacao-transmissao", "regulagem-cambio"]) {
      if (!keys.has(key)) throw new Error(`A conta não tem o serviço padrão "${key}". Use "Restaurar padrões" em Configurações.`);
    }

    const startIds: Record<string, number> = {};
    for (const table of TABLES) {
      startIds[table] = Number((await remote.execute(`SELECT coalesce(max(id), 0) AS id FROM "${table}"`)).rows[0].id);
    }
    const userRow = Object.fromEntries(Object.keys(user).map((column) => [column, user[column] as InValue]));
    const { summary, rows } = await generate(userRow, templates, startIds);
    console.table(summary);

    if (mode === "simular") {
      console.log("Simulação: nada foi gravado. Rode de novo com --gravar para enviar ao Turso.");
    } else {
      // Remove os dados de demonstração anteriores e insere os novos no mesmo lote atômico
      await remote.batch([...removeSeededStatements(userId), ...insertStatements(rows)], "write");
      const check = await remote.execute("PRAGMA foreign_key_check");
      console.log(`Gravado no Turso. Clientes de demonstração na conta: ${await countSeeded(remote, userId)}.`);
      if (check.rows.length) console.warn("Atenção: foreign_key_check encontrou problemas:", check.rows);
    }
  }
} finally {
  remote.close();
}
