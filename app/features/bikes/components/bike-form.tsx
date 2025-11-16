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
import { NavLink, useNavigation, Form } from "react-router"
import type { BikeFormData } from "~/features/bikes/types"
import { Spinner } from "~/components/ui/spinner"

interface BikeFormProps extends React.ComponentProps<"div"> {
  errors?: Record<string, string>
  defaultValues?: Partial<BikeFormData>
  isEdit?: boolean
  bikeId?: number
  clientId?: number
  clientName?: string
}

export function BikeForm({
  className,
  errors,
  defaultValues,
  isEdit = false,
  bikeId,
  clientId,
  clientName,
  ...props
}: BikeFormProps) {
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"
  
  const cancelRoute = isEdit && bikeId && clientId
    ? `/clients/${clientId}?tab=bikes`
    : clientId
    ? `/clients/${clientId}?tab=bikes`
    : "/clients"

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar Bike" : "Nova Bike"}</CardTitle>
          <CardDescription>
            {isEdit
              ? "Atualize os dados da bike abaixo"
              : clientName
              ? `Cadastrar nova bike para ${clientName}`
              : "Preencha os dados da nova bike"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post">
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="model">
                    Modelo <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    id="model"
                    name="model"
                    type="text"
                    placeholder="Ex: Mountain Bike 29"
                    defaultValue={defaultValues?.model}
                    required
                  />
                  {errors?.model && (
                    <FieldDescription className="text-red-500">
                      {errors.model}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="brand">Marca</FieldLabel>
                  <Input
                    id="brand"
                    name="brand"
                    type="text"
                    placeholder="Ex: Caloi, Specialized, Trek"
                    defaultValue={defaultValues?.brand}
                  />
                  {errors?.brand && (
                    <FieldDescription className="text-red-500">
                      {errors.brand}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="color">Cor</FieldLabel>
                  <Input
                    id="color"
                    name="color"
                    type="text"
                    placeholder="Ex: Preta, Vermelha, Azul"
                    defaultValue={defaultValues?.color}
                  />
                  {errors?.color && (
                    <FieldDescription className="text-red-500">
                      {errors.color}
                    </FieldDescription>
                  )}
                </Field>

                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="frameNumber">
                    Número do Quadro (Serial)
                  </FieldLabel>
                  <Input
                    id="frameNumber"
                    name="frameNumber"
                    type="text"
                    placeholder="Número de série do quadro"
                    defaultValue={defaultValues?.frameNumber}
                  />
                  {errors?.frameNumber && (
                    <FieldDescription className="text-red-500">
                      {errors.frameNumber}
                    </FieldDescription>
                  )}
                </Field>

                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="characteristics">
                    Características / Observações
                  </FieldLabel>
                  <textarea
                    id="characteristics"
                    name="characteristics"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    placeholder="Aro 29, freio a disco, suspensão dianteira, etc."
                    defaultValue={defaultValues?.characteristics}
                    maxLength={500}
                  />
                  {errors?.characteristics && (
                    <FieldDescription className="text-red-500">
                      {errors.characteristics}
                    </FieldDescription>
                  )}
                </Field>
              </div>

              <div className="flex flex-col gap-3 mt-6 sm:flex-row sm:gap-4">
                <Button 
                  type="submit" 
                  className="flex-1 w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>{isEdit ? "Atualizar Bike" : "Salvar Bike"}</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 w-full sm:w-auto"
                  disabled={isSubmitting}
                  asChild={!isSubmitting}
                >
                  {!isSubmitting ? (
                    <NavLink to={cancelRoute}>Cancelar</NavLink>
                  ) : (
                    <span>Cancelar</span>
                  )}
                </Button>
              </div>
            </FieldGroup>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

