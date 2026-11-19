-- Normaliza dados já cadastrados para as regras novas:
-- e-mail em minúsculas (o login passou a comparar assim), CPF e telefone só com dígitos.

-- 1. E-mails em minúsculas e sem espaços.
--    Falha de propósito (índice único) se existirem dois cadastros que só diferem
--    por maiúsculas/minúsculas: nesse caso, resolva manualmente antes de aplicar.
UPDATE "users" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));

-- 2. Telefone de clientes e usuários só com dígitos (vazio vira NULL)
UPDATE "clients"
SET "phone" = NULLIF(replace(replace(replace(replace(replace(replace(trim("phone"), '(', ''), ')', ''), '-', ''), ' ', ''), '.', ''), '+', ''), '')
WHERE "phone" IS NOT NULL;
UPDATE "users"
SET "phone" = NULLIF(replace(replace(replace(replace(replace(replace(trim("phone"), '(', ''), ')', ''), '-', ''), ' ', ''), '.', ''), '+', ''), '')
WHERE "phone" IS NOT NULL;

-- 3. CPF vazio vira NULL (NULL nunca conflita no índice único)
UPDATE "clients" SET "cpf" = NULL WHERE "cpf" IS NOT NULL AND trim("cpf") = '';

-- 4. CPF só com dígitos, exceto quando isso colidiria com outro cliente da mesma oficina
--    (esses casos ficam como estão para o mecânico revisar).
UPDATE "clients"
SET "cpf" = replace(replace(replace(trim("cpf"), '.', ''), '-', ''), ' ', '')
WHERE "cpf" IS NOT NULL
  AND "cpf" <> replace(replace(replace(trim("cpf"), '.', ''), '-', ''), ' ', '')
  AND NOT EXISTS (
    SELECT 1 FROM "clients" AS "other"
    WHERE "other"."userId" = "clients"."userId"
      AND "other"."id" <> "clients"."id"
      AND replace(replace(replace(trim("other"."cpf"), '.', ''), '-', ''), ' ', '')
        = replace(replace(replace(trim("clients"."cpf"), '.', ''), '-', ''), ' ', '')
  );
