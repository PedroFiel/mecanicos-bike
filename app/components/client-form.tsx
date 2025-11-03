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
import type { ClientFormData } from "~/types/client"

interface ClientFormProps extends React.ComponentProps<"div"> {
  errors?: Record<string, string>
  defaultValues?: Partial<ClientFormData>
  isEdit?: boolean
}

export function ClientForm({
  className,
  errors,
  defaultValues,
  isEdit = false,
  ...props
}: ClientFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar Cliente" : "Novo Cliente"}</CardTitle>
          <CardDescription>
            {isEdit
              ? "Atualize os dados do cliente abaixo"
              : "Preencha os dados do novo cliente"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="post">
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="fullName">
                    Nome Completo <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="João da Silva"
                    defaultValue={defaultValues?.fullName}
                    required
                  />
                  {errors?.fullName && (
                    <FieldDescription className="text-red-500">
                      {errors.fullName}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="cpf">CPF</FieldLabel>
                  <Input
                    id="cpf"
                    name="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    defaultValue={defaultValues?.cpf}
                    maxLength={14}
                  />
                  {errors?.cpf && (
                    <FieldDescription className="text-red-500">
                      {errors.cpf}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="phone">Telefone</FieldLabel>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    defaultValue={defaultValues?.phone}
                    maxLength={15}
                  />
                  {errors?.phone && (
                    <FieldDescription className="text-red-500">
                      {errors.phone}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="joao@example.com"
                    defaultValue={defaultValues?.email}
                  />
                  {errors?.email && (
                    <FieldDescription className="text-red-500">
                      {errors.email}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="birthDate">Data de Nascimento</FieldLabel>
                  <Input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    defaultValue={defaultValues?.birthDate}
                  />
                  {errors?.birthDate && (
                    <FieldDescription className="text-red-500">
                      {errors.birthDate}
                    </FieldDescription>
                  )}
                </Field>

                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="address">Endereço</FieldLabel>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="Rua, número, bairro, cidade - UF"
                    defaultValue={defaultValues?.address}
                  />
                  {errors?.address && (
                    <FieldDescription className="text-red-500">
                      {errors.address}
                    </FieldDescription>
                  )}
                </Field>

                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="notes">Observações</FieldLabel>
                  <textarea
                    id="notes"
                    name="notes"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    placeholder="Informações adicionais sobre o cliente"
                    defaultValue={defaultValues?.notes}
                    maxLength={500}
                  />
                  {errors?.notes && (
                    <FieldDescription className="text-red-500">
                      {errors.notes}
                    </FieldDescription>
                  )}
                </Field>
              </div>

              <div className="flex flex-col gap-3 mt-6 sm:flex-row sm:gap-4">
                <Button type="submit" className="flex-1 w-full sm:w-auto">
                  {isEdit ? "Atualizar Cliente" : "Salvar Cliente"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 w-full sm:w-auto"
                  asChild
                >
                  <NavLink to="/clients">Cancelar</NavLink>
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

