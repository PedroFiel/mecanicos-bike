# Projeto: Sistema para Mecânica de Bikes

## Visão Geral

Sistema web para gerenciamento de uma oficina de bicicletas. Permite que mecânicos cadastrem clientes, registrem as bikes de cada cliente e controlem os atendimentos realizados.

**Tecnologias utilizadas:**
- **Node.js + React Router 7** — servidor e interface web em um único projeto
- **Turso (LibSQL)** — banco de dados SQLite na nuvem
- **Prisma ORM** — camada de acesso ao banco (evita SQL manual, gera as queries automaticamente)
- **TypeScript** — tipagem estática em todo o projeto
- **TailwindCSS + Radix UI** — estilização e componentes visuais
- **JWT (JSON Web Token)** — autenticação por token, armazenado em cookie seguro
- **Zod** — validação de dados nos formulários e na API

---

## Banco de Dados

### Por que Turso?

O Turso é um banco de dados SQLite hospedado na nuvem. Ele usa o protocolo LibSQL, que é compatível com SQLite padrão. A vantagem é que o banco fica acessível de qualquer lugar sem precisar de um servidor de banco de dados separado (como seria necessário com PostgreSQL ou MySQL).

A conexão é feita via duas variáveis de ambiente:

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

O Prisma se conecta ao Turso usando o adapter oficial:

```ts
// prisma/prisma.ts
const adapter = new PrismaLibSQL({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const prisma = new PrismaClient({ adapter })
```

### Diagrama de Relacionamentos

```
users
 ├──< clients            (1 usuário tem vários clientes)
 │     ├──< bikes        (1 cliente tem várias bikes)
 │     └──< appointments (1 cliente tem vários atendimentos)
 │
 ├──< bikes
 │     └──< appointments (1 bike tem vários atendimentos)
 │
 └──< appointments
       └──< service_details (1 atendimento tem vários detalhes de serviço)
```

### Tabelas

**users** — mecânicos cadastrados no sistema

| Coluna    | Tipo     | Restrição              |
|-----------|----------|------------------------|
| id        | INTEGER  | PK, auto-increment     |
| name      | TEXT     | NOT NULL               |
| email     | TEXT     | UNIQUE, NOT NULL       |
| password  | TEXT     | NOT NULL               |
| phone     | TEXT     | opcional               |
| image     | TEXT     | opcional               |
| createdAt | DATETIME | default: agora         |

**clients** — clientes da oficina

| Coluna    | Tipo     | Restrição              |
|-----------|----------|------------------------|
| id        | INTEGER  | PK, auto-increment     |
| userId    | INTEGER  | FK → users.id          |
| fullName  | TEXT     | NOT NULL               |
| cpf       | TEXT     | UNIQUE, opcional       |
| email     | TEXT     | opcional               |
| birthDate | DATETIME | opcional               |
| phone     | TEXT     | opcional               |
| address   | TEXT     | opcional               |
| notes     | TEXT     | opcional               |
| createdAt | DATETIME | default: agora         |

**bikes** — bikes de cada cliente

| Coluna          | Tipo     | Restrição          |
|-----------------|----------|--------------------|
| id              | INTEGER  | PK, auto-increment |
| clientId        | INTEGER  | FK → clients.id    |
| userId          | INTEGER  | FK → users.id      |
| model           | TEXT     | NOT NULL           |
| brand           | TEXT     | opcional           |
| color           | TEXT     | opcional           |
| frameNumber     | TEXT     | opcional           |
| characteristics | TEXT     | opcional           |
| createdAt       | DATETIME | default: agora     |

**appointments** — atendimentos registrados

| Coluna      | Tipo     | Restrição                          |
|-------------|----------|------------------------------------|
| id          | INTEGER  | PK, auto-increment                 |
| clientId    | INTEGER  | FK → clients.id                    |
| bikeId      | INTEGER  | FK → bikes.id                      |
| userId      | INTEGER  | FK → users.id                      |
| title       | TEXT     | NOT NULL                           |
| description | TEXT     | opcional                           |
| serviceDate | DATETIME | default: agora                     |
| status      | TEXT     | PENDENTE / CONCLUIDO / CANCELADO   |
| totalCost   | REAL     | opcional                           |

**service_details** — peças trocadas e serviços do atendimento

| Coluna        | Tipo    | Restrição               |
|---------------|---------|-------------------------|
| id            | INTEGER | PK, auto-increment      |
| appointmentId | INTEGER | FK → appointments.id    |
| partReplaced  | TEXT    | opcional                |
| workDone      | TEXT    | opcional                |
| cost          | REAL    | opcional                |

---

## Script SQL de Criação do Banco

```sql
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "clients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "birthDate" DATETIME,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id")
);

CREATE TABLE "bikes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "brand" TEXT,
    "color" TEXT,
    "frameNumber" TEXT,
    "characteristics" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bikes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id"),
    CONSTRAINT "bikes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id")
);

CREATE TABLE "appointments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "bikeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "serviceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'CONCLUIDO',
    "totalCost" REAL,
    CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id"),
    CONSTRAINT "appointments_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "bikes" ("id"),
    CONSTRAINT "appointments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id")
);

CREATE TABLE "service_details" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "appointmentId" INTEGER NOT NULL,
    "partReplaced" TEXT,
    "workDone" TEXT,
    "cost" REAL,
    CONSTRAINT "service_details_appointmentId_fkey"
        FOREIGN KEY ("appointmentId") REFERENCES "appointments" ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "clients_cpf_key" ON "clients"("cpf");
```

---

## APIs REST Implementadas

Todos os endpoints exigem autenticação (JWT em cookie HTTP-only). Retornam JSON.

### Clientes `/api/clients`

| Método | Rota              | O que faz                                        |
|--------|-------------------|--------------------------------------------------|
| GET    | `/api/clients`    | Lista todos os clientes (aceita `?search=nome`)  |
| POST   | `/api/clients`    | Cadastra novo cliente                            |
| GET    | `/api/clients/:id`| Detalha um cliente com bikes e atendimentos      |
| PUT    | `/api/clients/:id`| Atualiza dados do cliente                        |
| DELETE | `/api/clients/:id`| Remove o cliente                                 |

### Bikes `/api/bikes`

| Método | Rota           | O que faz                                           |
|--------|----------------|-----------------------------------------------------|
| GET    | `/api/bikes`   | Lista todas as bikes (aceita `?clientId=1`)         |
| POST   | `/api/bikes`   | Cadastra nova bike                                  |
| GET    | `/api/bikes/:id` | Detalha uma bike com histórico de atendimentos    |
| PUT    | `/api/bikes/:id` | Atualiza dados da bike                            |
| DELETE | `/api/bikes/:id` | Remove a bike                                     |

### Atendimentos `/api/appointments`

| Método | Rota                   | O que faz                                              |
|--------|------------------------|--------------------------------------------------------|
| GET    | `/api/appointments`    | Lista atendimentos (aceita `?status=PENDENTE&clientId=1`) |
| POST   | `/api/appointments`    | Registra novo atendimento                              |
| GET    | `/api/appointments/:id`| Detalha atendimento com cliente, bike e serviços       |
| PUT    | `/api/appointments/:id`| Atualiza atendimento                                   |
| DELETE | `/api/appointments/:id`| Remove atendimento (e os service_details junto)        |

---

## Arquitetura: Decisões e Fluxo

### A divisão em 3 camadas

O projeto foi estruturado com separação clara de responsabilidades:

```
Route   (app/routes/api.clients.ts)      — recebe HTTP, valida, responde
  ↓
Service (app/services/clients.server.ts) — regras de negócio
  ↓
Prisma  (prisma/prisma.ts)               — acessa o banco Turso
```

Essa separação garante que qualquer mudança no banco não quebre as rotas, e que a mesma lógica possa ser reutilizada em diferentes contextos sem duplicação.

---

### Por que os loaders das páginas não chamam `/api/*` internamente?

Essa é a principal decisão arquitetural do projeto e merece explicação detalhada.

#### O que seria chamar a API internamente

Uma alternativa seria fazer o loader da página fazer um `fetch` para a própria rota de API:

```ts
// ❌ Abordagem que NÃO foi adotada
export async function loader({ request }: Route.LoaderArgs) {
  const response = await fetch("http://localhost:5173/api/clients", {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  })
  const clients = await response.json()
  return { clients }
}
```

Isso funciona, mas é **ineficiente e desnecessário** — e aqui está o motivo.

#### O problema: o servidor chamando a si mesmo

O loader **já roda no servidor**. Se ele fizesse `fetch("/api/clients")`, estaria abrindo uma conexão HTTP de volta para o mesmo processo que está executando. O caminho seria:

```
Servidor (loader)
  → abre conexão HTTP
  → envia requisição para si mesmo
  → Servidor (rota /api/clients) recebe
  → chama listClients()  ← service
  → Prisma consulta Turso
  → serializa para JSON
  → responde via HTTP
  → loader recebe JSON
  → desserializa
  → retorna para o componente
```

São dois passos extras (serializar para JSON e desserializar) e uma conexão TCP desnecessária — tudo para acessar uma função que está no mesmo processo.

#### A abordagem adotada: chamar o service diretamente

Como o loader já está no servidor, ele pode chamar `listClients()` diretamente como qualquer função JavaScript:

```ts
// ✅ Abordagem adotada
export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  const clients = await listClients(userId)  // chamada de função direta
  return { clients }
}
```

O caminho agora é:

```
Servidor (loader)
  → chama listClients()  ← service (mesma memória, sem HTTP)
  → Prisma consulta Turso
  → retorna para o componente
```

Sem HTTP, sem serialização, sem overhead. O resultado é o mesmo, com menos complexidade.

#### Analogia

É a diferença entre um funcionário da empresa ligar para o atendimento ao cliente para pedir uma informação interna, versus ir direto à sala do colega que tem essa informação. O atendimento ao cliente existe para o público externo — internamente, se fala direto.

#### A justificativa técnica

Esta decisão é documentada e recomendada pelos próprios criadores dos frameworks que usam SSR:

- A documentação do **Next.js** diz explicitamente: *"If you need to fetch data inside a Server Component, you can call your database directly or call a server-side utility instead of calling a Route Handler."*
- O **Remix** (antecessor direto do React Router 7) segue o mesmo princípio: loaders chamam funções, não endpoints.

A ideia central é: **a API REST é uma interface para o mundo externo. Internamente, o sistema usa funções.**

---

### Então para que servem as rotas `/api/*`?

As rotas `/api/clients`, `/api/bikes` e `/api/appointments` existem como **porta de entrada HTTP** para consumidores externos. A interface web não as usa, mas elas são necessárias para:

- **Testes manuais** — com Postman, Thunder Client ou curl, é possível testar cada endpoint isoladamente sem abrir o browser
- **App mobile** — um app de celular para a oficina chamaria `GET /api/clients` e receberia JSON
- **Integrações externas** — outro sistema que precise consultar os dados via HTTP

A chave é que as rotas de API e os loaders de página **chamam o mesmo service**. A lógica de negócio existe uma vez só — o que muda é apenas a entrada (HTTP externo vs. chamada interna) e a saída (JSON vs. HTML).

```
Postman / App mobile          ──> /api/clients ──> listClients() ──> Turso
Browser / página do site      ──> loader()     ──> listClients() ──> Turso
                                                        ↑
                                              mesmo service, mesma lógica
```

---

### Como rebater se questionado

**"Mas o frontend não está usando a API?"**

> O frontend usa o mesmo sistema de dados que a API — através do service layer. A API é a interface HTTP desse sistema para consumidores externos. Internamente, os loaders chamam o service diretamente porque já estão no servidor: fazer uma chamada HTTP de volta para si mesmo seria overhead desnecessário. É o mesmo padrão recomendado pelo Next.js e documentado no React Router 7.

**"Por que criar a API se não usa?"**

> A API existe e funciona — ela pode ser testada com qualquer ferramenta HTTP. O projeto foi projetado para suportar integrações futuras (app mobile, por exemplo) sem precisar reescrever nada. A lógica já está encapsulada no service; a API é só mais um ponto de entrada para ela.

---

## O que está funcional

| Funcionalidade                                    | Status |
|---------------------------------------------------|--------|
| Cadastro e login de usuários                      | ✅     |
| CRUD completo de Clientes                         | ✅     |
| CRUD completo de Bikes                            | ✅     |
| CRUD completo de Atendimentos                     | ✅     |
| Busca de clientes por nome                        | ✅     |
| Filtro de atendimentos por status                 | ✅     |
| Dados isolados por usuário                        | ✅     |
| Validação de CPF único                            | ✅     |
| Exclusão em cascata (atendimento apaga detalhes)  | ✅     |
| Interface web completa                            | ✅     |
| Detalhes de serviço por atendimento               | ⚠️ tabela existe, tela não implementada |
| Dashboard com dados reais                         | ⚠️ dados são placeholder estático       |
