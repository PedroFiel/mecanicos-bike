# Fase 4 — Dashboard e WhatsApp

**Branch:** `feat/fase-4-dashboard` · **Depende de:** Fase 3

**Objetivo:** substituir o dashboard de template (dados de `app/dashboard/data.json`) por indicadores reais e uma lista de clientes para chamar com botão de WhatsApp. Detalhes em [escopo.md §5](../escopo.md).

## Tarefas de código

### 4.1 Consultas
- [ ] `app/services/dashboard.server.ts` — todas filtradas por `userId`, recebendo `{ from, to }`:
  - `getKpis` → faturamento, ticket médio, a receber, em aberto, revisões vencendo, retorno de clientes, retrabalho — período atual e anterior;
  - `getRevenueByMonth` (12 meses, mão de obra x peças);
  - `getTopServices` (top 8 por quantidade);
  - `getAppointmentsByWeekday`;
  - `getTopBikeBrands` (top 8);
  - `getPaymentBreakdown`;
  - `getPendingPayments`, `getStalledAppointments` (pendentes há > 7 dias);
  - `getClientsToContact` (usa `listDueReminders` da Fase 3, 15 dias).
- [ ] Agregações por mês e dia da semana feitas em TypeScript sobre consultas enxutas (SQLite tem funções de data limitadas no Prisma); revisar desempenho com o seed da Fase 5.

### 4.2 Rota
- [ ] `app/routes/dashboard.tsx`: `loader` com `requireAuth`, lê `?periodo=` (`mes`, `trimestre`, `ano`), chama as consultas em paralelo (`Promise.all`).
- [ ] Remover `app/dashboard/data.json` e componentes de template sem uso (`data-table.tsx`, `chart-area-interactive.tsx`, `section-cards.tsx` — substituídos).

### 4.3 Componentes (`app/features/dashboard/components/`)
- [ ] `kpi-cards.tsx` — 6 cards com variação % e seta.
- [ ] `period-filter.tsx` — `ToggleGroup` (já existe).
- [ ] `revenue-chart.tsx` — barras empilhadas.
- [ ] `top-services-chart.tsx`, `weekday-chart.tsx`, `brands-chart.tsx` — barras.
- [ ] `payment-breakdown.tsx` — barra de proporção.
- [ ] `clients-to-contact.tsx` — tabela com urgência (vencido em vermelho, ≤ 7 dias em amarelo), critério, botão WhatsApp e menu de status (agendado / dispensado).
- [ ] `pending-payments.tsx` e `stalled-appointments.tsx` — listas com link para o atendimento.
- [ ] Estados vazios com orientação ("Cadastre o primeiro atendimento…").

### 4.4 WhatsApp
- [ ] `app/lib/whatsapp.ts`:
  - `normalizePhoneBR(phone)` → só dígitos, adiciona 55, valida 12–13 dígitos; retorna `null` se inválido;
  - `renderTemplate(template, vars)` → substitui `{cliente}`, `{bike}`, `{servico}`, `{oficina}`, `{data_ultimo}`;
  - `buildWhatsAppLink(phone, message)` → `https://wa.me/<num>?text=<encodeURIComponent>`.
- [ ] Testes de `normalizePhoneBR` (com/sem DDD, com máscara, fixo, celular).
- [ ] Clique no botão: abre o link em nova aba e envia `fetcher.submit` para marcar o lembrete como `CONTATADO`.
- [ ] Cliente sem telefone válido: botão desabilitado, tooltip "Cadastrar telefone", link para editar cliente.

## Tarefas externas
- Nenhuma.

## Testes / verificação
- [ ] Com a conta demo (Fase 5), todos os cards e gráficos aparecem preenchidos.
- [ ] Conta nova sem dados mostra estados vazios, sem erro.
- [ ] Faturamento do card bate com a soma manual dos atendimentos do mês.
- [ ] Botão abre o WhatsApp com nome, bike e serviço corretos.
- [ ] Após clicar, o lembrete sai de "Abertos" e aparece como "Contatado".
- [ ] Dashboard de uma oficina não mostra nada de outra.

## Pronto quando
O dashboard só mostra dados do banco e o botão abre o WhatsApp com a mensagem certa.
