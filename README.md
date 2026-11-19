# Mecânicos Bike

Sistema de gestão para oficinas de bicicleta. Permite cadastrar clientes, bikes e atendimentos, controlar pagamentos, enviar lembretes de revisão por WhatsApp e acompanhar indicadores de desempenho no dashboard.

**Stack:** React Router v7 · Prisma · Turso (libSQL) · Tailwind CSS · Fly.io

---

## Rodando localmente

### Pré-requisitos

- Node.js 20.19+ ou 22 LTS
- npm

### Instalação

```bash
# 1. Instale as dependências
npm ci

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com seus valores (veja a seção Variáveis de ambiente)

# 3. Crie um banco local vazio com o schema vigente
# No Windows, veja o comando PowerShell logo abaixo.
npx prisma db push

# 4. (Opcional) Popule com dados de demonstração
npm run db:seed

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

No PowerShell, com o caminho padrão do `.env.example`, crie o arquivo SQLite antes de aplicar o schema.

```powershell
if (-not (Test-Path -LiteralPath 'prisma/database.sqlite')) {
  New-Item -ItemType File -Path 'prisma/database.sqlite'
}
npx.cmd prisma db push
```

O app estará disponível em `http://localhost:5173`.

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✅ | URL SQLite usada pelo Prisma CLI. Em produção, a conexão do app usa `TURSO_DATABASE_URL` quando definida |
| `JWT_SECRET` | ✅ | Segredo para assinar tokens JWT (mín. 32 chars) |
| `TURSO_DATABASE_URL` | Produção | URL do banco Turso. Deixe indefinida para usar o SQLite local |
| `TURSO_AUTH_TOKEN` | Produção | Token de autenticação do Turso |
| `EMAIL_PROVIDER` | Opcional | `resend` (padrão) ou `brevo` |
| `RESEND_API_KEY` | Resend | Chave da API do Resend para envio de e-mails |
| `EMAIL_FROM` | Resend | Endereço remetente dos e-mails |
| `BREVO_API_KEY` | Brevo | Chave da API com acesso a e-mail transacional |
| `BREVO_SENDER_EMAIL` | Brevo | Endereço de remetente verificado no painel do Brevo |
| `BREVO_SENDER_NAME` | Opcional | Nome do remetente no Brevo. O padrão é `Mecânicos Bike` |
| `APP_URL` | Produção | URL pública da aplicação (usada nos links de e-mail) |
| `DEMO_PASSWORD` | Seed | Senha da conta demo usada pelo `npm run db:seed` |

> **Gerar um JWT_SECRET seguro:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## E-mail com Brevo

Verifique um remetente no Brevo e gere uma chave de API com acesso a e-mail transacional. No `.env` local, defina:

```dotenv
EMAIL_PROVIDER=brevo
BREVO_API_KEY="sua-chave"
BREVO_SENDER_EMAIL="email-verificado"
BREVO_SENDER_NAME="Mecânicos Bike"
APP_URL="http://localhost:5173"
```

Reinicie o servidor e use uma conta comum para testar o código de login, o link de recuperação e o aviso de senha alterada. No Vercel, configure essas variáveis no ambiente Preview, ajuste `APP_URL` para a URL publicada e gere um novo deploy. Para voltar ao Resend, selecione `EMAIL_PROVIDER=resend` e mantenha as credenciais do Resend configuradas.

## Banco de dados e migrations

### Desenvolvimento local (SQLite)

```bash
# Criar o banco local a partir do schema
npx prisma db push

# Abrir o Prisma Studio para inspecionar os dados
npx prisma studio
```

As migrations históricas não recriam um SQLite vazio. Use `prisma db push` para um banco local de desenvolvimento. Para um banco existente, revise o SQL e preserve os dados antes de aplicar mudanças.

### Produção (Turso)

O banco de produção é um **Turso** (libSQL). Como o Prisma Migrate não se conecta ao Turso diretamente, o fluxo é:

```bash
# 1. Gere o SQL da migration (comparando o schema atual com o banco)
npx prisma migrate diff \
  --from-url "file:./prisma/database.sqlite" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migration.sql

# 2. Revise o arquivo migration.sql gerado

# 3. Aplique no banco de produção via CLI do Turso
turso db shell <nome-do-banco> < migration.sql

# Ou execute comandos SQL diretamente:
turso db shell <nome-do-banco>
```

> **Pré-requisito:** autentique no CLI do Turso antes: `turso auth login`

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build de produção |
| `npm run start` | Inicia o servidor de produção |
| `npm run typecheck` | Verificação de tipos TypeScript |
| `npm test` | Testes de serviços, e-mail, WhatsApp e isolamento em SQLite temporário |
| `npm run db:seed` | Popula o banco com dados de demonstração |

---

## Conta demo

Após rodar `npm run db:seed`, acesse com:

- **E-mail:** `demo@oficina.test`
- **Senha:** valor de `DEMO_PASSWORD` no seu `.env`

O login demo abre o dashboard diretamente, com 40 clientes, 60 bikes e 300 atendimentos simulados. O seed recria apenas os dados da conta demo. Na demonstração, o WhatsApp mostra uma prévia da mensagem e permite simular o contato.

O faturamento usa o valor dos atendimentos concluídos pela data do serviço. Ticket médio, retorno, garantia e gráficos de volume seguem o período selecionado. O histórico de faturamento cobre 12 meses, e as filas de revisão, recebimento e atendimento mostram a situação atual da oficina.

---

## Deploy (Fly.io)

```bash
# Primeiro deploy
fly launch

# Configurar variáveis de ambiente (secrets)
fly secrets set JWT_SECRET="..." RESEND_API_KEY="..." EMAIL_FROM="..." APP_URL="https://seu-app.fly.dev"

# Deploy de atualizações
fly deploy
```

---

## Estrutura do projeto

```
app/
├── components/       # Componentes reutilizáveis (UI e layout)
├── lib/              # Utilitários do servidor (env, email, auth)
├── routes/           # Rotas do React Router
├── services/         # Lógica de negócio (server-side)
├── types/            # Tipos TypeScript compartilhados
└── root.tsx          # Layout raiz + headers de segurança

prisma/
├── schema.prisma     # Schema do banco de dados
├── migrations/       # Histórico de migrations SQL
├── prisma.ts         # Instância do Prisma Client
└── seed.ts           # Script de dados de demonstração

docs/
└── plano/            # Documentação do plano de melhorias por fase
```
