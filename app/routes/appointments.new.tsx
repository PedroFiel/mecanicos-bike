import { redirect } from "react-router";
import type { Route } from "./+types/appointments.new";
import { requireAuth } from "~/lib/auth.server";
import { getClientById } from "~/services/clients.server";
import {
  createAppointment,
  listLinkableAppointments,
} from "~/services/appointments.server";
import { listServiceTemplates } from "~/services/service-templates.server";
import { AppointmentForm } from "~/features/appointments/components";
import { appointmentErrorMessage, parseAppointmentForm } from "~/features/appointments/form.server";
import type { RouteHandle } from "~/types/route";

export const handle: RouteHandle = {
  title: "Novo Atendimento",
};

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireAuth(request);
  const url = new URL(request.url);
  const clientIdParam = url.searchParams.get("clientId");

  if (!clientIdParam) throw redirect("/clients");

  const [client, serviceTemplates, previousAppointments] = await Promise.all([
    getClientById(Number(clientIdParam), userId),
    listServiceTemplates(userId, { includeInactive: false }),
    listLinkableAppointments(Number(clientIdParam), userId),
  ]);

  if (!client) throw new Response("Cliente não encontrado", { status: 404 });

  if (client.bikes.length === 0) {
    throw redirect(`/clients/${clientIdParam}?tab=bikes`);
  }

  return {
    client,
    serviceTemplates,
    previousAppointments,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireAuth(request);
  const formData = await request.formData();
  const clientIdParam = new URL(request.url).searchParams.get("clientId");

  if (!clientIdParam) return { errors: { general: "Cliente não especificado" } };

  const parsed = parseAppointmentForm(formData, clientIdParam);
  if (parsed.errors) return { errors: parsed.errors };
  const { data } = parsed;

  try {
    const appointment = await createAppointment(userId, {
      clientId: data.clientId,
      bikeId: data.bikeId,
      title: data.title,
      description: data.description || null,
      serviceDate: data.serviceDate,
      status: data.status,
      odometerKm: data.odometerKm,
      usageHours: data.usageHours,
      paymentStatus: data.paymentStatus,
      amountPaid: data.amountPaid,
      paymentMethod: data.paymentMethod,
      parentAppointmentId: data.parentAppointmentId,
      linkType: data.linkType,
      items: data.items,
    });

    if (!appointment) return { errors: { general: "Cliente, bike, serviço ou atendimento de origem indisponível." } };
    return redirect(`/clients/${clientIdParam}?tab=atendimentos`);
  } catch (error) {
    return { errors: appointmentErrorMessage(error, "Não foi possível salvar o atendimento. Tente novamente.") };
  }
}

export default function Page({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { client, serviceTemplates, previousAppointments } = loaderData;
  const errors = actionData?.errors;

  return (
    <div className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold md:text-2xl lg:text-3xl">
          Novo Atendimento
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Cadastre um novo atendimento para {client.fullName}
        </p>
      </div>

      <div>
        <AppointmentForm
          errors={errors}
          clientId={client.id}
          clientName={client.fullName}
          bikes={client.bikes}
          serviceTemplates={serviceTemplates}
          previousAppointments={previousAppointments}
        />
      </div>
    </div>
  );
}
