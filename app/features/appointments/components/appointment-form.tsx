import * as React from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
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
import { NavLink, useNavigation, Form } from "react-router";
import {
  formatCurrency,
  formatDate,
  type AppointmentItemFormData as AppointmentItemInput,
} from "~/features/appointments/types";
import { Spinner } from "~/components/ui/spinner";
import {
  IconPlus,
  IconTrash,
  IconReceipt2,
  IconLink,
  IconGauge,
  IconCheck,
} from "@tabler/icons-react";

interface BikeOption {
  id: number;
  model: string;
  brand?: string | null;
  currentOdometerKm?: number | null;
  currentHours?: number | null;
}

interface ServiceTemplateOption {
  id: number;
  name: string;
  category: string;
  defaultLaborCost: number;
  estimatedMinutes?: number | null;
}

interface PreviousAppointmentOption {
  id: number;
  title: string;
  serviceDate: Date | string;
  totalCost?: number | null;
}

interface AppointmentFormProps extends React.ComponentProps<"div"> {
  errors?: Record<string, string>;
  defaultValues?: {
    title?: string;
    description?: string;
    serviceDate?: string;
    status?: string;
    bikeId?: number | string;
    odometerKm?: number | string | null;
    usageHours?: number | string | null;
    paymentStatus?: string;
    amountPaid?: number | string;
    paymentMethod?: string | null;
    parentAppointmentId?: number | string | null;
    linkType?: string | null;
    items?: AppointmentItemInput[];
  };
  isEdit?: boolean;
  appointmentId?: number;
  clientId: number;
  clientName?: string;
  bikes: BikeOption[];
  serviceTemplates?: ServiceTemplateOption[];
  previousAppointments?: PreviousAppointmentOption[];
}

export function AppointmentForm({
  className,
  errors,
  defaultValues,
  isEdit = false,
  appointmentId,
  clientId,
  clientName,
  bikes,
  serviceTemplates = [],
  previousAppointments = [],
  ...props
}: AppointmentFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const cancelRoute =
    isEdit && appointmentId
      ? `/appointments/${appointmentId}`
      : `/clients/${clientId}?tab=atendimentos`;

  // Estado dos itens do atendimento
  const [items, setItems] = React.useState<AppointmentItemInput[]>(() => {
    if (defaultValues?.items && defaultValues.items.length > 0) {
      return defaultValues.items;
    }
    return [
      {
        description: "Revisão básica (limpeza + regulagens)",
        laborCost: 120,
        partsDescription: "",
        partsCost: 0,
      },
    ];
  });

  // Estado da bike selecionada para preencher odômetro e horas atuais
  const [selectedBikeId, setSelectedBikeId] = React.useState<string>(
    defaultValues?.bikeId ? String(defaultValues.bikeId) : bikes[0]?.id ? String(bikes[0].id) : ""
  );

  const [odometerKm, setOdometerKm] = React.useState<string>(
    defaultValues?.odometerKm != null ? String(defaultValues.odometerKm) : ""
  );
  const [usageHours, setUsageHours] = React.useState<string>(
    defaultValues?.usageHours != null ? String(defaultValues.usageHours) : ""
  );

  // Quando o usuário muda a bike, preenche com os dados da bike se os campos estiverem vazios
  const handleBikeChange = (bikeId: string) => {
    setSelectedBikeId(bikeId);
    const bike = bikes.find((b) => String(b.id) === bikeId);
    if (bike) {
      if (bike.currentOdometerKm != null && !odometerKm) {
        setOdometerKm(String(bike.currentOdometerKm));
      }
      if (bike.currentHours != null && !usageHours) {
        setUsageHours(String(bike.currentHours));
      }
    }
  };

  // Cálculo ao vivo do total
  const calculatedTotal = React.useMemo(() => {
    return items.reduce((acc, item) => {
      const labor = Number(item.laborCost) || 0;
      const parts = Number(item.partsCost) || 0;
      return acc + labor + parts;
    }, 0);
  }, [items]);

  // Estado do pagamento
  const [amountPaid, setAmountPaid] = React.useState<string>(
    defaultValues?.amountPaid != null ? String(defaultValues.amountPaid) : ""
  );
  const [paymentStatus, setPaymentStatus] = React.useState<string>(
    defaultValues?.paymentStatus || "PENDENTE"
  );

  // Manipulação de itens
  const handleAddItem = (template?: ServiceTemplateOption) => {
    if (template) {
      setItems((prev) => [
        ...prev,
        {
          serviceTemplateId: template.id,
          description: template.name,
          laborCost: template.defaultLaborCost,
          partsDescription: "",
          partsCost: 0,
        },
      ]);
    } else {
      setItems((prev) => [
        ...prev,
        {
          description: "Serviço avulso",
          laborCost: 0,
          partsDescription: "",
          partsCost: 0,
        },
      ]);
    }
  };

  const handleUpdateItem = (
    index: number,
    field: keyof AppointmentItemInput,
    value: any
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert("O atendimento deve conter pelo menos um item.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Agrupamento de templates por categoria para o select
  const templatesByCategory = React.useMemo(() => {
    const map = new Map<string, ServiceTemplateOption[]>();
    for (const t of serviceTemplates) {
      const list = map.get(t.category) || [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [serviceTemplates]);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit ? "Editar Atendimento" : "Novo Atendimento"}
          </CardTitle>
          <CardDescription>
            {isEdit
              ? "Atualize os itens, pagamento e dados do atendimento"
              : clientName
              ? `Cadastrar atendimento para ${clientName}`
              : "Preencha os dados do novo atendimento"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />

            {/* Erros gerais de validação */}
            {errors?.general && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
                {errors.general}
              </div>
            )}
            {errors?.itemsJson && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
                {errors.itemsJson}
              </div>
            )}

            {/* SEÇÃO 1: DADOS BÁSICOS */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground border-b pb-2">
                1. Informações Básicas
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="title">
                    Título / Resumo do Atendimento <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="Ex: Revisão geral de 5.000 km, Troca de pastilhas"
                    defaultValue={defaultValues?.title}
                    required
                  />
                  {errors?.title && (
                    <FieldDescription className="text-red-500">
                      {errors.title}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="bikeId">
                    Bicicleta <span className="text-red-500">*</span>
                  </FieldLabel>
                  <select
                    id="bikeId"
                    name="bikeId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={selectedBikeId}
                    onChange={(e) => handleBikeChange(e.target.value)}
                    required
                  >
                    <option value="">Selecione uma bike...</option>
                    {bikes.map((bike) => (
                      <option key={bike.id} value={bike.id}>
                        {bike.brand ? `${bike.brand} ${bike.model}` : bike.model}
                      </option>
                    ))}
                  </select>
                  {errors?.bikeId && (
                    <FieldDescription className="text-red-500">
                      {errors.bikeId}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="serviceDate">
                    Data do Serviço <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    id="serviceDate"
                    name="serviceDate"
                    type="date"
                    defaultValue={
                      defaultValues?.serviceDate ||
                      new Date().toISOString().split("T")[0]
                    }
                    required
                  />
                  {errors?.serviceDate && (
                    <FieldDescription className="text-red-500">
                      {errors.serviceDate}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="status">
                    Status do Atendimento <span className="text-red-500">*</span>
                  </FieldLabel>
                  <select
                    id="status"
                    name="status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    defaultValue={defaultValues?.status || "CONCLUIDO"}
                    required
                  >
                    <option value="CONCLUIDO">Concluído</option>
                    <option value="PENDENTE">Em Andamento / Pendente</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">Observações do Mecânico</FieldLabel>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Ex: Barulho na roda traseira resolvido"
                    defaultValue={defaultValues?.description}
                  />
                </Field>
              </div>
            </div>

            {/* SEÇÃO 2: TELEMETRIA (ODÔMETRO E HORAS) */}
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <IconGauge className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    2. Telemetria da Bike (nesta data)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Utilizado para calcular lembretes baseados em km e horas de suspensão.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="odometerKm">Odômetro Atual (km)</FieldLabel>
                  <Input
                    id="odometerKm"
                    name="odometerKm"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ex: 1500"
                    value={odometerKm}
                    onChange={(e) => setOdometerKm(e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="usageHours">Horímetro / Horas de Uso (h)</FieldLabel>
                  <Input
                    id="usageHours"
                    name="usageHours"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Ex: 50"
                    value={usageHours}
                    onChange={(e) => setUsageHours(e.target.value)}
                  />
                </Field>
              </div>
            </div>

            {/* SEÇÃO 3: ITENS DO ATENDIMENTO (MÃO DE OBRA + PEÇAS) */}
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-2">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    3. Itens do Atendimento & Peças
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Adicione os serviços realizados e peças substituídas. O total é somado automaticamente.
                  </p>
                </div>

                {/* Dropdown de serviços padrão rápidos */}
                {serviceTemplates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      onChange={(e) => {
                        const templateId = Number(e.target.value);
                        if (!templateId) return;
                        const template = serviceTemplates.find(
                          (t) => t.id === templateId
                        );
                        if (template) handleAddItem(template);
                        e.target.value = "";
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        + Adicionar serviço padrão...
                      </option>
                      {Array.from(templatesByCategory.entries()).map(
                        ([category, tmpls]) => (
                          <optgroup key={category} label={category}>
                            {tmpls.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({formatCurrency(t.defaultLaborCost)})
                              </option>
                            ))}
                          </optgroup>
                        )
                      )}
                    </select>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddItem()}
                    >
                      <IconPlus className="mr-1 h-3.5 w-3.5" />
                      Item Avulso
                    </Button>
                  </div>
                )}
              </div>

              {/* Lista dos itens */}
              <div className="space-y-3">
                {items.map((item, index) => {
                  const itemSubtotal =
                    (Number(item.laborCost) || 0) + (Number(item.partsCost) || 0);

                  return (
                    <div
                      key={index}
                      className="rounded-lg border p-3.5 bg-card space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Item #{index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            Subtotal: {formatCurrency(itemSubtotal)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveItem(index)}
                            title="Remover este item"
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-12">
                        {/* Descrição do serviço */}
                        <div className="sm:col-span-5">
                          <FieldLabel className="text-xs">
                            Descrição do Serviço / Mão de Obra
                          </FieldLabel>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              handleUpdateItem(index, "description", e.target.value)
                            }
                            placeholder="Ex: Regulagem de câmbio"
                            required
                          />
                        </div>

                        {/* Valor Mão de Obra */}
                        <div className="sm:col-span-2">
                          <FieldLabel className="text-xs">Mão de Obra (R$)</FieldLabel>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.laborCost}
                            onChange={(e) =>
                              handleUpdateItem(
                                index,
                                "laborCost",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0,00"
                            required
                          />
                        </div>

                        {/* Descrição da Peça */}
                        <div className="sm:col-span-3">
                          <FieldLabel className="text-xs">
                            Peça Utilizada (opcional)
                          </FieldLabel>
                          <Input
                            value={item.partsDescription || ""}
                            onChange={(e) =>
                              handleUpdateItem(
                                index,
                                "partsDescription",
                                e.target.value
                              )
                            }
                            placeholder="Ex: Corrente Shimano 11v"
                          />
                        </div>

                        {/* Valor da Peça */}
                        <div className="sm:col-span-2">
                          <FieldLabel className="text-xs">Valor Peça (R$)</FieldLabel>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.partsCost || ""}
                            onChange={(e) =>
                              handleUpdateItem(
                                index,
                                "partsCost",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Card de Total Geral */}
              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Total do Atendimento (calculado no servidor)
                  </span>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(calculatedTotal)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddItem()}
                >
                  <IconPlus className="mr-1 h-3.5 w-3.5" />
                  Adicionar mais um item
                </Button>
              </div>
            </div>

            {/* SEÇÃO 4: CONTROLE DE PAGAMENTO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <IconReceipt2 className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  4. Controle Financeiro & Pagamento
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="paymentStatus">Status do Pagamento</FieldLabel>
                  <select
                    id="paymentStatus"
                    name="paymentStatus"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={paymentStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentStatus(val);
                      if (val === "PAGO") {
                        setAmountPaid(String(calculatedTotal));
                      }
                    }}
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="PARCIAL">Parcial</option>
                    <option value="PAGO">Pago</option>
                  </select>
                </Field>

                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="amountPaid">Valor Pago (R$)</FieldLabel>
                    <button
                      type="button"
                      className="text-xs text-primary underline hover:text-primary/80"
                      onClick={() => {
                        setAmountPaid(String(calculatedTotal));
                        setPaymentStatus("PAGO");
                      }}
                    >
                      Preencher total
                    </button>
                  </div>
                  <Input
                    id="amountPaid"
                    name="amountPaid"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="paymentMethod">Forma de Pagamento</FieldLabel>
                  <select
                    id="paymentMethod"
                    name="paymentMethod"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    defaultValue={defaultValues?.paymentMethod || "PIX"}
                  >
                    <option value="PIX">Pix</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="DEBITO">Cartão de Débito</option>
                    <option value="CREDITO">Cartão de Crédito</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* SEÇÃO 5: VÍNCULO COM ATENDIMENTO ANTERIOR (RETORNO / GARANTIA) */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
              <div className="flex items-center gap-2">
                <IconLink className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    5. Vínculo com Atendimento Anterior (opcional)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ligue este atendimento a um serviço anterior da mesma bike para
                    acompanhar retornos e retrabalhos em garantia.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="parentAppointmentId">
                    Continuação de...
                  </FieldLabel>
                  <select
                    id="parentAppointmentId"
                    name="parentAppointmentId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    defaultValue={defaultValues?.parentAppointmentId ? String(defaultValues.parentAppointmentId) : ""}
                  >
                    <option value="">Nenhum (atendimento independente)</option>
                    {previousAppointments.map((prev) => (
                      <option key={prev.id} value={prev.id}>
                        #{prev.id} - {prev.title} ({formatDate(prev.serviceDate)})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="linkType">Tipo do Vínculo</FieldLabel>
                  <select
                    id="linkType"
                    name="linkType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    defaultValue={defaultValues?.linkType || "CONTINUACAO"}
                  >
                    <option value="CONTINUACAO">
                      Continuação (serviço em etapas / peça que chegou)
                    </option>
                    <option value="GARANTIA">
                      Retorno em Garantia (mesmo problema voltou)
                    </option>
                  </select>
                </Field>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row sm:gap-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                asChild={!isSubmitting}
              >
                {!isSubmitting ? (
                  <NavLink to={cancelRoute}>Cancelar</NavLink>
                ) : (
                  <span>Cancelar</span>
                )}
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Salvando Atendimento...
                  </>
                ) : (
                  <>
                    <IconCheck className="mr-2 h-4 w-4" />
                    {isEdit ? "Atualizar Atendimento" : "Salvar Atendimento"}
                  </>
                )}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
