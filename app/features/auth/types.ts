import { z } from "zod"

// Schema de validação para login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Endereço de email inválido"),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres"),
})

// Schema de validação para signup
export const signupSchema = z
  .object({
    name: z
      .string()
      .min(1, "Nome é obrigatório")
      .max(100, "Nome deve ter no máximo 100 caracteres"),
    email: z
      .string()
      .min(1, "Email é obrigatório")
      .email("Endereço de email inválido"),
    phone: z
      .string()
      .min(10, "Telefone deve ter no mínimo 10 dígitos")
      .max(15, "Telefone deve ter no máximo 15 dígitos")
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres")
      .max(100, "A senha deve ter no máximo 100 caracteres"),
    confirmPassword: z
      .string()
      .min(1, "Confirmação de senha é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })

// Types inferidos dos schemas
export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>

// Helper para converter ZodError em objeto de erros
export function parseZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  error.issues.forEach((issue) => {
    if (issue.path[0]) {
      errors[issue.path[0].toString()] = issue.message
    }
  })
  return errors
}

// Helper para formatar telefone (reutilizável)
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  }
  return phone
}

