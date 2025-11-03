import { z } from "zod"

export const bikeFormSchema = z.object({
  model: z
    .string()
    .min(1, "Modelo é obrigatório")
    .max(100, "Modelo deve ter no máximo 100 caracteres"),
  brand: z
    .string()
    .max(50, "Marca deve ter no máximo 50 caracteres")
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .max(30, "Cor deve ter no máximo 30 caracteres")
    .optional()
    .or(z.literal("")),
  frameNumber: z
    .string()
    .max(50, "Número do quadro deve ter no máximo 50 caracteres")
    .optional()
    .or(z.literal("")),
  characteristics: z
    .string()
    .max(500, "Características devem ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
})

export type BikeFormData = z.infer<typeof bikeFormSchema>

export function getBikeDisplayName(bike: {
  model: string
  brand?: string | null
  color?: string | null
}): string {
  const parts = [bike.brand, bike.model, bike.color].filter(Boolean)
  return parts.join(" - ")
}

export function getBikeShortLabel(bike: {
  model: string
  brand?: string | null
}): string {
  return bike.brand ? `${bike.brand} ${bike.model}` : bike.model
}

