import assert from "node:assert";
import { computeDue, isReminderDue } from "../app/services/reminders.server";

console.log("▶ Iniciando testes de validação do cálculo e vencimento de lembretes...");

// ==========================================
// Testes de computeDue
// ==========================================

const baseDate = new Date("2026-01-01T10:00:00.000Z");

// 1. Deve calcular dueDate adicionando meses corretamente
const resMonths = computeDue({
  serviceDate: baseDate,
  intervalMonths: 3,
});
assert.strictEqual(resMonths.hasReminder, true);
assert.ok(resMonths.dueDate instanceof Date);
assert.strictEqual(resMonths.dueDate?.toISOString().slice(0, 10), "2026-04-01");
assert.strictEqual(resMonths.dueKm, null);
assert.strictEqual(resMonths.dueHours, null);

// 2. Deve calcular dueKm somando ao odômetro atual
const resKm = computeDue({
  serviceDate: baseDate,
  odometerKm: 1200,
  intervalKm: 500,
});
assert.strictEqual(resKm.hasReminder, true);
assert.strictEqual(resKm.dueKm, 1700);

// 3. Se odometerKm for nulo, dueKm deve ser nulo
const resKmNull = computeDue({
  serviceDate: baseDate,
  odometerKm: null,
  intervalKm: 500,
});
assert.strictEqual(resKmNull.dueKm, null);

// 4. Deve calcular dueHours somando às horas atuais
const resHours = computeDue({
  serviceDate: baseDate,
  usageHours: 50,
  intervalHours: 25,
});
assert.strictEqual(resHours.hasReminder, true);
assert.strictEqual(resHours.dueHours, 75);

// 5. Sem nenhum intervalo, hasReminder deve ser falso
const resEmpty = computeDue({
  serviceDate: baseDate,
});
assert.strictEqual(resEmpty.hasReminder, false);
assert.strictEqual(resEmpty.dueDate, null);
assert.strictEqual(resEmpty.dueKm, null);
assert.strictEqual(resEmpty.dueHours, null);

// ==========================================
// Testes de isReminderDue
// ==========================================

const today = new Date("2026-06-15T12:00:00.000Z");

// 6. Deve retornar true se dueDate está dentro da janela de 15 dias (ex: daqui a 5 dias)
const inWindowDate = new Date("2026-06-20T12:00:00.000Z");
assert.strictEqual(
  isReminderDue({ dueDate: inWindowDate, status: "ABERTO" }, null, today, 15),
  true,
  "Deveria estar a vencer dentro da janela de 15 dias"
);

// 7. Deve retornar false se dueDate está além da janela (ex: daqui a 30 dias)
const farDate = new Date("2026-07-20T12:00:00.000Z");
assert.strictEqual(
  isReminderDue({ dueDate: farDate, status: "ABERTO" }, null, today, 15),
  false,
  "Não deveria acusar vencimento além da janela"
);

// 8. Deve retornar true se dueDate já passou (vencido)
const pastDate = new Date("2026-06-01T12:00:00.000Z");
assert.strictEqual(
  isReminderDue({ dueDate: pastDate, status: "ABERTO" }, null, today, 15),
  true,
  "Lembrete com data retroativa deve ser considerado vencido"
);

// 9. Deve retornar true se a quilometragem atual atingiu ou ultrapassou dueKm
assert.strictEqual(
  isReminderDue(
    { dueKm: 1500, status: "ABERTO" },
    { currentOdometerKm: 1550 },
    today
  ),
  true,
  "Deveria acusar vencimento por km atingido"
);

// 10. Deve retornar false se a quilometragem atual for menor que dueKm
assert.strictEqual(
  isReminderDue(
    { dueKm: 1500, status: "ABERTO" },
    { currentOdometerKm: 1200 },
    today
  ),
  false,
  "Não deveria acusar vencimento quando km atual for menor"
);

// 11. Deve retornar true se as horas atuais atingiram ou ultrapassaram dueHours
assert.strictEqual(
  isReminderDue(
    { dueHours: 100, status: "ABERTO" },
    { currentHours: 105 },
    today
  ),
  true,
  "Deveria acusar vencimento por horas atingidas"
);

// 12. Deve retornar false se status for CONCLUIDO ou IGNORADO mesmo vencido
assert.strictEqual(
  isReminderDue({ dueDate: pastDate, status: "CONCLUIDO" }, null, today),
  false,
  "Lembretes CONCLUIDO não devem retornar vencidos"
);
assert.strictEqual(
  isReminderDue({ dueDate: pastDate, status: "IGNORADO" }, null, today),
  false,
  "Lembretes IGNORADO não devem retornar vencidos"
);

// 13. Deve retornar true se status for CONTATADO (em acompanhamento) e data vencida
assert.strictEqual(
  isReminderDue({ dueDate: inWindowDate, status: "CONTATADO" }, null, today, 15),
  true,
  "Lembretes CONTATADO devem continuar sinalizados enquanto não concluídos"
);

console.log("✔ Todos os 13 testes de lembretes passaram com sucesso!");
