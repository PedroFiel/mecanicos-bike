import * as React from "react";
import { Form, useNavigation } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { DEFAULT_WHATSAPP_TEMPLATE } from "~/lib/default-services";
import { IconBrandWhatsapp, IconDeviceFloppy } from "@tabler/icons-react";

interface ShopSettingsFormProps {
  initialShopName?: string | null;
  initialWhatsappTemplate?: string | null;
}

export function ShopSettingsForm({
  initialShopName,
  initialWhatsappTemplate,
}: ShopSettingsFormProps) {
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "update_shop_settings";

  const [shopName, setShopName] = React.useState(initialShopName ?? "");
  const [template, setTemplate] = React.useState(
    initialWhatsappTemplate ?? DEFAULT_WHATSAPP_TEMPLATE
  );

  // Exemplo de pré-visualização dinâmica
  const previewMessage = React.useMemo(() => {
    return template
      .replace(/\{cliente\}/g, "Carlos Silva")
      .replace(/\{bike\}/g, "Caloi Elite 29")
      .replace(/\{servico\}/g, "Manutenção de suspensão 50h")
      .replace(/\{oficina\}/g, shopName.trim() || "Mecânicos Bike")
      .replace(/\{data_ultimo\}/g, "15/10/2026");
  }, [template, shopName]);

  const insertVariable = (tag: string) => {
    setTemplate((prev) => `${prev} ${tag}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Dados da Oficina & Notificações WhatsApp</span>
        </CardTitle>
        <CardDescription>
          Configure o nome exibido da oficina e o modelo de mensagem automática
          enviada aos clientes para lembretes de revisão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-6">
          <input type="hidden" name="intent" value="update_shop_settings" />

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="shopName">Nome da Oficina</FieldLabel>
              <Input
                id="shopName"
                name="shopName"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Ex: Oficina Mecânicos Bike"
                required
              />
              <FieldDescription>
                Este nome é usado nos lembretes de WhatsApp e comunicações com o
                cliente.
              </FieldDescription>
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="whatsappTemplate">
                  Modelo de Mensagem (WhatsApp)
                </FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTemplate(DEFAULT_WHATSAPP_TEMPLATE)}
                >
                  Restaurar modelo padrão
                </Button>
              </div>

              <textarea
                id="whatsappTemplate"
                name="whatsappTemplate"
                rows={4}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              />

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>Clique para inserir variável:</span>
                {[
                  { tag: "{cliente}", label: "Nome do Cliente" },
                  { tag: "{bike}", label: "Modelo da Bike" },
                  { tag: "{servico}", label: "Serviço" },
                  { tag: "{oficina}", label: "Oficina" },
                  { tag: "{data_ultimo}", label: "Data Últ. Atendimento" },
                ].map(({ tag, label }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-mono font-medium text-secondary-foreground hover:bg-secondary/80"
                    title={`Inserir ${label}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </Field>
          </FieldGroup>

          {/* Pré-visualização da mensagem WhatsApp */}
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <IconBrandWhatsapp className="h-4 w-4 text-green-600" />
              <span>Pré-visualização da mensagem enviada ao cliente:</span>
            </div>
            <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-950 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800 shadow-sm whitespace-pre-wrap">
              {previewMessage}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Salvando...
                </>
              ) : (
                <>
                  <IconDeviceFloppy className="mr-2 h-4 w-4" />
                  Salvar Configurações da Oficina
                </>
              )}
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
