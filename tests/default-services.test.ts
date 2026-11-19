import assert from "node:assert";
import {
  DEFAULT_SERVICES,
  SERVICE_CATEGORIES,
  DEFAULT_WHATSAPP_TEMPLATE,
} from "../app/lib/default-services";

console.log("▶ Iniciando testes de validação dos serviços padrão...");

// 1. Deve conter exatamente 18 serviços padrão
assert.strictEqual(
  DEFAULT_SERVICES.length,
  18,
  `Esperado 18 serviços padrão, mas encontrado ${DEFAULT_SERVICES.length}`
);

// 2. Todas as chaves (key) devem ser únicas
const keys = DEFAULT_SERVICES.map((s) => s.key);
const uniqueKeys = new Set(keys);
assert.strictEqual(
  uniqueKeys.size,
  keys.length,
  `Chaves duplicadas encontradas nos serviços padrão: ${keys.filter((k, i) => keys.indexOf(k) !== i).join(", ")}`
);

// 3. Validação de categorias e valores
for (const service of DEFAULT_SERVICES) {
  assert.ok(
    service.name && service.name.length >= 3,
    `Nome inválido no serviço ${service.key}`
  );
  assert.ok(
    SERVICE_CATEGORIES.includes(service.category as any),
    `Categoria desconhecida "${service.category}" no serviço ${service.key}`
  );
  assert.ok(
    service.defaultLaborCost >= 0,
    `Valor de mão de obra negativo no serviço ${service.key}`
  );
  if (service.intervalMonths !== null) {
    assert.ok(
      service.intervalMonths > 0,
      `intervalMonths deve ser positivo no serviço ${service.key}`
    );
  }
  if (service.intervalKm !== null) {
    assert.ok(
      service.intervalKm > 0,
      `intervalKm deve ser positivo no serviço ${service.key}`
    );
  }
  if (service.intervalHours !== null) {
    assert.ok(
      service.intervalHours > 0,
      `intervalHours deve ser positivo no serviço ${service.key}`
    );
  }
}

// 4. Validação do template de WhatsApp
assert.ok(
  DEFAULT_WHATSAPP_TEMPLATE.includes("{cliente}"),
  "Template de WhatsApp deve conter a tag {cliente}"
);
assert.ok(
  DEFAULT_WHATSAPP_TEMPLATE.includes("{bike}"),
  "Template de WhatsApp deve conter a tag {bike}"
);
assert.ok(
  DEFAULT_WHATSAPP_TEMPLATE.includes("{servico}"),
  "Template de WhatsApp deve conter a tag {servico}"
);
assert.ok(
  DEFAULT_WHATSAPP_TEMPLATE.includes("{oficina}"),
  "Template de WhatsApp deve conter a tag {oficina}"
);

console.log("✅ Todos os 18 serviços padrão e templates foram validados com sucesso!");
