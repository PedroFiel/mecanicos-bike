# Fase 5 — Conta demo e entrega

**Branch:** `feat/fase-5-demo` · **Depende de:** Fases 1 e 4

**Objetivo:** uma conta de demonstração com 12 meses de dados realistas, revisão de segurança final e documentação para rodar o projeto. Detalhes em [escopo.md §6](../escopo.md).

## Tarefas de código

### 5.1 Seed (`prisma/seed.ts`)
O `package.json` já tem `"db:seed": "tsx prisma/seed.ts"`, mas o arquivo não existe.

- [ ] Ler `DEMO_PASSWORD` do ambiente; abortar se faltar.
- [ ] Idempotente: apagar a conta `demo@oficina.test` e tudo dela (em ordem: lembretes, itens, atendimentos, bikes, clientes, serviços, tokens), depois recriar.
- [ ] `faker.seed(42)` para dados reproduzíveis; `@faker-js/faker` com locale `pt_BR`.
- [ ] Usuário: `isDemo = true`, `shopName = "Oficina Demo"`, modelo de WhatsApp padrão.
- [ ] Serviços padrão via `seedDefaultServices`.
- [ ] ~40 clientes: nome, CPF válido (gerador próprio com dígito verificador), celular `(11) 9xxxx-xxxx`, alguns sem telefone (para testar o botão desabilitado).
- [ ] ~60 bikes: marcas Caloi, Specialized, Trek, Oggi, Sense, Scott, Soul, Cannondale com modelos reais de cada; tipos MTB / speed / urbana / e-bike; odômetro e horas iniciais.
- [ ] ~300 atendimentos nos últimos 12 meses:
  - peso maior em sexta/sábado e dezembro–março;
  - 1 a 3 itens por atendimento, escolhidos por frequência realista (revisão básica e limpeza mais comuns);
  - peças com valores plausíveis (corrente R$ 80–250, pastilha R$ 40–120, etc.);
  - odômetro/horas crescendo a cada visita da mesma bike;
  - criados pelo mesmo serviço da Fase 3, para gerar lembretes pela regra real.
- [ ] Pagamentos: ~85% `PAGO`, ~10% `PENDENTE`, ~5% `PARCIAL`; formas variadas.
- [ ] ~15 atendimentos encadeados (`CONTINUACAO` e `GARANTIA`).
- [ ] Ajuste final: garantir ao menos 5 lembretes vencidos, 5 vencendo nos próximos 7 dias e alguns já `CONTATADO`.
- [ ] Imprimir resumo ao final (quantidades criadas).

### 5.2 Conta demo
- [ ] `isDemo` pula o 2FA (já previsto na Fase 1); confirmar.
- [ ] Banner discreto "Conta de demonstração" no layout quando `isDemo`.

### 5.3 Revisão final
- [ ] Rodar `/security-review` na branch e corrigir o que for apontado.
- [ ] Teste de isolamento: script que cria duas oficinas e tenta ler/editar/apagar recursos cruzados por todas as rotas `/api/*` — todas devem responder 404.
- [ ] `npm run typecheck` e `npm run build` sem erros.

### 5.4 Documentação
- [ ] Atualizar `README.md`: requisitos, `.env.example`, como rodar migrations (local e Turso), como rodar o seed, credenciais da demo (e-mail; a senha fica no `.env`), visão geral das funcionalidades.
- [ ] Marcar este plano como concluído em [README do plano](../README.md).

## Tarefas externas
- [ ] Definir `DEMO_PASSWORD`.
- [ ] Se a demo for apresentada online: rodar o seed apontando para o Turso de produção.

## Testes / verificação
- [ ] `npm run db:seed` duas vezes seguidas não duplica dados.
- [ ] Login com a conta demo entra direto (sem código) e o dashboard aparece completo.
- [ ] Lista "Clientes para chamar" tem itens vencidos e da semana.

## Pronto quando
Entrar com a conta demo mostra o dashboard inteiro preenchido, com clientes para chamar nesta semana, e a revisão de segurança não tem pendências.
