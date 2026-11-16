# Roadmap — Sistema para Mecânica de Bikes

Documento de acompanhamento do projeto: o que já foi entregue, onde paramos e o que falta para considerar o sistema completo.

> Última atualização: 15/11/2026
> Detalhes técnicos (banco, endpoints, decisões de arquitetura) estão em [RELATORIO.md](RELATORIO.md).

---

## Situação atual

**Estamos no fim da Etapa 4** (branch `feat/etapa4`, PRs #1 e #2 já mergeados na `main`).

O núcleo do sistema funciona: login, cadastro de clientes, bikes e atendimentos, API REST e camada de serviços. Faltam as telas de detalhes de serviço, um dashboard com dados reais e alguns ajustes de robustez.

---

## Histórico das etapas

| Etapa | Período | Entregas | Status |
|-------|---------|----------|--------|
| Base do projeto | Out/2025 | Projeto React Router 7, Prisma + Turso, schema do banco | ✅ |
| Autenticação e interface | Nov/2025 | Login/cadastro com JWT, dashboard (layout), navegação lateral | ✅ |
| Módulos principais | Nov/2025 | CRUD de clientes, bikes e atendimentos, perfil com avatar, temas claro/escuro, deploy (Docker/Fly) | ✅ |
| **Etapa 4** | Jun/2026 | API REST (`/api/clients`, `/api/bikes`, `/api/appointments`), camada de serviços, serviço de usuário | ✅ (falta documentação — ver Fase 1) |

> A numeração oficial das etapas 1–3 não está registrada no repositório. Se houver um enunciado da disciplina, ajustar esta tabela com os nomes oficiais.

---

## Próximas fases

### Fase 1 — Fechar a Etapa 4 (documentação)

Objetivo: deixar o repositório refletindo o que foi feito.

- [ ] Commitar o `RELATORIO.md` (hoje está fora do git)
- [ ] Commitar este `ROADMAP.md`
- [ ] Reescrever o `README.md`: descrição do projeto, tecnologias, variáveis de ambiente (`DATABASE_URL`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`), como rodar localmente e como fazer deploy
- [ ] Remover `app/lib/api.server.ts` (não é mais usado desde a introdução da camada de serviços)

**Pronto quando:** alguém que clonar o repositório consegue entender o projeto e rodá-lo só lendo o README.

---

### Fase 2 — Completar as funcionalidades

Objetivo: cobrir todas as tabelas do banco com telas.

**2.1 Detalhes de serviço do atendimento** (`service_details`)
- [ ] Funções no `app/services/appointments.server.ts` (ou novo `service-details.server.ts`): adicionar, editar e remover item
- [ ] Na página do atendimento (`appointments.$appointmentId.tsx`): lista de peças trocadas / serviços feitos, com custo de cada item
- [ ] Formulário para adicionar item (o schema `serviceDetailSchema` já existe em `app/features/appointments/types.ts`)
- [ ] Calcular `totalCost` do atendimento como soma dos itens (ou mostrar a soma ao lado do valor manual)
- [ ] Endpoints na API: `POST/PUT/DELETE /api/appointments/:id/services`

**2.2 Listagens que faltam**
- [ ] Página `/bikes` com todas as bikes (busca por modelo/marca, filtro por cliente)
- [ ] Página `/appointments` com todos os atendimentos (filtro por status e por período)
- [ ] Adicionar "Bikes" e "Atendimentos" no menu lateral (`app/components/app-sidebar.tsx`)

**Pronto quando:** é possível registrar um atendimento completo — cliente → bike → atendimento → peças/serviços com custo — e encontrá-lo depois pela listagem.

---

### Fase 3 — Robustez e dados

Objetivo: evitar erros em uso real e facilitar testes.

- [ ] **Exclusão com dependentes:** as chaves estrangeiras usam `ON DELETE RESTRICT`, e `deleteClient` / `deleteBike` não tratam esse caso. Verificar o comportamento atual e decidir:
  - excluir em cascata (bikes, atendimentos e detalhes junto), **ou**
  - bloquear com mensagem clara ("este cliente possui X bikes")
- [ ] Criar `prisma/seed.ts` (o script `db:seed` já aponta para ele; `@faker-js/faker` já está instalado) com um usuário de teste, clientes, bikes e atendimentos
- [ ] Revisar `prisma/migrations`: a migration `20251031005444_init` contém tabelas `posts`, `chats` e `tasks` que não existem no `schema.prisma` (sobra do template). Gerar uma migration limpa que bata com o schema atual
- [ ] Mensagens de erro amigáveis nos formulários (CPF duplicado, campos obrigatórios, falha de conexão)

**Pronto quando:** dá para recriar o banco do zero com migration + seed, e nenhuma ação na interface gera erro 500.

---

### Fase 4 — Dashboard com dados reais

Objetivo: substituir os dados estáticos (`app/dashboard/data.json`) e os cards de exemplo.

- [ ] Novo serviço `app/services/dashboard.server.ts` com as consultas agregadas
- [ ] Cards (`section-cards.tsx`): total de clientes, bikes cadastradas, atendimentos pendentes, faturamento do mês
- [ ] Gráfico (`chart-area-interactive.tsx`): atendimentos ou faturamento por dia/mês
- [ ] Tabela (`data-table.tsx`): últimos atendimentos com link para o detalhe
- [ ] Remover `app/dashboard/data.json`

**Pronto quando:** o dashboard reflete os dados do usuário logado e muda ao cadastrar um atendimento.

---

### Fase 5 — Finalização

Objetivo: polir e entregar.

- [ ] Troca de senha na página de conta (senha atual + nova senha, com bcrypt)
- [ ] Testes da API (coleção do Postman/Thunder Client ou testes automatizados) cobrindo os 15 endpoints
- [ ] Revisão de responsividade (celular) nas telas principais
- [ ] Deploy final atualizado e testado em produção
- [ ] Atualizar `RELATORIO.md` com as funcionalidades novas e a tabela "O que está funcional"
- [ ] Preparar a apresentação (fluxo de demonstração usando os dados do seed)

**Pronto quando:** o sistema está publicado, todas as funcionalidades da tabela do relatório estão ✅ e a demonstração roda do início ao fim.

---

## Ideias opcionais (se sobrar tempo)

- Histórico de atendimentos por bike em linha do tempo
- Exportar atendimento como recibo/orçamento (PDF)
- Status "EM_ANDAMENTO" além de PENDENTE / CONCLUIDO / CANCELADO
- Busca global (cliente, bike ou atendimento em um só campo)

---

## Resumo do progresso

| Fase | Descrição | Status |
|------|-----------|--------|
| Etapa 4 | API REST + camada de serviços | ✅ |
| 1 | Documentação e limpeza | ⬜ |
| 2 | Detalhes de serviço e listagens | ⬜ |
| 3 | Robustez, seed e migrations | ⬜ |
| 4 | Dashboard real | ⬜ |
| 5 | Finalização e entrega | ⬜ |
