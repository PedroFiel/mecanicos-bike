import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { NavLink } from "react-router"
import type { AppointmentFormData } from "~/features/appointments/types"
import { AppointmentStatus } from "~/features/appointments/types"

interface AppointmentFormProps extends React.ComponentProps<"div"> {
  errors?: Record<string, string>
  defaultValues?: Partial<AppointmentFormData>
  isEdit?: boolean
  appointmentId?: number
  clientId: number
  clientName?: string
  bikes: Array<{ id: number; model: string; brand?: string | null }>
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
  ...props
}: AppointmentFormProps) {
  const cancelRoute = isEdit && appointmentId
    ? `/appointments/${appointmentId}`
    : `/clients/${clientId}?tab=atendimentos`

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit ? "Editar Atendimento" : "Novo Atendimento"}
          </CardTitle>
          <CardDescription>
            {isEdit
              ? "Atualize os dados do atendimento abaixo"
              : clientName
              ? `Cadastrar novo atendimento para ${clientName}`
              : "Preencha os dados do novo atendimento"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="post">
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="title">
                    Título <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="Ex: Troca de câmara, Revisão completa"
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
                    Bike <span className="text-red-500">*</span>
                  </FieldLabel>
                  <select
                    id="bikeId"
                    name="bikeId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    defaultValue={defaultValues?.bikeId}
                    required
                  >
                    <option value="">Selecione uma bike</option>
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
                    defaultValue={defaultValues?.serviceDate}
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
                    Status <span className="text-red-500">*</span>
                  </FieldLabel>
                  <select
                    id="status"
                    name="status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    defaultValue={defaultValues?.status || AppointmentStatus.PENDENTE}
                    required
                  >
                    <option value={AppointmentStatus.PENDENTE}>Pendente</option>
                    <option value={AppointmentStatus.CONCLUIDO}>Concluído</option>
                    <option value={AppointmentStatus.CANCELADO}>Cancelado</option>
                  </select>
                  {errors?.status && (
                    <FieldDescription className="text-red-500">
                      {errors.status}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="totalCost">Custo Total (R$)</FieldLabel>
                  <Input
                    id="totalCost"
                    name="totalCost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    defaultValue={defaultValues?.totalCost}
                  />
                  {errors?.totalCost && (
                    <FieldDescription className="text-red-500">
                      {errors.totalCost}
                    </FieldDescription>
                  )}
                </Field>

                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="description">Descrição</FieldLabel>
                  <textarea
                    id="description"
                    name="description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    placeholder="Descreva o serviço realizado ou a ser realizado"
                    defaultValue={defaultValues?.description}
                    maxLength={500}
                  />
                  {errors?.description && (
                    <FieldDescription className="text-red-500">
                      {errors.description}
                    </FieldDescription>
                  )}
                </Field>
              </div>

              <div className="flex flex-col gap-3 mt-6 sm:flex-row sm:gap-4">
                <Button type="submit" className="flex-1 w-full sm:w-auto">
                  {isEdit ? "Atualizar Atendimento" : "Salvar Atendimento"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 w-full sm:w-auto"
                  asChild
                >
                  <NavLink to={cancelRoute}>Cancelar</NavLink>
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

