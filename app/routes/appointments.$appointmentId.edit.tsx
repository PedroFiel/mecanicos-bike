import { redirect } from "react-router";
import type { Route } from "./+types/appointments.$appointmentId.edit";
import { requireAuth } from "~/lib/auth.server";
import {
  getAppointmentById,
  updateAppointment,
  listPreviousAppointmentsForBike,
} from "~/services/appointments.server";
import { listServiceTemplates } from "~/services/service-templates.server";
import { AppointmentForm } from "~/features/appointments/components";
import { appointmentFormSchema } from "~/features/appointments/types";
import { z } from "zod";
import type { RouteHandle } from "~/types/route";

export const handle: RouteHandle = {
  title: "Editar Atendimento",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireAuth(request);
  const appointmentId = Number(params.appointmentId);
  const appointment = await getAppointmentById(appointmentId, userId);
  if (!appointment) {
    throw new Response("Atendimento não encontrado", { status: 404 });
  }

  const [serviceTemplates, previousAppointments] = await Promise.all([
    listServiceTemplates(userId, { includeInactive: true }),
    listPreviousAppointmentsForBike(appointment.bikeId, userId, appointmentId),
  ]);

  return { appointment, serviceTemplates, previousAppointments };
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireAuth(request);
  const appointmentId = parseInt(params.appointmentId);
  const formData = await request.formData();

  const rawItemsJson = formData.get("itemsJson") as string;
  let items = [];
  try {
    items = JSON.parse(rawItemsJson || "[]");
  } catch {
    return { errors: { itemsJson: "Lista de itens inválida" } };
  }

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    serviceDate: formData.get("serviceDate"),
    status: formData.get("status"),
    bikeId: formData.get("bikeId"),
    clientId: formData.get("clientId"),
    odometerKm: formData.get("odometerKm") || null,
    usageHours: formData.get("usageHours") || null,
    paymentStatus: formData.get("paymentStatus"),
    amountPaid: formData.get("amountPaid") || 0,
    paymentMethod: formData.get("paymentMethod") || null,
    parentAppointmentId: formData.get("parentAppointmentId") || null,
    linkType: formData.get("linkType") || null,
    itemsJson: rawItemsJson,
  };

  let validatedData: z.infer<typeof appointmentFormSchema>;
  try {
    validatedData = appointmentFormSchema.parse(rawData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        if (issue.path[0]) errors[issue.path[0].toString()] = issue.message;
      });
      return { errors };
    }
    throw error;
  }

  try {
    const updated = await updateAppointment(appointmentId, userId, {
      title: validatedData.title,
      description: validatedData.description || null,
      serviceDate: validatedData.serviceDate,
      status: validatedData.status as any,
      bikeId: validatedData.bikeId,
      odometerKm: validatedData.odometerKm,
      usageHours: validatedData.usageHours,
      paymentStatus: validatedData.paymentStatus as any,
      amountPaid: validatedData.amountPaid,
      paymentMethod: validatedData.paymentMethod as any,
      parentAppointmentId: validatedData.parentAppointmentId,
      linkType: validatedData.linkType as any,
      items,
    });

    if (!updated) {
      return { errors: { general: "Atendimento não encontrado" } };
    }

    return redirect(`/appointments/${appointmentId}`);
  } catch (err: any) {
    return { errors: { general: err.message || "Erro ao atualizar atendimento" } };
  }
}

export default function Page({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { appointment, serviceTemplates, previousAppointments } = loaderData;
  const errors = actionData?.errors;

  const serviceDate = new Date(appointment.serviceDate);
  const formattedDate = serviceDate.toISOString().split("T")[0];

  const defaultValues = {
    title: appointment.title,
    description: appointment.description || "",
    serviceDate: formattedDate,
    status: appointment.status,
    bikeId: appointment.bikeId,
    odometerKm: appointment.odometerKm,
    usageHours: appointment.usageHours,
    paymentStatus: appointment.paymentStatus,
    amountPaid: appointment.amountPaid,
    paymentMethod: appointment.paymentMethod,
    parentAppointmentId: appointment.parentAppointmentId,
    linkType: appointment.linkType,
    items: appointment.items.map((it) => ({
      id: it.id,
      serviceTemplateId: it.serviceTemplateId,
      description: it.description,
      laborCost: it.laborCost,
      partsDescription: it.partsDescription,
      partsCost: it.partsCost,
    })),
  };

  return (
    <div className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold md:text-2xl lg:text-3xl">
          Editar Atendimento
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Atualize os dados do atendimento de {appointment.client.fullName}
        </p>
      </div>

      <div>
        <AppointmentForm
          errors={errors}
          defaultValues={defaultValues}
          isEdit
          appointmentId={appointment.id}
          clientId={appointment.clientId}
          clientName={appointment.client.fullName}
          bikes={appointment.client.bikes}
          serviceTemplates={serviceTemplates}
          previousAppointments={previousAppointments}
        />
      </div>
    </div>
  );
}
