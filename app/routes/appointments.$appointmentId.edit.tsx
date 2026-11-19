import { redirect } from "react-router";
import type { Route } from "./+types/appointments.$appointmentId.edit";
import { requireAuth } from "~/lib/auth.server";
import {
  getAppointmentById,
  updateAppointment,
  listLinkableAppointments,
} from "~/services/appointments.server";
import { listServiceTemplates } from "~/services/service-templates.server";
import { AppointmentForm } from "~/features/appointments/components";
import { toDateInputValue } from "~/features/appointments/types";
import { appointmentErrorMessage, parseAppointmentForm } from "~/features/appointments/form.server";
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
    listLinkableAppointments(appointment.clientId, userId),
  ]);

  return { appointment, serviceTemplates, previousAppointments };
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireAuth(request);
  const appointmentId = Number(params.appointmentId);
  const formData = await request.formData();

  const parsed = parseAppointmentForm(formData, formData.get("clientId"));
  if (parsed.errors) return { errors: parsed.errors };
  const { data } = parsed;

  try {
    const updated = await updateAppointment(appointmentId, userId, {
      title: data.title,
      description: data.description || null,
      serviceDate: data.serviceDate,
      status: data.status,
      bikeId: data.bikeId,
      odometerKm: data.odometerKm ?? null,
      usageHours: data.usageHours ?? null,
      paymentStatus: data.paymentStatus,
      amountPaid: data.amountPaid,
      paymentMethod: data.paymentMethod ?? null,
      parentAppointmentId: data.parentAppointmentId ?? null,
      linkType: data.linkType ?? null,
      items: data.items,
    });

    if (!updated) {
      return { errors: { general: "Atendimento, bike, serviço ou atendimento de origem indisponível." } };
    }

    return redirect(`/appointments/${appointmentId}`);
  } catch (error) {
    return { errors: appointmentErrorMessage(error, "Não foi possível atualizar o atendimento. Tente novamente.") };
  }
}

export default function Page({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { appointment, serviceTemplates, previousAppointments } = loaderData;
  const errors = actionData?.errors;

  const formattedDate = toDateInputValue(appointment.serviceDate);

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
