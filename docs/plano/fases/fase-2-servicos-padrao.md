# Fase 2 — Serviços padrão

**Branch:** `feat/fase-2-servicos-padrao` · **Depende de:** Fase 0 · **Destrava:** Fase 3

**Objetivo:** cada oficina tem uma lista editável de serviços com mão de obra padrão e intervalos de revisão, já preenchida com a pesquisa de mercado. Detalhes em [escopo.md §3](../escopo.md) e [servicos-padrao.md](../servicos-padrao.md).

## Tarefas de código

### 2.1 Banco
- [ ] Migration `servicos_padrao`:
  - tabela `ServiceTemplate` e enum `ServiceCategory`;
  - `Bike.type` (enum `BikeType`), `Bike.currentOdometerKm`, `Bike.currentHours`;
  - `User.shopName`, `User.whatsappTemplate`;
  - SQL de dados: inserir os 18 serviços para cada usuário existente.

### 2.2 Dados padrão
- [ ] `app/lib/default-services.ts` com os 18 serviços (campos: `key`, `name`, `category`, `defaultLaborCost`, `estimatedMinutes`, `intervalMonths`, `intervalKm`, `intervalHours`).
- [ ] Teste simples garantindo que todas as `key` são únicas.

### 2.3 Serviço
- [ ] `app/services/service-templates.server.ts`:
  - `listServiceTemplates(userId, { includeInactive })`;
  - `createServiceTemplate(userId, data)` / `updateServiceTemplate(id, userId, data)`;
  - `setServiceTemplateActive(id, userId, active)` — nunca apaga (itens antigos apontam para ele);
  - `seedDefaultServices(userId)` — usado no cadastro;
  - `restoreDefaultServices(userId)` — cria só as `key` que faltam.
- [ ] Chamar `seedDefaultServices` em `app/routes/signup.tsx` após criar o usuário (na mesma transação).

### 2.4 Validação
- [ ] `app/features/service-templates/types.ts` com schema Zod: nome 3–80 caracteres, mão de obra ≥ 0, intervalos inteiros positivos ou vazios, ao menos um campo preenchido não é obrigatório (serviço sem lembrete é válido).

### 2.5 Telas
- [ ] Reorganizar `app/routes/settings.tsx` em abas (`ui/tabs` já existe): **Aparência** (tema atual), **Oficina**, **Serviços padrão**.
- [ ] Aba **Oficina**: nome da oficina (usado nas mensagens) e modelo de mensagem do WhatsApp com a lista de variáveis e pré-visualização.
- [ ] Aba **Serviços padrão**:
  - tabela agrupada por categoria: nome, mão de obra, intervalos ("6 meses · 50 h"), status;
  - botão **Novo serviço** e edição em `Sheet` lateral (componente já existe);
  - ação ativar/desativar;
  - botão **Restaurar padrões** com confirmação.
- [ ] Componentes em `app/features/service-templates/components/`.
- [ ] Formulário de bike (`app/features/bikes/components/bike-form.tsx`): campo **Tipo**.

## Tarefas externas
- [ ] Aplicar a migration no Turso.

## Testes / verificação
- [ ] Cadastro de conta nova → 18 serviços aparecem em Configurações.
- [ ] Conta existente antes da migration também tem os 18.
- [ ] Editar preço numa oficina não altera outra.
- [ ] Desativar e restaurar padrões não duplica serviços.
- [ ] `npm run typecheck` passa.

## Pronto quando
Uma oficina nova já nasce com os 18 serviços e consegue editar preço e intervalos; o nome da oficina e o modelo de mensagem ficam salvos.
