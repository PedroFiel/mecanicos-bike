# Cadastros externos, acessos e variáveis de ambiente

O único serviço novo é o **Resend**. O resto é acesso ao que o projeto já usa (Turso e a hospedagem) e variáveis novas no `.env`. O WhatsApp não exige cadastro.

## Checklist do time (fora do código)

| # | Ação | Necessário para | Responsável |
| --- | --- | --- | --- |
| 1 | Gerar um `JWT_SECRET` novo com 64 caracteres aleatórios (`openssl rand -hex 32`) e trocar no `.env` local e na hospedagem | Fase 0 | — |
| 2 | Garantir acesso ao CLI do Turso (`turso auth login`) e saber o nome do banco de produção | Fase 0 (e toda migration) | — |
| 3 | Garantir acesso à hospedagem (o `Dockerfile` indica Fly.io) para cadastrar secrets | Fase 0 | — |
| 4 | Criar conta no [Resend](https://resend.com) (plano grátis: 3.000 e-mails/mês, 100/dia) | Fase 1 | — |
| 5 | Gerar API key no Resend com permissão **Sending access** | Fase 1 | — |
| 6 | Decidir o remetente (ver abaixo) | Fase 1 | — |
| 7 | (Uso real) Ter um domínio, adicioná-lo no Resend e criar no DNS os registros indicados (SPF, DKIM e, recomendado, DMARC) | Fase 1 em produção | — |
| 8 | Cadastrar `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` na hospedagem | Fase 1 em produção | — |
| 9 | Definir `DEMO_PASSWORD` e cadastrá-la onde o seed for rodar | Fase 5 | — |

### Sobre o remetente do Resend

- **Sem domínio próprio:** só é possível enviar de `onboarding@resend.dev` e **apenas para o e-mail do dono da conta Resend**. Serve para desenvolvimento e para apresentar o fluxo, não para usuários reais.
- **Com domínio verificado:** envio para qualquer destinatário, ex.: `Mecânicos Bike <nao-responda@seudominio.com.br>`. A verificação de DNS costuma levar de minutos a algumas horas.

## Variáveis de ambiente

| Variável | Existe hoje? | Obrigatória | Uso |
| --- | --- | --- | --- |
| `DATABASE_URL` | sim | sim | Banco local do Prisma CLI |
| `TURSO_DATABASE_URL` | sim | sim | Banco usado pela aplicação |
| `TURSO_AUTH_TOKEN` | sim | sim | Autenticação no Turso |
| `JWT_SECRET` | sim | sim (≥ 32 caracteres) | Assinatura da sessão — **trocar** |
| `RESEND_API_KEY` | não | em produção | Envio de e-mails. Sem ela, os e-mails são impressos no console |
| `EMAIL_FROM` | não | em produção | Remetente dos e-mails |
| `APP_URL` | não | sim | URL pública, usada nos links de redefinição de senha |
| `DEMO_PASSWORD` | não | só para o seed | Senha da conta demo |

Na Fase 0 será criado um `.env.example` versionado com todas essas chaves e nenhum valor real, e um `app/lib/env.server.ts` que valida tudo com Zod ao subir o servidor.

## O que não precisa de cadastro

- **WhatsApp:** o link `https://wa.me/<número>?text=<mensagem>` é público e gratuito.
- **Gráficos:** Recharts já está instalado.
- **Dados falsos:** `@faker-js/faker` já está instalado.
