# Fase 1 — Segurança: e-mail, 2FA e esqueci minha senha

**Branch:** `feat/fase-1-seguranca` · **Depende de:** Fase 0 · **Pode rodar em paralelo com:** Fases 2, 3 e 4

**Objetivo:** login em duas etapas com código por e-mail, recuperação de senha, bloqueio de força bruta e sessões que podem ser invalidadas. Detalhes funcionais em [escopo.md §1 e §2](../escopo.md).

## Tarefas de código

### 1.1 Infra de e-mail
- [ ] `npm install resend`.
- [ ] `app/lib/email.server.ts`:
  - `sendEmail({ to, subject, html, text })`;
  - com `RESEND_API_KEY`: envia via Resend; sem a chave: imprime destinatário, assunto e corpo no console;
  - nunca lança erro para o usuário final — loga e segue (o fluxo de login mostra "não foi possível enviar o código, tente novamente").
- [ ] `app/lib/email-templates.ts` com três modelos (HTML simples + texto puro):
  - código de login (código em destaque, validade de 10 minutos, aviso "se não foi você, troque sua senha");
  - link de redefinição de senha (botão + link em texto, validade de 30 minutos);
  - aviso de senha alterada.

### 1.2 Banco
- [ ] Migration `seguranca_auth`: campos novos de `User` (`tokenVersion`, `failedLoginCount`, `lockedUntil`, `isDemo`), tabelas `AuthToken` e `SecurityEvent` (ver [modelo-de-dados.md](../modelo-de-dados.md)).

### 1.3 Serviços
- [ ] `app/services/auth-tokens.server.ts`:
  - `createLoginCode(userId)` → gera 6 dígitos, salva hash, retorna código;
  - `verifyLoginCode(challengeId, code)` → confere hash, validade, tentativas; incrementa `attempts`;
  - `createPasswordResetToken(userId)` / `consumePasswordResetToken(token)`;
  - `createTrustedDevice(userId)` / `isTrustedDevice(userId, cookieValue)`;
  - limpeza de tokens expirados ao criar novos.
- [ ] `app/services/security-events.server.ts` → `logSecurityEvent(type, { userId, request })`.
- [ ] `app/lib/rate-limit.server.ts` → limitador em memória por chave (`ip:login`, `email:reset`), janela deslizante.

### 1.4 Sessão
- [ ] `JWTPayload` ganha `tokenVersion`.
- [ ] `requireAuth` passa a buscar o usuário e comparar `tokenVersion`; diferente → limpa cookie e redireciona para `/login`.
- [ ] Mesma checagem num helper `requireApiUser(request)` usado em todas as rotas `app/routes/api.*.ts` (substitui `getUserFromRequest` direto).
- [ ] `logout` incrementa `tokenVersion`.

### 1.5 Login em duas etapas
- [ ] `app/routes/login.tsx`:
  - mensagem única "E-mail ou senha inválidos" (remove "Email não encontrado");
  - checa `lockedUntil` e o rate limit por IP;
  - senha errada → `failedLoginCount++`; na 5ª, `lockedUntil = agora + 15 min` e evento `ACCOUNT_LOCKED`;
  - senha certa → zera contador; se `isDemo` ou dispositivo confiável → cria sessão; senão cria código, envia e-mail, grava cookie `mfa_challenge` e redireciona para `/login/verify`.
- [ ] Nova rota `app/routes/login.verify.tsx` (registrar em `app/routes.ts`):
  - campo de 6 dígitos (`inputMode="numeric"`, `autoComplete="one-time-code"`);
  - checkbox "Confiar neste dispositivo por 30 dias";
  - botão "Reenviar código" com contagem de 60 s;
  - link "Voltar ao login".
- [ ] Componente `app/features/auth/components/verify-code-form.tsx`.

### 1.6 Esqueci minha senha
- [ ] Link "Esqueci minha senha" em `app/components/login-form.tsx`.
- [ ] `app/routes/forgot-password.tsx` — formulário de e-mail; resposta sempre igual; rate limit 3/h por e-mail.
- [ ] `app/routes/reset-password.tsx` — lê `?token=`, valida, formulário de nova senha + confirmação; ao salvar troca a senha, consome o token, incrementa `tokenVersion`, envia aviso e redireciona para `/login` com toast.
- [ ] Registrar as duas rotas em `app/routes.ts` fora do layout autenticado.

### 1.7 Regras de senha
- [ ] Em `app/features/auth/types.ts`: mínimo 8 caracteres, ao menos uma letra e um número; reutilizado no cadastro, no reset e na troca de senha em `/account`.

## Tarefas externas
- [ ] Criar conta Resend e API key (Sending access).
- [ ] Desenvolvimento: usar `onboarding@resend.dev` (só entrega no e-mail do dono da conta).
- [ ] Produção: verificar domínio no Resend (SPF, DKIM, DMARC) e cadastrar `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` na hospedagem.
- [ ] Aplicar a migration no Turso.

## Testes / verificação
- [ ] E-mail inexistente e senha errada mostram a mesma mensagem.
- [ ] 5 senhas erradas bloqueiam a conta por 15 minutos.
- [ ] Sem o código não há sessão (acessar `/dashboard` com só o cookie `mfa_challenge` redireciona para login).
- [ ] Código expirado (forçar `expiresAt` no passado) é recusado.
- [ ] 5 códigos errados cancelam o desafio.
- [ ] "Confiar neste dispositivo" pula o código no próximo login.
- [ ] Link de reset funciona uma vez; na segunda, mostra "link inválido ou expirado".
- [ ] Após reset, uma sessão aberta em outro navegador cai na próxima requisição.
- [ ] Logout invalida o token antigo (copiar o cookie antes e reusar → 401 na API).
- [ ] Eventos aparecem em `security_events`.

## Pronto quando
Não é possível entrar sem o código enviado por e-mail, o reset funciona de ponta a ponta e sessões antigas caem após logout ou troca de senha.
