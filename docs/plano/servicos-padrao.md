# Serviços padrão — pesquisa de mercado

Lista que toda oficina recebe pré-cadastrada. Valores são **mão de obra sem peças**, em reais, e cada oficina pode editar.

Pesquisa feita em 17/11/2026 a partir de tabelas publicadas por oficinas brasileiras. Algumas páginas têm mais de um ano, então os números são ponto de partida, não preço oficial.

## Lista

| # | Serviço | Categoria | Mão de obra (R$) | Tempo est. (min) | Meses | Km | Horas | Base do valor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Revisão básica (limpeza + regulagens) | Revisão | 120 | 60 | 4 | 1.500 | — | média de 4 oficinas (R$ 80–139) |
| 2 | Revisão completa | Revisão | 260 | 180 | 12 | 5.000 | — | média de 6 oficinas (R$ 190–450) |
| 3 | Revisão completa e-bike | Revisão | 490 | 240 | 12 | 5.000 | — | média de 3 oficinas (R$ 350–640) |
| 4 | Regulagem de câmbio | Transmissão | 60 | 20 | — | — | — | R$ 50–70 |
| 5 | Regulagem de freio | Freios | 60 | 20 | — | — | — | R$ 50–70 |
| 6 | Limpeza e lubrificação da transmissão | Transmissão | 70 | 40 | 2 | 800 | — | R$ 60–79 |
| 7 | Troca de corrente | Transmissão | 30 | 15 | 12 | 3.000 | — | 1 oficina |
| 8 | Troca de cassete / coroas | Transmissão | 40 | 30 | 24 | 9.000 | — | **estimativa** (sem preço publicado) |
| 9 | Troca de cabos e conduítes | Transmissão | 60 | 45 | 12 | — | — | **estimativa** (sem preço publicado) |
| 10 | Sangria de freio hidráulico (por freio) | Freios | 65 | 30 | 12 | — | — | média de 3 oficinas (R$ 40–80) |
| 11 | Troca de pastilhas / sapatas | Freios | 40 | 20 | 6 | 2.000 | — | **estimativa** (sem preço publicado) |
| 12 | Manutenção de suspensão 50h | Suspensão | 150 | 60 | 6 | — | 50 | média de 4 fontes (R$ 100–275) |
| 13 | Revisão completa de suspensão (troca de óleo) | Suspensão | 230 | 120 | 12 | — | 200 | média de 2 fontes (R$ 199–255) |
| 14 | Revisão da balança (full suspension) | Suspensão | 140 | 90 | 12 | — | 100 | 1 oficina |
| 15 | Revisão de cubos (por roda) | Rodas | 45 | 30 | 12 | — | — | R$ 30–60 |
| 16 | Lubrificação do movimento central | Rodas | 50 | 30 | 12 | — | — | 1 oficina |
| 17 | Centragem de roda | Rodas | 50 | 30 | — | — | — | 1 oficina |
| 18 | Reposição de selante tubeless | Rodas | 40 | 20 | 4 | — | — | **estimativa** (sem preço publicado) |

- **Intervalos:** referências de mercado e de fabricantes (ex.: a revisão "50 horas" de suspensão é nomenclatura comum de oficinas e fabricantes). Também são editáveis.
- **Regra:** o lembrete vence pelo primeiro critério atingido. Serviços sem nenhum intervalo (regulagens, centragem) não geram lembrete.
- **Revisão completa de suspensão de alto nível** (full rebuild Fox/RockShox) chega a R$ 1.000+; ficou fora da média por ser outro serviço. A oficina pode cadastrá-la à parte.

## Como os dados entram no código

Arquivo `app/lib/default-services.ts` exportando um array tipado:

```ts
export const DEFAULT_SERVICES = [
  {
    key: "revisao-basica",
    name: "Revisão básica (limpeza + regulagens)",
    category: "REVISAO",
    defaultLaborCost: 120,
    estimatedMinutes: 60,
    intervalMonths: 4,
    intervalKm: 1500,
    intervalHours: null,
  },
  // ...
] as const
```

O campo `key` permite o "restaurar padrões" saber quais serviços faltam sem depender do nome (que a oficina pode editar).

## Fontes

- [Aro 27 Bike (São Paulo)](https://www.aro27.com/pre%C3%A7os) — revisões por tipo de bike
- [Bert Bike Store (Belo Horizonte)](https://bertbikestore.com.br/revisao-bicicletas/) — níveis de revisão, regulagens, balança
- [Super Bike 101 (Brasília)](https://www.superbike101.com.br/tabela-de-precos/) — tabela completa (suspensão, sangria, cubos, corrente, rodas)
- [De Bike](https://debike.com.br/site/conteudo/20-tabela-de-servicos.html) — lavagem, revisões
- [Las Magrelas](https://lasmagrelas.com.br/oficina/) — revisão completa e e-bike
- [Bike Portella (Curitiba)](https://www.bikeportella.com.br/oficina.php) — revisão, sangria, suspensão (página fora do ar na consulta; valores do resultado de busca)
- [Digão Bikes](https://www.digaobikes.com.br/servicos/) — sangria, revisão simples
- [AllSports — serviços de suspensão](https://www.allsports.com.br/categoria-produto/servicos/suspensao-servicos/) — revisão 50h Fox/RockShox
- [Shopbike — revisão de suspensão](https://www.shopbike.com.br/revisao-suspencao/p/7543)
- [Corsa Bike Parts (review MTB Brasília)](https://www.mtbbrasilia.com.br/2023/01/17/review-manutencao-de-suspensoes-pela-corsa-bike-parts/)
