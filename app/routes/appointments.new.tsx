import { redirect } from "react-router";
import type { Route } from "./+types/appointments.new";
import { requireAuth } from "~/lib/auth.server";
import { getClientById } from "~/services/clients.server";
import {
  createAppointment,
  listAppointments,
} from "~/services/appointments.server";
import { listServiceTemplates } from "~/services/service-templates.server";
import { AppointmentForm } from "~/features/appointments/components";
import { appointmentFormSchema } from "~/features/appointments/types";
import { z } from "zod";
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
    listAppointments(userId, { clientId: Number(clientIdParam) }),
  ]);

  if (!client) throw new Response("Cliente não encontrado", { status: 404 });

  if (client.bikes.length === 0) {
    throw redirect(`/clients/${clientIdParam}?tab=bikes`);
  }

  return {
    client,
    serviceTemplates,
    previousAppointments: previousAppointments.map((a) => ({
      id: a.id,
      title: a.title,
      serviceDate: a.serviceDate,
      totalCost: a.totalCost,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireAuth(request);
  const formData = await request.formData();
  const url = new URL(request.url);
  const clientIdParam = url.searchParams.get("clientId");

  if (!clientIdParam) return { errors: { general: "Cliente não especificado" } };

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
    clientId: clientIdParam,
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
    await createAppointment(userId, {
      clientId: validatedData.clientId,
      bikeId: validatedData.bikeId,
      title: validatedData.title,
      description: validatedData.description || null,
      serviceDate: validatedData.serviceDate,
      status: validatedData.status as any,
      odometerKm: validatedData.odometerKm,
      usageHours: validatedData.usageHours,
      paymentStatus: validatedData.paymentStatus as any,
      amountPaid: validatedData.amountPaid,
      paymentMethod: validatedData.paymentMethod as any,
      parentAppointmentId: validatedData.parentAppointmentId,
      linkType: validatedData.linkType as any,
      items,
    });

    return redirect(`/clients/${clientIdParam}?tab=atendimentos`);
  } catch (err: any) {
    return { errors: { general: err.message || "Erro ao criar atendimento" } };
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
