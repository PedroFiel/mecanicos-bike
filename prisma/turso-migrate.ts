/**
 * Aplica as migrations SQL no banco de produção (Turso), sem precisar do CLI do Turso.
 *
 *   npm run db:turso -- status
 *   npm run db:turso -- backup                  # salva todas as tabelas em backups/<data>.json
 *   npm run db:turso -- apply                   # aplica as migrations pendentes (exceto as marcadas como pós-deploy)
 *   npm run db:turso -- apply --pos-deploy      # inclui as migrations que só podem rodar depois do deploy
 *   npm run db:turso -- mark <migration>        # registra uma migration já aplicada à mão
 *
 * Usa TURSO_DATABASE_URL e TURSO_AUTH_TOKEN do ambiente (ou do .env).
 * As migrations aplicadas ficam registradas na tabela _manual_migrations.
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MIGRATIONS_DIR = join("prisma", "migrations");
// Migrations que dependem do código novo já publicado (o código anterior ainda usa o que elas removem)
const POST_DEPLOY = new Set(["20261120000000_remove_service_details"]);
// Histórico anterior ao controle manual: já existe em produção
const BASELINE = new Set(["20251031000841_init", "20251031005444_init"]);

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Defina TURSO_DATABASE_URL (e TURSO_AUTH_TOKEN) no ambiente ou no .env.");
  process.exit(1);
}
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

async function ensureTable() {
  await db.execute(`CREATE TABLE IF NOT EXISTS "_manual_migrations" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}

async function applied() {
  const rows = await db.execute(`SELECT "name" FROM "_manual_migrations"`);
  return new Set(rows.rows.map((row) => String(row.name)));
}

async function migrations() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    .filter((name) => !BASELINE.has(name));
}

async function tables() {
  const rows = await db.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name`,
  );
  return rows.rows.map((row) => String(row.name));
}

async function status() {
  await ensureTable();
  const done = await applied();
  console.log("Tabelas:", (await tables()).join(", "));
  for (const name of await migrations()) {
    const flag = done.has(name) ? "aplicada" : POST_DEPLOY.has(name) ? "pendente (pós-deploy)" : "pendente";
    console.log(`  ${flag.padEnd(22)} ${name}`);
  }
}

async function backup() {
  const dump: Record<string, unknown[]> = {};
  for (const table of await tables()) {
    dump[table] = (await db.execute(`SELECT * FROM "${table}"`)).rows;
  }
  await mkdir("backups", { recursive: true });
  const file = join("backups", `turso-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(file, JSON.stringify(dump, (_key, value) => typeof value === "bigint" ? Number(value) : value, 2));
  console.log(`Backup salvo em ${file} (${Object.entries(dump).map(([table, rows]) => `${table}: ${rows.length}`).join(", ")})`);
}

async function apply(includePostDeploy: boolean) {
  await ensureTable();
  const done = await applied();
  const pending = (await migrations()).filter((name) => !done.has(name) && (includePostDeploy || !POST_DEPLOY.has(name)));
  if (!pending.length) {
    console.log("Nenhuma migration pendente.");
    return;
  }
  for (const name of pending) {
    const sql = await readFile(join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
    process.stdout.write(`Aplicando ${name}... `);
    await db.executeMultiple(sql);
    await db.execute({ sql: `INSERT INTO "_manual_migrations" ("name") VALUES (?)`, args: [name] });
    console.log("ok");
  }
  const check = await db.execute("PRAGMA foreign_key_check");
  if (check.rows.length) console.warn("Atenção: PRAGMA foreign_key_check encontrou problemas:", check.rows);
}

async function mark(name?: string) {
  if (!name || !(await migrations()).includes(name)) throw new Error("Informe o nome de uma migration existente.");
  await ensureTable();
  await db.execute({ sql: `INSERT OR IGNORE INTO "_manual_migrations" ("name") VALUES (?)`, args: [name] });
  console.log(`${name} registrada como aplicada.`);
}

const [command, argument] = process.argv.slice(2);
try {
  if (command === "status") await status();
  else if (command === "backup") await backup();
  else if (command === "apply") await apply(argument === "--pos-deploy");
  else if (command === "mark") await mark(argument);
  else {
    console.log("Uso: npm run db:turso -- status | backup | apply [--pos-deploy] | mark <migration>");
    process.exitCode = 1;
  }
} finally {
  db.close();
}
