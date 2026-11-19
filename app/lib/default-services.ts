/**
 * default-services.ts
 *
 * Lista padrão de 18 serviços baseada em pesquisa de mercado de oficinas brasileiras
 * (valores de mão de obra sem peças, tempo estimado e intervalos de revisão).
 * Cada nova oficina recebe essa lista copiada para a tabela ServiceTemplate.
 */

export const SERVICE_CATEGORIES = [
  "Revisão",
  "Transmissão",
  "Freios",
  "Suspensão",
  "Rodas",
  "Outro",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export interface DefaultServiceItem {
  key: string;
  name: string;
  category: ServiceCategory;
  defaultLaborCost: number;
  estimatedMinutes: number;
  intervalMonths: number | null;
  intervalKm: number | null;
  intervalHours: number | null;
}

export const DEFAULT_SERVICES: readonly DefaultServiceItem[] = [
  {
    key: "revisao-basica",
    name: "Revisão básica (limpeza + regulagens)",
    category: "Revisão",
    defaultLaborCost: 120,
    estimatedMinutes: 60,
    intervalMonths: 4,
    intervalKm: 1500,
    intervalHours: null,
  },
  {
    key: "revisao-completa",
    name: "Revisão completa",
    category: "Revisão",
    defaultLaborCost: 260,
    estimatedMinutes: 180,
    intervalMonths: 12,
    intervalKm: 5000,
    intervalHours: null,
  },
  {
    key: "revisao-completa-ebike",
    name: "Revisão completa e-bike",
    category: "Revisão",
    defaultLaborCost: 490,
    estimatedMinutes: 240,
    intervalMonths: 12,
    intervalKm: 5000,
    intervalHours: null,
  },
  {
    key: "regulagem-cambio",
    name: "Regulagem de câmbio",
    category: "Transmissão",
    defaultLaborCost: 60,
    estimatedMinutes: 20,
    intervalMonths: null,
    intervalKm: null,
    intervalHours: null,
  },
  {
    key: "regulagem-freio",
    name: "Regulagem de freio",
    category: "Freios",
    defaultLaborCost: 60,
    estimatedMinutes: 20,
    intervalMonths: null,
    intervalKm: null,
    intervalHours: null,
  },
  {
    key: "limpeza-lubrificacao-transmissao",
    name: "Limpeza e lubrificação da transmissão",
    category: "Transmissão",
    defaultLaborCost: 70,
    estimatedMinutes: 40,
    intervalMonths: 2,
    intervalKm: 800,
    intervalHours: null,
  },
  {
    key: "troca-corrente",
    name: "Troca de corrente",
    category: "Transmissão",
    defaultLaborCost: 30,
    estimatedMinutes: 15,
    intervalMonths: 12,
    intervalKm: 3000,
    intervalHours: null,
  },
  {
    key: "troca-cassete-coroas",
    name: "Troca de cassete / coroas",
    category: "Transmissão",
    defaultLaborCost: 40,
    estimatedMinutes: 30,
    intervalMonths: 24,
    intervalKm: 9000,
    intervalHours: null,
  },
  {
    key: "troca-cabos-conduites",
    name: "Troca de cabos e conduítes",
    category: "Transmissão",
    defaultLaborCost: 60,
    estimatedMinutes: 45,
    intervalMonths: 12,
    intervalKm: null,
    intervalHours: null,
  },
  {
    key: "sangria-freio-hidraulico",
    name: "Sangria de freio hidráulico (por freio)",
    category: "Freios",
    defaultLaborCost: 65,
    estimatedMinutes: 30,
    intervalMonths: 12,
    intervalKm: null,
    intervalHours: null,
  },
  {
    key: "troca-pastilhas-sapatas",
    name: "Troca de pastilhas / sapatas",
    category: "Freios",
    defaultLaborCost: 40,
    estimatedMinutes: 20,
    intervalMonths: 6,
    intervalKm: 2000,
    intervalHours: null,
  },
  {
    key: "manutencao-suspensao-50h",
    name: "Manutenção de suspensão 50h",
    category: "Suspensão",
    defaultLaborCost: 150,
    estimatedMinutes: 60,
    intervalMonths: 6,
    intervalKm: null,
    intervalHours: 50,
  },
  {
    key: "revisao-completa-suspensao",
    name: "Revisão completa de suspensão (troca de óleo)",
    category: "Suspensão",
    defaultLaborCost: 230,
    estimatedMinutes: 120,
    intervalMonths: 12,
    intervalKm: null,
    intervalHours: 200,
  },
  {
    key: "revisao-balanca",
    name: "Revisão da balança (full suspension)",
    category: "Suspensão",
    defaultLaborCost: 140,
    estimatedMinutes: 90,
    intervalMonths: 12,
    intervalKm: null,
    intervalHours: 100,
  },
  {
    key: "revisao-cubos",
    name: "Revisão de cubos (por roda)",
    category: "Rodas",
    defaultLaborCost: 45,
    estimatedMinutes: 30,
    intervalMonths: 12,
    intervalKm: null,
    intervalHours: null,
  },
  {
    key: "lubrificacao-movimento-central",
    name: "Lubrificação do movimento central",
    category: "Rodas",
    defaultLaborCost: 50,
    estimatedMinutes: 30,
    intervalMonths: 12,
    intervalKm: null,
    intervalHours: null,
  },
  {
    key: "centragem-roda",
    name: "Centragem de roda",
    category: "Rodas",
    defaultLaborCost: 50,
    estimatedMinutes: 30,
    intervalMonths: null,
    intervalKm: null,
    intervalHours: null,
  },
  {
    key: "reposicao-selante-tubeless",
    name: "Reposição de selante tubeless",
    category: "Rodas",
    defaultLaborCost: 40,
    estimatedMinutes: 20,
    intervalMonths: 4,
    intervalKm: null,
    intervalHours: null,
  },
] as const;

/**
 * Modelo padrão de mensagem do WhatsApp para lembretes de revisão.
 * Variáveis suportadas:
 * - {cliente} : Nome do cliente
 * - {bike}    : Modelo/marca da bike
 * - {servico} : Nome do serviço de revisão
 * - {oficina} : Nome da oficina
 * - {data_ultimo} : Data do último atendimento
 */
export const DEFAULT_WHATSAPP_TEMPLATE =
  "Olá {cliente}! Aqui é da {oficina}. Notamos que sua bike {bike} já está no período recomendado para a revisão de {servico}. Vamos agendar o seu atendimento?";
