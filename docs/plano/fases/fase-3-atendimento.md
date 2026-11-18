# Fase 3 — Atendimento, pagamento, lembretes e retornos

**Branch:** `feat/fase-3-atendimento` · **Depende de:** Fase 2 · **Destrava:** Fase 4

**Objetivo:** o atendimento passa a ter itens baseados nos serviços padrão, gera lembretes de revisão, controla pagamento e pode ser ligado a um atendimento anterior. Detalhes em [escopo.md §4](../escopo.md).

## Tarefas de código

### 3.1 Banco
- [ ] Migration `atendimento_itens_pagamento`:
  - tabelas `AppointmentItem`, `MaintenanceReminder`; enums `PaymentStatus`, `PaymentMethod`, `AppointmentLinkType`, `ReminderStatus`;
  - campos novos em `Appointment` (`odometerKm`, `usageHours`, `paymentStatus`, `amountPaid`, `paymentMethod`, `paidAt`, `parentAppointmentId`, `linkType`);
  - migração de dados: `totalCost` → item "Serviço avulso"; `ServiceDetail` → `AppointmentItem`; atendimentos `CONCLUIDO` antigos ficam `PAGO`;
  - remover tabela `service_details`.

### 3.2 Regras de negócio
- [ ] `app/services/appointments.server.ts`:
  - `createAppointment` / `updateAppointment` recebem `items[]` e rodam em **transação**: salva atendimento, recria itens, recalcula `totalCost`, atualiza odômetro/horas da bike, sincroniza lembretes;
  - valida que `parentAppointmentId` pertence à mesma bike e à mesma oficina e é anterior;
  - `markAsPaid(id, userId, { method, amount })`.
- [ ] `app/services/reminders.server.ts`:
  - `computeDue(serviceTemplate, appointment)` → `{ dueDate, dueKm, dueHours }` (`dueDate = serviceDate + intervalMonths`; `dueKm = odometerKm + intervalKm` quando houver odômetro; idem horas);
  - `syncRemindersForAppointment(tx, appointment)` → cria lembrete para cada item com intervalo e fecha (`CONCLUIDO`) lembretes abertos do mesmo serviço na mesma bike com data anterior;
  - `listDueReminders(userId, { withinDays })` → vencidos ou vencendo; considera vencido por km/horas quando `bike.currentOdometerKm >= dueKm` ou `bike.currentHours >= dueHours`;
  - `updateReminderStatus(id, userId, status)`.
- [ ] Função pura e testável `isReminderDue(reminder, bike, today, withinDays)` com testes para cada critério.

### 3.3 Validação
- [ ] `app/features/appointments/types.ts`: schema de item (descrição, mão de obra ≥ 0, peças ≥ 0, `serviceTemplateId` opcional), pagamento, vínculo; mínimo 1 item.

### 3.4 Telas
- [ ] `app/features/appointments/components/appointment-form.tsx`:
  - bloco **Itens**: adicionar serviço padrão (select com busca por categoria) ou item livre; mão de obra pré-preenchida e editável; peças (descrição + valor); remover item; total ao vivo;
  - campos **Odômetro (km)** e **Horas de uso**, pré-preenchidos com os valores atuais da bike;
  - bloco **Pagamento**: status, valor pago, forma, data;
  - campo **Continuação de** (lista atendimentos anteriores da bike) + tipo do vínculo.
- [ ] `app/routes/appointments.$appointmentId.tsx`:
  - tabela de itens com subtotais;
  - badge de pagamento + botão **Marcar como pago**;
  - lembretes gerados (serviço, vencimento, status);
  - linha do tempo da cadeia de atendimentos.
- [ ] Lista de atendimentos no detalhe do cliente/bike: coluna de pagamento.
- [ ] `app/routes/bikes.$bikeId.tsx`: seção **Próximas revisões** da bike.

### 3.5 API REST
- [ ] `app/routes/api.appointments.ts` e `api.appointments.$appointmentId.ts`: aceitar e devolver `items`, pagamento e vínculo; manter `totalCost` na resposta.

## Tarefas externas
- [ ] Aplicar a migration no Turso (fazer backup antes: `turso db shell <banco> .dump > backup.sql`).

## Testes / verificação
- [ ] Atendimento com "Manutenção de suspensão 50h" em 17/11/2026 com 120 h → lembrete para 17/05/2027 ou 170 h.
- [ ] Repetir o mesmo serviço na mesma bike fecha o lembrete anterior.
- [ ] Atendimento com dois itens soma corretamente; total enviado pelo cliente é ignorado.
- [ ] Marcar como pago muda status e data.
- [ ] "Continuação de" não aceita atendimento de outra bike nem de outra oficina.
- [ ] Atendimentos antigos continuam abrindo com o valor certo após a migration.
- [ ] Testes de `isReminderDue` passam.

## Pronto quando
Um atendimento com um serviço padrão gera o lembrete certo, o pagamento pode ficar pendente ou pago, e retornos ficam ligados ao atendimento original.
