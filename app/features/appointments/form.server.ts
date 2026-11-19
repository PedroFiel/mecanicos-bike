import { z } from "zod";
import { AppointmentRuleError } from "~/services/appointments.server";
import { appointmentFormSchema, type AppointmentFormData } from "./types";

type FormErrors = Record<string, string>;

/** Converte os erros do Zod em mensagens por campo; erros de itens vão para "itemsJson". */
function zodErrors(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    const [field, index] = issue.path;
    if (field === "items") {
      errors.itemsJson ??= typeof index === "number"
        ? `Item ${index + 1}: ${issue.message}`
        : issue.message;
    } else if (field !== undefined) {
      errors[String(field)] ??= issue.message;
    }
  }
  return errors;
}

/** Lê e valida o formulário de atendimento (campos + lista de itens em JSON). */
export function parseAppointmentForm(
  formData: FormData,
  clientId: FormDataEntryValue | string | null,
): { data: AppointmentFormData; errors?: undefined } | { data?: undefined; errors: FormErrors } {
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("itemsJson") ?? "[]"));
  } catch {
    return { errors: { itemsJson: "Lista de itens inválida" } };
  }

  const value = (name: string) => {
    const entry = formData.get(name);
    return typeof entry === "string" && entry.trim() !== "" ? entry : null;
  };

  const result = appointmentFormSchema.safeParse({
    title: value("title") ?? "",
    description: value("description"),
    serviceDate: value("serviceDate") ?? "",
    status: value("status") ?? undefined,
    bikeId: value("bikeId"),
    clientId,
    odometerKm: value("odometerKm"),
    usageHours: value("usageHours"),
    paymentStatus: value("paymentStatus") ?? undefined,
    amountPaid: value("amountPaid") ?? 0,
    paymentMethod: value("paymentMethod"),
    parentAppointmentId: value("parentAppointmentId"),
    linkType: value("linkType"),
    items,
  });

  return result.success ? { data: result.data } : { errors: zodErrors(result.error) };
}

/** Transforma exceções em mensagem segura para o usuário (sem detalhes internos). */
export function appointmentErrorMessage(error: unknown, fallback: string): FormErrors {
  if (error instanceof AppointmentRuleError) {
    return { [error.field === "items" ? "itemsJson" : error.field]: error.message, general: error.message };
  }
  console.error("[atendimento]", error);
  return { general: fallback };
}
