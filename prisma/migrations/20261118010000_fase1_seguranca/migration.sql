-- Migration: fase1_seguranca
-- Adiciona campos de segurança ao model User e cria tabelas AuthToken e SecurityEvent

-- Novos campos na tabela users
ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "lockedUntil" DATETIME;
ALTER TABLE "users" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT 0;

-- Tabela auth_tokens
CREATE TABLE "auth_tokens" (
    "id"        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId"    INTEGER NOT NULL,
    "type"      TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt"    DATETIME,
    "attempts"  INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela security_events
CREATE TABLE "security_events" (
    "id"        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId"    INTEGER,
    "type"      TEXT NOT NULL,
    "ip"        TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
