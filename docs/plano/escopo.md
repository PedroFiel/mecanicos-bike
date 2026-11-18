# Escopo funcional

Descrição detalhada de cada frente. Para tabelas e campos, ver [modelo-de-dados.md](modelo-de-dados.md); para tarefas, ver a pasta [fases](fases/).

---

## 1. Segurança de login e dos dados

### 1.1 Falhas encontradas no código atual

| # | Falha | Onde | Risco | Correção planejada |
| --- | --- | --- | --- | --- |
| S1 | Login responde "Email não encontrado" quando o e-mail não existe | `app/routes/login.tsx` | Enumeração: descobrir quais e-mails têm conta | Mensagem única "E-mail ou senha inválidos" |
| S2 | Sem limite de tentativas | `app/routes/login.tsx` | Força bruta na senha (e, depois, no código 2FA) | Bloqueio temporário por conta e por IP (ver 1.3) |
| S3 | JWT vale 7 dias e não pode ser invalidado | `app/lib/jwt.server.ts`, `app/lib/auth.server.ts` | Token roubado continua válido após logout ou troca de senha | Campo `tokenVersion` no usuário, incluído no JWT e conferido em toda requisição |
| S4 | `JWT_SECRET` não é verificado | `app/lib/jwt.server.ts` | Se a variável faltar, tokens são assinados com `undefined` | Validação de variáveis na inicialização (falha se faltar ou tiver < 32 caracteres) |
| S5 | Banco `prisma/database/database.sqlite` versionado | repositório | Vazamento de dados pelo git | **Resolvido neste PR**: removido do git e `*.sqlite`/`*.db` no `.gitignore` |
| S6 | `Client.cpf` é `@unique` global | `prisma/schema.prisma` | Uma oficina descobre que um CPF existe em outra e não consegue cadastrá-lo | Índice único composto `@@unique([userId, cpf])` |
| S7 | Sem headers de segurança | `app/entry.server` / `app/root.tsx` | Clickjacking, XSS | `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` |
| S8 | Regras de senha fracas | `app/features/auth/types.ts` | Senhas fáceis | Mínimo 8 caracteres, com pelo menos uma letra e um número, validado no servidor |
| S9 | Nenhum registro de eventos de segurança | — | Impossível investigar acesso suspeito | Tabela `SecurityEvent` |

### 1.2 Login em duas etapas (2FA por e-mail)

Fluxo:

1. Usuário informa e-mail e senha em `/login`.
2. Credenciais erradas → mensagem única, contador de falhas incrementado.
3. Credenciais certas e dispositivo **não** confiável:
   - gera um código numérico de 6 dígitos (`crypto.randomInt`);
   - salva **apenas o hash** (SHA-256) em `AuthToken` com `type = LOGIN_CODE`, validade de 10 minutos e `attempts = 0`;
   - envia o código por e-mail (Resend);
   - grava um cookie temporário `mfa_challenge` (httpOnly, 10 minutos) com o id do desafio assinado — o usuário **ainda não está logado**;
   - redireciona para `/login/verify`.
4. Em `/login/verify` o usuário digita o código:
   - certo → marca o token como usado, cria a sessão normal, apaga o cookie do desafio;
   - errado → incrementa `attempts`; na 5ª falha o desafio é cancelado e o usuário volta para `/login`.
5. Botão **Reenviar código**, liberado após 60 segundos; invalida o código anterior.
6. Checkbox **Confiar neste dispositivo por 30 dias**: cria um `AuthToken` `TRUSTED_DEVICE` e um cookie `trusted_device` (httpOnly, 30 dias). Nos próximos logins desse navegador, o passo 3 é pulado.
7. Conta demo (`isDemo = true`) não passa pelo 2FA.

### 1.3 Limite de tentativas

| Ação | Limite | Consequência |
| --- | --- | --- |
| Senha errada na mesma conta | 5 em 15 minutos | Conta bloqueada por 15 minutos (`lockedUntil`) — a mensagem continua genérica |
| Requisições de login do mesmo IP | 20 em 15 minutos | HTTP 429 |
| Código 2FA errado | 5 por desafio | Desafio cancelado |
| Pedido de "esqueci minha senha" | 3 por e-mail por hora | Novos pedidos ignorados (resposta igual) |

Implementação inicial em memória (`Map` com expiração), suficiente para uma instância. Se o deploy passar a ter várias instâncias, migrar para uma tabela.

### 1.4 Sessão

- JWT continua em cookie `httpOnly`, `sameSite=lax`, `secure` em produção.
- Payload passa a ter `tokenVersion`. `requireAuth` e as rotas `/api/*` buscam o usuário e comparam a versão; diferente → sessão inválida.
- Logout, troca de senha e redefinição de senha incrementam `tokenVersion` (derruba todas as sessões).

### 1.5 Validação interna e proteção do banco

- Todo dado recebido é validado com Zod **no servidor** (formulários e API REST).
- Toda consulta filtra por `userId`. Haverá um teste que cria duas oficinas e garante que uma não lê, edita nem apaga dados da outra.
- Proibido `$queryRawUnsafe` / `$executeRawUnsafe`.
- Telefone e CPF são normalizados (só dígitos) antes de salvar; CPF tem validação de dígito verificador.
- Erros internos nunca devolvem stack trace ao cliente.

### 1.6 Eventos registrados (`SecurityEvent`)

`LOGIN_SUCCESS`, `LOGIN_FAILED`, `ACCOUNT_LOCKED`, `MFA_CODE_SENT`, `MFA_FAILED`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_CHANGED`, `LOGOUT` — com IP, user agent e data.

---

## 2. Esqueci minha senha

1. Link **Esqueci minha senha** na tela de login → `/forgot-password`.
2. Usuário informa o e-mail. A resposta é sempre: *"Se o e-mail estiver cadastrado, você receberá um link em instantes."*
3. Se a conta existir:
   - gera token aleatório de 32 bytes (`crypto.randomBytes`);
   - salva só o hash SHA-256 em `AuthToken` com `type = PASSWORD_RESET` e validade de 30 minutos;
   - invalida pedidos de reset anteriores ainda abertos;
   - envia o link `${APP_URL}/reset-password?token=<token>`.
4. `/reset-password` valida o token (existe, não expirou, não foi usado). Inválido → mensagem e link para pedir outro.
5. Usuário digita a nova senha duas vezes (mesmas regras do cadastro).
6. Ao salvar: senha atualizada, token marcado como usado, `tokenVersion` incrementado, e-mail de aviso *"Sua senha foi alterada"*, redireciona para `/login`.
7. Sem `RESEND_API_KEY` (desenvolvimento), o link é impresso no console do servidor.

---

## 3. Serviços padrão nas Configurações

- Nova seção **Configurações → Serviços padrão**.
- Cada serviço tem: nome, categoria, mão de obra padrão (R$), tempo estimado (minutos), e três intervalos opcionais: **meses**, **km**, **horas de uso**; além de ativo/inativo.
- Toda oficina nova recebe uma cópia dos 18 serviços padrão (lista em [servicos-padrao.md](servicos-padrao.md)). Oficinas existentes recebem a cópia na migration.
- A oficina pode criar, editar, desativar e **restaurar padrões** (recria os que estiverem faltando, sem mexer nos editados).
- Regra do lembrete: vence pelo **primeiro critério atingido**. Meses são calculados pela data; km e horas dependem do odômetro/horas informados no atendimento — sem esse dado, vale só o prazo em meses.
- "Troca de óleo" em bike corresponde a dois serviços reais, ambos na lista: **revisão completa de suspensão** (troca do óleo da suspensão) e **sangria de freio hidráulico** (troca do fluido do freio).

---

## 4. Atendimento, pagamento e retornos

### 4.1 Itens do atendimento

- O atendimento passa a ter um ou mais **itens**. Cada item é um serviço padrão (preenche a mão de obra) ou um item livre.
- Cada item tem: descrição, mão de obra (editável), descrição das peças e valor das peças.
- O total do atendimento é a soma dos itens, **calculada no servidor**.
- O atendimento registra **odômetro (km)** e **horas de uso** da bike na data — ambos opcionais. Ao salvar, os valores atuais da bike são atualizados.

### 4.2 Lembretes de revisão

- Para cada item cujo serviço tenha intervalo, é criado um `MaintenanceReminder` com `dueDate`, `dueKm` e/ou `dueHours`.
- Se o mesmo serviço for feito de novo na mesma bike, o lembrete aberto anterior é fechado (`CONCLUIDO`).
- Estados do lembrete: `ABERTO` → `CONTATADO` → `AGENDADO` → `CONCLUIDO`; ou `DISPENSADO` a qualquer momento.
- Excluir um atendimento exclui seus lembretes.

### 4.3 Pagamento

Hoje não existe controle de pagamento — o status atual (Pendente / Concluído / Cancelado) é do serviço. Novos campos:

- `paymentStatus`: `PENDENTE`, `PARCIAL`, `PAGO` (calculado a partir de `amountPaid` x total, mas editável);
- `amountPaid`, `paymentMethod` (`PIX`, `DINHEIRO`, `DEBITO`, `CREDITO`), `paidAt`;
- botão **Marcar como pago** na lista e no detalhe.

### 4.4 Atendimento ligado a outro

- Campo opcional **Continuação de**, que lista apenas atendimentos anteriores da **mesma bike**.
- Tipo do vínculo: `CONTINUACAO` (serviço em etapas) ou `GARANTIA` (o mesmo problema voltou).
- O detalhe do atendimento mostra a cadeia (original → retornos) em linha do tempo.
- Retornos em garantia alimentam o indicador **taxa de retrabalho**.

---

## 5. Dashboard e WhatsApp

### 5.1 Cards (com filtro de período e comparação com o período anterior)

| Card | Cálculo |
| --- | --- |
| Faturamento | Soma do total dos atendimentos não cancelados no período |
| Ticket médio | Faturamento ÷ nº de atendimentos |
| A receber | Soma de (total − valor pago) dos atendimentos `PENDENTE`/`PARCIAL` |
| Atendimentos em aberto | Status do serviço `PENDENTE` |
| Revisões vencendo | Lembretes `ABERTO` vencidos ou vencendo em até 15 dias |
| Retorno de clientes / retrabalho | % de clientes com mais de um atendimento no período / % de atendimentos `GARANTIA` |

### 5.2 Gráficos (Recharts, já instalado)

| Gráfico | Tipo | Pergunta |
| --- | --- | --- |
| Faturamento por mês (mão de obra x peças) | Barras empilhadas, 12 meses | A oficina está crescendo? De onde vem o dinheiro? |
| Serviços mais realizados | Barras horizontais, top 8 | O que mais vende? |
| Atendimentos por dia da semana | Barras | Quando é o pico? |
| Marcas de bike atendidas | Barras horizontais, top 8 | Que peças manter em estoque? |
| Status de pagamento | Barra de proporção | Quanto do faturado ainda não entrou? |

### 5.3 Listas de ação

- **Clientes para chamar:** lembretes vencidos e vencendo em até 15 dias, do mais urgente ao menos. Colunas: cliente, bike, serviço, vencimento, critério (data / km / horas), ação.
- **Pagamentos pendentes:** cliente, atendimento, valor em aberto, dias em aberto.
- **Atendimentos parados:** status `PENDENTE` há mais de 7 dias.

### 5.4 Botão do WhatsApp

- Abre `https://wa.me/55<telefone>?text=<mensagem codificada>` em nova aba. Sem API paga, sem conta Business.
- Mensagem padrão editável em Configurações, com variáveis `{cliente}`, `{bike}`, `{servico}`, `{oficina}`, `{data_ultimo}`.
- Exemplo: *"Olá João! Aqui é da Oficina X. Já faz 6 meses da manutenção de suspensão da sua Caloi Elite. Vamos agendar a próxima?"*
- Ao clicar, o lembrete vira `CONTATADO` com data. Depois o mecânico pode marcar `AGENDADO` ou `DISPENSADO`.
- Cliente sem telefone válido: botão desabilitado com aviso "Cadastrar telefone".

---

## 6. Conta demo

- Login `demo@oficina.test`; senha vem de `DEMO_PASSWORD` (nunca no código).
- `isDemo = true` → sem 2FA.
- ~40 clientes (CPF válido, telefone brasileiro), ~60 bikes de marcas vendidas no Brasil (Caloi, Specialized, Trek, Oggi, Sense, Scott, Soul, Cannondale), tipos MTB / speed / urbana / e-bike.
- ~300 atendimentos em 12 meses, com mais movimento em fins de semana e no verão.
- Pagamentos: ~85% pagos, ~10% pendentes, ~5% parciais.
- ~15 atendimentos encadeados (continuação e garantia).
- Lembretes calculados a partir da data em que o seed roda, garantindo sempre itens vencidos, vencendo nesta semana e futuros.
- `npm run db:seed` é idempotente: apaga e recria só a conta demo.

---

## Fora do escopo

- Envio automático de WhatsApp (exigiria API oficial da Meta, conta Business verificada e cobrança por conversa).
- 2FA por aplicativo autenticador (TOTP).
- Múltiplos usuários por oficina / permissões.
- Estoque de peças.
