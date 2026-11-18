import * as React from "react";
import { Form, useNavigation } from "react-router";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { SERVICE_CATEGORIES, type ServiceCategory } from "~/lib/default-services";

export interface ServiceTemplateItem {
  id: number;
  name: string;
  category: string;
  defaultLaborCost: number;
  estimatedMinutes?: number | null;
  intervalMonths?: number | null;
  intervalKm?: number | null;
  intervalHours?: number | null;
  active: boolean;
}

interface ServiceTemplateFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceTemplateItem | null;
}

export function ServiceTemplateFormSheet({
  open,
  onOpenChange,
  service,
}: ServiceTemplateFormSheetProps) {
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" &&
    (navigation.formData?.get("intent") === "create_service_template" ||
      navigation.formData?.get("intent") === "update_service_template");

  // Fechar o Sheet quando a submissão terminar com sucesso
  const isEdit = Boolean(service);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Editar Serviço Padrão" : "Novo Serviço Padrão"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifique o valor de mão de obra e os intervalos de revisão recomendados para este serviço."
              : "Cadastre um novo serviço com mão de obra e intervalos para sua oficina."}
          </SheetDescription>
        </SheetHeader>

        <Form
          method="post"
          className="mt-6 space-y-5"
          onSubmit={() => {
            // Opcional: fechar sheet após envio
          }}
        >
          <input
            type="hidden"
            name="intent"
            value={isEdit ? "update_service_template" : "create_service_template"}
          />
          {isEdit && <input type="hidden" name="id" value={service?.id} />}

          <FieldGroup>
            {/* Nome do serviço */}
            <Field>
              <FieldLabel htmlFor="service-name">
                Nome do Serviço <span className="text-red-500">*</span>
              </FieldLabel>
              <Input
                id="service-name"
                name="name"
                defaultValue={service?.name ?? ""}
                placeholder="Ex: Revisão completa, Sangria de freio"
                required
              />
            </Field>

            {/* Categoria */}
            <Field>
              <FieldLabel htmlFor="service-category">
                Categoria <span className="text-red-500">*</span>
              </FieldLabel>
              <select
                id="service-category"
                name="category"
                defaultValue={service?.category ?? "Revisão"}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              {/* Mão de Obra */}
              <Field>
                <FieldLabel htmlFor="service-cost">
                  Mão de Obra (R$) <span className="text-red-500">*</span>
                </FieldLabel>
                <Input
                  id="service-cost"
                  name="defaultLaborCost"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={service?.defaultLaborCost ?? 0}
                  required
                />
              </Field>

              {/* Tempo estimado em minutos */}
              <Field>
                <FieldLabel htmlFor="service-minutes">
                  Tempo Estimado (min)
                </FieldLabel>
                <Input
                  id="service-minutes"
                  name="estimatedMinutes"
                  type="number"
                  step="5"
                  min="5"
                  placeholder="Ex: 60"
                  defaultValue={service?.estimatedMinutes ?? ""}
                />
              </Field>
            </div>

            {/* Seção de Intervalos de Revisão */}
            <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Critérios de Retorno / Revisão
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deixe em branco caso o serviço não exija retorno periódico.
                  Vence o critério que for atingido primeiro.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field>
                  <FieldLabel htmlFor="interval-months" className="text-xs">
                    Meses
                  </FieldLabel>
                  <Input
                    id="interval-months"
                    name="intervalMonths"
                    type="number"
                    min="1"
                    placeholder="Ex: 6"
                    defaultValue={service?.intervalMonths ?? ""}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="interval-km" className="text-xs">
                    Quilômetros (km)
                  </FieldLabel>
                  <Input
                    id="interval-km"
                    name="intervalKm"
                    type="number"
                    step="100"
                    min="100"
                    placeholder="Ex: 1500"
                    defaultValue={service?.intervalKm ?? ""}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="interval-hours" className="text-xs">
                    Horas de Uso (h)
                  </FieldLabel>
                  <Input
                    id="interval-hours"
                    name="intervalHours"
                    type="number"
                    step="5"
                    min="5"
                    placeholder="Ex: 50"
                    defaultValue={service?.intervalHours ?? ""}
                  />
                </Field>
              </div>
            </div>

            {/* Ativo / Inativo */}
            {isEdit && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="service-active"
                  name="active"
                  value="true"
                  defaultChecked={service?.active ?? true}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="service-active"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Serviço ativo (disponível para novos atendimentos)
                </label>
              </div>
            )}
          </FieldGroup>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Salvando...
                </>
              ) : isEdit ? (
                "Salvar Alterações"
              ) : (
                "Criar Serviço"
              )}
            </Button>
          </div>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
