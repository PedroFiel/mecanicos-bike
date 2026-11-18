import { z } from "zod";
import { SERVICE_CATEGORIES } from "~/lib/default-services";

export const serviceTemplateSchema = z.object({
  name: z
    .string()
    .min(3, "O nome deve ter pelo menos 3 caracteres")
    .max(80, "O nome deve ter no máximo 80 caracteres"),
  category: z.enum(SERVICE_CATEGORIES, {
    errorMap: () => ({ message: "Selecione uma categoria válida" }),
  }),
  defaultLaborCost: z.coerce
    .number({ invalid_type_error: "Informe um valor numérico" })
    .min(0, "O valor de mão de obra não pode ser negativo"),
  estimatedMinutes: z.coerce
    .number()
    .int("Deve ser um número inteiro de minutos")
    .positive("Deve ser maior que zero")
    .nullable()
    .optional(),
  intervalMonths: z.coerce
    .number()
    .int("Deve ser um número inteiro de meses")
    .positive("Deve ser maior que zero")
    .nullable()
    .optional(),
  intervalKm: z.coerce
    .number()
    .positive("Deve ser maior que zero")
    .nullable()
    .optional(),
  intervalHours: z.coerce
    .number()
    .positive("Deve ser maior que zero")
    .nullable()
    .optional(),
  active: z.boolean().optional().default(true),
});

export type ServiceTemplateFormData = z.infer<typeof serviceTemplateSchema>;
