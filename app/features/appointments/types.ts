import { z } from "zod";

export const AppointmentStatus = {
  PENDENTE: "PENDENTE",
  CONCLUIDO: "CONCLUIDO",
  CANCELADO: "CANCELADO",
} as const;

export type AppointmentStatusType = keyof typeof AppointmentStatus;

export const PaymentStatus = {
  PENDENTE: "PENDENTE",
  PARCIAL: "PARCIAL",
  PAGO: "PAGO",
} as const;

export type PaymentStatusType = keyof typeof PaymentStatus;

export const PaymentMethod = {
  PIX: "PIX",
  DINHEIRO: "DINHEIRO",
  DEBITO: "DEBITO",
  CREDITO: "CREDITO",
} as const;

export type PaymentMethodType = keyof typeof PaymentMethod;

export const AppointmentLinkType = {
  CONTINUACAO: "CONTINUACAO",
  GARANTIA: "GARANTIA",
} as const;

export type AppointmentLinkTypeValue = keyof typeof AppointmentLinkType;

export const ReminderStatus = {
  ABERTO: "ABERTO",
  CONTATADO: "CONTATADO",
  AGENDADO: "AGENDADO",
  CONCLUIDO: "CONCLUIDO",
  DISPENSADO: "DISPENSADO",
} as const;

export type ReminderStatusType = keyof typeof ReminderStatus;

// Schema para cada item individual do atendimento
export const appointmentItemSchema = z.object({
  id: z.coerce.number().optional(),
  serviceTemplateId: z.coerce.number().optional().nullable(),
  description: z.string().min(1, "Descrição do item é obrigatória"),
  laborCost: z.coerce.number().min(0, "Mão de obra deve ser positiva").default(0),
  partsDescription: z.string().optional().nullable(),
  partsCost: z.coerce.number().min(0, "Valor das peças deve ser positivo").default(0),
});

export type AppointmentItemFormData = z.infer<typeof appointmentItemSchema>;

// Schema do formulário de atendimento completo
export const appointmentFormSchema = z.object({
  title: z
    .string()
    .min(3, "Título deve ter no mínimo 3 caracteres")
    .max(100, "Título deve ter no máximo 100 caracteres"),
  description: z
    .string()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
  serviceDate: z.string().min(1, "Data do serviço é obrigatória"),
  status: z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]).default("CONCLUIDO"),
  bikeId: z.coerce.number().positive("Bike é obrigatória"),
  clientId: z.coerce.number().positive("Cliente é obrigatório"),

  // Telemetria
  odometerKm: z.coerce.number().min(0).optional().nullable(),
  usageHours: z.coerce.number().min(0).optional().nullable(),

  // Pagamento
  paymentStatus: z.enum(["PENDENTE", "PARCIAL", "PAGO"]).default("PENDENTE"),
  amountPaid: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["PIX", "DINHEIRO", "DEBITO", "CREDITO"]).optional().nullable(),
  paidAt: z.string().optional().nullable(),

  // Encadeamento / Vínculo
  parentAppointmentId: z.coerce.number().optional().nullable(),
  linkType: z.enum(["CONTINUACAO", "GARANTIA"]).optional().nullable(),

  // Itens em formato JSON string no FormData
  itemsJson: z.string().min(2, "O atendimento deve ter pelo menos um item"),
});

export type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

// Formatadores
export function formatStatus(status: AppointmentStatusType | string): string {
  const statusMap: Record<string, string> = {
    PENDENTE: "Pendente",
    CONCLUIDO: "Concluído",
    CANCELADO: "Cancelado",
  };
  return statusMap[status] || status;
}

export function formatPaymentStatus(status: PaymentStatusType | string): string {
  const map: Record<string, string> = {
    PENDENTE: "Pendente",
    PARCIAL: "Parcial",
    PAGO: "Pago",
  };
  return map[status] || status;
}

export function formatPaymentMethod(method?: PaymentMethodType | string | null): string {
  if (!method) return "—";
  const map: Record<string, string> = {
    PIX: "Pix",
    DINHEIRO: "Dinheiro",
    DEBITO: "Cartão de Débito",
    CREDITO: "Cartão de Crédito",
  };
  return map[method] || method;
}

export function formatLinkType(type?: AppointmentLinkTypeValue | string | null): string {
  if (!type) return "";
  const map: Record<string, string> = {
    CONTINUACAO: "Continuação de serviço",
    GARANTIA: "Retorno em garantia",
  };
  return map[type] || type;
}

export function formatReminderStatus(status: ReminderStatusType | string): string {
  const map: Record<string, string> = {
    ABERTO: "Aberto",
    CONTATADO: "Contatado",
    AGENDADO: "Agendado",
    CONCLUIDO: "Concluído",
    DISPENSADO: "Dispensado",
  };
  return map[status] || status;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR");
}

export function formatCurrency(value?: number | null): string {
  if (value == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getStatusColor(
  status: AppointmentStatusType | string
): "default" | "secondary" | "destructive" | "outline" {
  const colorMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PENDENTE: "secondary",
    CONCLUIDO: "default",
    CANCELADO: "destructive",
  };
  return colorMap[status] || "default";
}

export function getPaymentStatusBadge(
  status: PaymentStatusType | string
): { label: string; className: string } {
  switch (status) {
    case "PAGO":
      return {
        label: "Pago",
        className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      };
    case "PARCIAL":
      return {
        label: "Parcial",
        className: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      };
    case "PENDENTE":
    default:
      return {
        label: "Pendente",
        className: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800",
      };
  }
}
