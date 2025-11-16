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
import { useNavigation, Form } from "react-router"
import type { UserProfileFormData } from "~/features/auth/types"
import { Spinner } from "~/components/ui/spinner"
import { AvatarSelector } from "./avatar-selector"

interface UserProfileFormProps extends React.ComponentProps<"div"> {
  errors?: Record<string, string>
  defaultValues?: Partial<UserProfileFormData>
  successMessage?: string
}

export function UserProfileForm({
  className,
  errors,
  defaultValues,
  successMessage,
  ...props
}: UserProfileFormProps) {
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {successMessage && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950 dark:text-green-200 border border-green-200 dark:border-green-900">
          {successMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
          <CardDescription>
            Atualize suas informações pessoais e escolha seu avatar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post">
            <FieldGroup>
              <AvatarSelector 
                defaultValue={defaultValues?.image} 
                error={errors?.image}
                userName={defaultValues?.name || "U"}
              />

              <div className="my-4 border-t border-border" />

              <div className="grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="name">
                    Nome Completo <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Seu nome completo"
                    defaultValue={defaultValues?.name}
                    required
                  />
                  {errors?.name && (
                    <FieldDescription className="text-red-500">
                      {errors.name}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    defaultValue={defaultValues?.email}
                    required
                  />
                  {errors?.email && (
                    <FieldDescription className="text-red-500">
                      {errors.email}
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
                    defaultValue={defaultValues?.phone || ""}
                    maxLength={15}
                  />
                  {errors?.phone && (
                    <FieldDescription className="text-red-500">
                      {errors.phone}
                    </FieldDescription>
                  )}
                </Field>
              </div>

              <div className="mt-6">
                <Button
                  type="submit"
                  className="w-full sm:w-auto sm:min-w-[200px]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
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

