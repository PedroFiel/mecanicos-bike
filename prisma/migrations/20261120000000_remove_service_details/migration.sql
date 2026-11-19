-- Remove a tabela legada service_details.
-- Aplicar SÓ DEPOIS do deploy do código desta versão: o código anterior ainda lê essa tabela,
-- e os dados dela já foram copiados para appointment_items na migration da fase 3.
DROP TABLE IF EXISTS "service_details";
