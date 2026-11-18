import * as React from "react";
import type { Route } from "./+types/settings";
import type { RouteHandle } from "~/types/route";
import { requireAuth } from "~/lib/auth.server";
import { ThemeSelector } from "~/features/settings/components";
import {
  ShopSettingsForm,
  ServiceTemplatesList,
} from "~/features/service-templates/components";
import {
  listServiceTemplates,
  createServiceTemplate,
  updateServiceTemplate,
  setServiceTemplateActive,
  restoreDefaultServices,
} from "~/services/service-templates.server";
import { getShopSettings, updateShopSettings } from "~/services/users.server";
import { serviceTemplateSchema } from "~/features/service-templates/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useActionData, useLoaderData, useSearchParams } from "react-router";
import {
  IconTool,
  IconPalette,
  IconBuildingStore,
  IconCheck,
} from "@tabler/icons-react";

export const handle: RouteHandle = {
  title: "Configurações",
};

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireAuth(request);
  const [shopSettings, serviceTemplates] = await Promise.all([
    getShopSettings(userId),
    listServiceTemplates(userId, { includeInactive: true }),
  ]);

  return {
    shopSettings,
    serviceTemplates,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // 1. Atualizar dados da oficina (nome e mensagem WhatsApp)
  if (intent === "update_shop_settings") {
    const shopName = (formData.get("shopName") as string)?.trim() || null;
    const whatsappTemplate =
      (formData.get("whatsappTemplate") as string)?.trim() || null;

    await updateShopSettings(userId, {
      shopName,
      whatsappTemplate,
    });

    return { success: true, message: "Configurações da oficina salvas!" };
  }

  // 2. Criar novo template de serviço
  if (intent === "create_service_template") {
    const rawData = {
      name: formData.get("name"),
      category: formData.get("category"),
      defaultLaborCost: formData.get("defaultLaborCost"),
      estimatedMinutes: formData.get("estimatedMinutes") || null,
      intervalMonths: formData.get("intervalMonths") || null,
      intervalKm: formData.get("intervalKm") || null,
      intervalHours: formData.get("intervalHours") || null,
    };

    const parsed = serviceTemplateSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    await createServiceTemplate(userId, parsed.data);
    return { success: true, message: "Serviço cadastrado com sucesso!" };
  }

  // 3. Atualizar template de serviço existente
  if (intent === "update_service_template") {
    const id = Number(formData.get("id"));
    const rawData = {
      name: formData.get("name"),
      category: formData.get("category"),
      defaultLaborCost: formData.get("defaultLaborCost"),
      estimatedMinutes: formData.get("estimatedMinutes") || null,
      intervalMonths: formData.get("intervalMonths") || null,
      intervalKm: formData.get("intervalKm") || null,
      intervalHours: formData.get("intervalHours") || null,
      active: formData.get("active") === "true",
    };

    const parsed = serviceTemplateSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    await updateServiceTemplate(id, userId, parsed.data);
    return { success: true, message: "Serviço atualizado com sucesso!" };
  }

  // 4. Alternar status ativo/inativo
  if (intent === "toggle_active") {
    const id = Number(formData.get("id"));
    const active = formData.get("active") === "true";

    await setServiceTemplateActive(id, userId, active);
    return {
      success: true,
      message: active ? "Serviço ativado!" : "Serviço desativado!",
    };
  }

  // 5. Restaurar serviços padrão
  if (intent === "restore_defaults") {
    const result = await restoreDefaultServices(userId);
    return {
      success: true,
      message:
        result.restoredCount > 0
          ? `${result.restoredCount} serviços padrão restaurados com sucesso!`
          : "Todos os serviços padrão de mercado já estão presentes.",
    };
  }

  return { success: false, error: "Ação não reconhecida." };
}

export default function SettingsPage() {
  const { shopSettings, serviceTemplates } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get("tab") || "services";

  const handleTabChange = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", value);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie os serviços da oficina, notificações de WhatsApp e preferências.
        </p>
      </div>

      {actionData?.message && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/50 p-3 text-sm text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
          <IconCheck className="h-4 w-4" />
          <span>{actionData.message}</span>
        </div>
      )}

      {actionData?.error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
          {actionData.error}
        </div>
      )}

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 max-w-md">
          <TabsTrigger value="services" className="flex items-center gap-1.5">
            <IconTool className="h-4 w-4" />
            <span>Serviços</span>
          </TabsTrigger>
          <TabsTrigger value="shop" className="flex items-center gap-1.5">
            <IconBuildingStore className="h-4 w-4" />
            <span>Oficina</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-1.5">
            <IconPalette className="h-4 w-4" />
            <span>Aparência</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Serviços padrão da oficina */}
        <TabsContent value="services" className="mt-4">
          <ServiceTemplatesList templates={serviceTemplates} />
        </TabsContent>

        {/* Aba 2: Informações da Oficina & WhatsApp */}
        <TabsContent value="shop" className="mt-4">
          <ShopSettingsForm
            initialShopName={shopSettings?.shopName}
            initialWhatsappTemplate={shopSettings?.whatsappTemplate}
          />
        </TabsContent>

        {/* Aba 3: Aparência / Tema */}
        <TabsContent value="appearance" className="mt-4">
          <ThemeSelector />
        </TabsContent>
      </Tabs>
    </div>
  );
}
