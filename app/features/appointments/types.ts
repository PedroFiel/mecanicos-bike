import { z } from "zod"

export const AppointmentStatus = {
  PENDENTE: "PENDENTE",
  CONCLUIDO: "CONCLUIDO",
  CANCELADO: "CANCELADO",
} as const

export type AppointmentStatusType = keyof typeof AppointmentStatus

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
  serviceDate: z
    .string()
    .min(1, "Data do serviço é obrigatória"),
  status: z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]),
  totalCost: z
    .string()
    .optional()
    .or(z.literal("")),
  bikeId: z
    .string()
    .min(1, "Bike é obrigatória"),
})

export type AppointmentFormData = z.infer<typeof appointmentFormSchema>

export const serviceDetailSchema = z.object({
  partReplaced: z
    .string()
    .max(200, "Peça substituída deve ter no máximo 200 caracteres")
    .optional()
    .or(z.literal("")),
  workDone: z
    .string()
    .max(500, "Trabalho realizado deve ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
  cost: z
    .string()
    .optional()
    .or(z.literal("")),
})

export type ServiceDetailFormData = z.infer<typeof serviceDetailSchema>

export function formatStatus(status: AppointmentStatusType): string {
  const statusMap: Record<AppointmentStatusType, string> = {
    PENDENTE: "Pendente",
    CONCLUIDO: "Concluído",
    CANCELADO: "Cancelado",
  }
  return statusMap[status]
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("pt-BR")
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("pt-BR")
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function getStatusColor(status: AppointmentStatusType): "default" | "secondary" | "destructive" {
  const colorMap: Record<AppointmentStatusType, "default" | "secondary" | "destructive"> = {
    PENDENTE: "secondary",
    CONCLUIDO: "default",
    CANCELADO: "destructive",
  }
  return colorMap[status]
}

