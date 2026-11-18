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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  ServiceTemplateFormSheet,
  type ServiceTemplateItem,
} from "./service-template-form-sheet";
import {
  IconPlus,
  IconEdit,
  IconRefresh,
  IconSearch,
  IconPower,
} from "@tabler/icons-react";
import { formatCurrency } from "~/features/appointments/types";

interface ServiceTemplatesListProps {
  templates: ServiceTemplateItem[];
}

export function ServiceTemplatesList({ templates }: ServiceTemplatesListProps) {
  const [search, setSearch] = React.useState("");
  const [selectedService, setSelectedService] =
    React.useState<ServiceTemplateItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const navigation = useNavigation();
  const isRestoring =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "restore_defaults";

  // Agrupamento e filtragem
  const filteredTemplates = React.useMemo(() => {
    return templates.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [templates, search]);

  const categories = React.useMemo(() => {
    const cats = Array.from(new Set(filteredTemplates.map((t) => t.category)));
    return cats.sort();
  }, [filteredTemplates]);

  const handleEdit = (service: ServiceTemplateItem) => {
    setSelectedService(service);
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setSelectedService(null);
    setIsSheetOpen(true);
  };

  // Formata os critérios de retorno de forma amigável
  const formatIntervals = (service: ServiceTemplateItem) => {
    const parts: string[] = [];
    if (service.intervalMonths) parts.push(`${service.intervalMonths} meses`);
    if (service.intervalKm)
      parts.push(`${service.intervalKm.toLocaleString("pt-BR")} km`);
    if (service.intervalHours) parts.push(`${service.intervalHours} h`);

    if (parts.length === 0) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }

    return (
      <span className="text-xs font-medium text-foreground">
        {parts.join(" · ")}
      </span>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Serviços Padrão e Revisões</CardTitle>
            <CardDescription>
              Tabela de mão de obra e prazos recomendados de retorno por tipo de
              serviço.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Form
              method="post"
              onSubmit={(e) => {
                if (
                  !confirm(
                    "Restaurar os 18 serviços padrão de mercado? Serviços que você já possui não serão duplicados."
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="intent" value="restore_defaults" />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={isRestoring}
                title="Restaura os serviços padrão que faltam na oficina"
              >
                <IconRefresh
                  className={`mr-1.5 h-4 w-4 ${isRestoring ? "animate-spin" : ""}`}
                />
                Restaurar Padrões
              </Button>
            </Form>

            <Button size="sm" onClick={handleCreate}>
              <IconPlus className="mr-1.5 h-4 w-4" />
              Novo Serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de busca */}
          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative w-full">
              <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum serviço encontrado.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleCreate}
              >
                <IconPlus className="mr-1.5 h-4 w-4" />
                Cadastrar primeiro serviço
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => {
                const categoryItems = filteredTemplates.filter(
                  (t) => t.category === category
                );
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm tracking-wide text-muted-foreground uppercase">
                        {category}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {categoryItems.length}
                      </Badge>
                    </div>

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[35%]">Serviço</TableHead>
                            <TableHead className="w-[15%]">Mão de Obra</TableHead>
                            <TableHead className="w-[15%]">Tempo Est.</TableHead>
                            <TableHead className="w-[20%]">
                              Revisão / Retorno
                            </TableHead>
                            <TableHead className="w-[15%] text-right">
                              Ações
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryItems.map((service) => (
                            <TableRow
                              key={service.id}
                              className={!service.active ? "opacity-50" : ""}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <span>{service.name}</span>
                                  {!service.active && (
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                      Inativo
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold">
                                  {formatCurrency(service.defaultLaborCost)}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {service.estimatedMinutes
                                  ? `${service.estimatedMinutes} min`
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {formatIntervals(service)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleEdit(service)}
                                    title="Editar serviço"
                                  >
                                    <IconEdit className="h-4 w-4" />
                                  </Button>

                                  <Form method="post" className="inline">
                                    <input
                                      type="hidden"
                                      name="intent"
                                      value="toggle_active"
                                    />
                                    <input
                                      type="hidden"
                                      name="id"
                                      value={service.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="active"
                                      value={service.active ? "false" : "true"}
                                    />
                                    <Button
                                      type="submit"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                      title={
                                        service.active
                                          ? "Desativar serviço"
                                          : "Ativar serviço"
                                      }
                                    >
                                      <IconPower
                                        className={`h-4 w-4 ${
                                          service.active
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-muted-foreground"
                                        }`}
                                      />
                                    </Button>
                                  </Form>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet de Criação / Edição */}
      <ServiceTemplateFormSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        service={selectedService}
      />
    </>
  );
}
