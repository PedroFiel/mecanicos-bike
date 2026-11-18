-- Fase 0: CPF único por oficina (em vez de único no banco inteiro)
--
-- Remove o índice UNIQUE global no cpf da tabela clients e cria um
-- índice composto (userId, cpf), permitindo que duas oficinas distintas
-- atendam o mesmo cliente sem conflito.
--
-- Como aplicar no Turso (produção):
--   turso db shell <nome-do-banco> < prisma/migrations/20261118000000_fase0_cpf_por_oficina/migration.sql

-- Passo 1: Remover o índice único global existente no CPF
DROP INDEX IF EXISTS "clients_cpf_key";

-- Passo 2: Criar o índice único composto por oficina
-- Nota: NULL não é considerado igual ao NULL em SQLite, portanto clientes
-- sem CPF (NULL) nunca conflitam entre si, mesmo dentro da mesma oficina.
CREATE UNIQUE INDEX "clients_userId_cpf_key" ON "clients"("userId", "cpf");
