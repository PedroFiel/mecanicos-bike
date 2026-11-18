# Fase 0 — Fundação e limpeza

**Branch:** `feat/fase-0-fundacao` · **Depende de:** nada · **Destrava:** todas as outras

**Objetivo:** deixar a base segura e previsível antes de qualquer funcionalidade nova: variáveis validadas, banco fora do git, CPF por oficina e headers de segurança.

## Tarefas de código

### 0.1 Banco fora do git — ✅ feito no PR de documentação
- [x] `git rm --cached prisma/database/database.sqlite`
- [x] `.gitignore` com `*.sqlite` e `*.db`

### 0.2 Variáveis de ambiente
- [ ] Criar `.env.example` com todas as chaves de [cadastros-externos.md](../cadastros-externos.md), sem valores.
- [ ] Criar `app/lib/env.server.ts`:
  - schema Zod: `TURSO_DATABASE_URL` (url), `TURSO_AUTH_TOKEN` (string), `JWT_SECRET` (min 32), `APP_URL` (url), `RESEND_API_KEY` (opcional), `EMAIL_FROM` (opcional), `NODE_ENV`;
  - exporta `env` já tipado; lança erro claro na inicialização se algo faltar.
- [ ] Trocar `process.env.X` por `env.X` em `app/lib/jwt.server.ts`, `app/lib/auth.server.ts`, `prisma/prisma.ts`, `app/turso.ts`.

### 0.3 CPF único por oficina
- [ ] `schema.prisma`: remover `@unique` de `Client.cpf`, adicionar `@@unique([userId, cpf])`.
- [ ] Migration `cpf_unico_por_oficina`.
- [ ] Ajustar a detecção de erro `P2002` em `app/routes/api.clients.ts`, `app/routes/api.clients.$clientId.ts` e nas rotas de formulário de cliente (mensagem continua "CPF já cadastrado", agora só dentro da oficina).
- [ ] Normalizar CPF (só dígitos) e validar dígito verificador em `app/features/clients/types.ts`.

### 0.4 Headers de segurança
- [ ] Gerar `app/entry.server.tsx` (`npx react-router reveal entry.server`) e adicionar os headers em todas as respostas:
  - `Content-Security-Policy` (default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' — ajustar ao que o build exigir);
  - `X-Frame-Options: DENY`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- [ ] Garantir que respostas de erro não exponham stack trace em produção.

### 0.5 Documentação de migrations
- [ ] Seção no `README.md` explicando: `prisma migrate dev` localmente → `turso db shell <banco> < migration.sql` em produção.

## Tarefas externas
- [ ] Gerar novo `JWT_SECRET` (`openssl rand -hex 32`) e atualizar `.env` local e secrets da hospedagem. Todos os usuários serão deslogados uma vez.
- [ ] Confirmar acesso ao CLI do Turso e à hospedagem.

## Testes / verificação
- [ ] Remover `JWT_SECRET` do `.env` → servidor não sobe e mostra a variável faltando.
- [ ] Duas contas diferentes cadastram o mesmo CPF com sucesso; a mesma conta não consegue repetir.
- [ ] `curl -I` na home mostra os headers.
- [ ] `npm run typecheck` passa.

## Pronto quando
O app sobe com as variáveis validadas, o banco não está no git, duas oficinas podem ter o mesmo CPF e os headers estão presentes.
