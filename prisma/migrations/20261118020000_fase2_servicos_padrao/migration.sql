-- Migration: 20261118020000_fase2_servicos_padrao
-- Adiciona colunas na tabela users e bikes, cria a tabela service_templates
-- e popula os 18 serviços padrão para todos os usuários existentes.

-- 1. Novos campos na tabela users
ALTER TABLE "users" ADD COLUMN "shopName" TEXT;
ALTER TABLE "users" ADD COLUMN "whatsappTemplate" TEXT;

-- 2. Novos campos na tabela bikes
ALTER TABLE "bikes" ADD COLUMN "type" TEXT;
ALTER TABLE "bikes" ADD COLUMN "currentOdometerKm" REAL;
ALTER TABLE "bikes" ADD COLUMN "currentHours" REAL;

-- 3. Criação da tabela service_templates
CREATE TABLE "service_templates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "key" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "defaultLaborCost" REAL NOT NULL,
    "estimatedMinutes" INTEGER,
    "intervalMonths" INTEGER,
    "intervalKm" REAL,
    "intervalHours" REAL,
    "active" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "service_templates_userId_idx" ON "service_templates"("userId");

-- 4. Inserir os 18 serviços padrão para os usuários existentes
INSERT INTO "service_templates" ("userId", "key", "name", "category", "defaultLaborCost", "estimatedMinutes", "intervalMonths", "intervalKm", "intervalHours", "active")
SELECT id, 'revisao-basica', 'Revisão básica (limpeza + regulagens)', 'Revisão', 120.0, 60, 4, 1500.0, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'revisao-completa', 'Revisão completa', 'Revisão', 260.0, 180, 12, 5000.0, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'revisao-completa-ebike', 'Revisão completa e-bike', 'Revisão', 490.0, 240, 12, 5000.0, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'regulagem-cambio', 'Regulagem de câmbio', 'Transmissão', 60.0, 20, NULL, NULL, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'regulagem-freio', 'Regulagem de freio', 'Freios', 60.0, 20, NULL, NULL, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'limpeza-lubrificacao-transmissao', 'Limpeza e lubrificação da transmissão', 'Transmissão', 70.0, 40, 2, 800.0, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'troca-corrente', 'Troca de corrente', 'Transmissão', 30.0, 15, 12, 3000.0, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'troca-cassete-coroas', 'Troca de cassete / coroas', 'Transmissão', 40.0, 30, 24, 9000.0, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'troca-cabos-conduites', 'Troca de cabos e conduítes', 'Transmissão', 60.0, 45, 12, NULL, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'sangria-freio-hidraulico', 'Sangria de freio hidráulico (por freio)', 'Freios', 65.0, 30, 12, NULL, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'troca-pastilhas-sapatas', 'Troca de pastilhas / sapatas', 'Freios', 40.0, 20, 6, 2000.0, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'manutencao-suspensao-50h', 'Manutenção de suspensão 50h', 'Suspensão', 150.0, 60, 6, NULL, 50.0, 1 FROM "users"
UNION ALL
SELECT id, 'revisao-completa-suspensao', 'Revisão completa de suspensão (troca de óleo)', 'Suspensão', 230.0, 120, 12, NULL, 200.0, 1 FROM "users"
UNION ALL
SELECT id, 'revisao-balanca', 'Revisão da balança (full suspension)', 'Suspensão', 140.0, 90, 12, NULL, 100.0, 1 FROM "users"
UNION ALL
SELECT id, 'revisao-cubos', 'Revisão de cubos (por roda)', 'Rodas', 45.0, 30, 12, NULL, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'lubrificacao-movimento-central', 'Lubrificação do movimento central', 'Rodas', 50.0, 30, 12, NULL, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'centragem-roda', 'Centragem de roda', 'Rodas', 50.0, 30, NULL, NULL, NULL, 1 FROM "users"
UNION ALL
SELECT id, 'reposicao-selante-tubeless', 'Reposição de selante tubeless', 'Rodas', 40.0, 20, 4, NULL, NULL, 1 FROM "users";
