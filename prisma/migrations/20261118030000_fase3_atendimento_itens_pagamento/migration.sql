-- Migration: 20261118030000_fase3_atendimento_itens_pagamento
-- Adiciona campos de pagamento, telemetria e vínculo a appointments;
-- Cria tabelas appointment_items e maintenance_reminders;
-- Migra dados existentes de totalCost e service_details;
-- Remove service_details.

-- 1. Novos campos em appointments
ALTER TABLE "appointments" ADD COLUMN "odometerKm" REAL;
ALTER TABLE "appointments" ADD COLUMN "usageHours" REAL;
ALTER TABLE "appointments" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE "appointments" ADD COLUMN "amountPaid" REAL NOT NULL DEFAULT 0;
ALTER TABLE "appointments" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "appointments" ADD COLUMN "paidAt" DATETIME;
ALTER TABLE "appointments" ADD COLUMN "parentAppointmentId" INTEGER;
ALTER TABLE "appointments" ADD COLUMN "linkType" TEXT;

-- 2. Criação da tabela appointment_items
CREATE TABLE "appointment_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "appointmentId" INTEGER NOT NULL,
    "serviceTemplateId" INTEGER,
    "description" TEXT NOT NULL,
    "laborCost" REAL NOT NULL DEFAULT 0,
    "partsDescription" TEXT,
    "partsCost" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "appointment_items_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointment_items_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "service_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 3. Criação da tabela maintenance_reminders
CREATE TABLE "maintenance_reminders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "bikeId" INTEGER NOT NULL,
    "appointmentItemId" INTEGER NOT NULL UNIQUE,
    "serviceTemplateId" INTEGER NOT NULL,
    "dueDate" DATETIME,
    "dueKm" REAL,
    "dueHours" REAL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "contactedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "maintenance_reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "maintenance_reminders_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "bikes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "maintenance_reminders_appointmentItemId_fkey" FOREIGN KEY ("appointmentItemId") REFERENCES "appointment_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "maintenance_reminders_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "service_templates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "maintenance_reminders_userId_status_dueDate_idx" ON "maintenance_reminders"("userId", "status", "dueDate");

-- 4. Migração de dados existentes:
-- 4.1 Copia registros existentes de service_details para appointment_items (se houver)
INSERT INTO "appointment_items" ("appointmentId", "description", "laborCost", "partsDescription", "partsCost")
SELECT "appointmentId", COALESCE("workDone", 'Serviço'), COALESCE("cost", 0), "partReplaced", 0
FROM "service_details";

-- 4.2 Para atendimentos que tinham totalCost > 0 e não tinham service_details, cria item "Serviço avulso"
INSERT INTO "appointment_items" ("appointmentId", "description", "laborCost", "partsDescription", "partsCost")
SELECT a.id, 'Serviço avulso', COALESCE(a."totalCost", 0), NULL, 0
FROM "appointments" a
WHERE a."totalCost" > 0
  AND NOT EXISTS (SELECT 1 FROM "service_details" sd WHERE sd."appointmentId" = a.id);

-- 4.3 Atendimentos CONCLUIDO antigos passam a ter paymentStatus = 'PAGO' e amountPaid = totalCost
UPDATE "appointments"
SET "paymentStatus" = 'PAGO',
    "amountPaid" = COALESCE("totalCost", 0),
    "paidAt" = "serviceDate"
WHERE "status" = 'CONCLUIDO' AND "totalCost" > 0;

-- 5. Remoção da tabela legada service_details
DROP TABLE IF EXISTS "service_details";
