import { Form, Link } from "react-router"
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

type SignupFormProps = React.ComponentProps<typeof Card> & {
  errors?: Record<string, string>
}

export function SignupForm({ errors = {}, ...props }: SignupFormProps) {

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Criar uma conta</CardTitle>
        <CardDescription>
          Digite suas informações abaixo para criar sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errors.general && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {errors.general}
          </div>
        )}
        <Form method="post">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Nome Completo</FieldLabel>
              <Input 
                id="name" 
                name="name"
                type="text" 
                placeholder="João Silva" 
                required 
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
              {errors.email ? (
                <p className="text-sm text-red-600">{errors.email}</p>
              ) : (
                <FieldDescription>
                  Usaremos isso para entrar em contato. Não compartilharemos seu email com ninguém.
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Telefone</FieldLabel>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(11) 99999-9999"
              />
              {errors.phone ? (
                <p className="text-sm text-red-600">{errors.phone}</p>
              ) : (
                <FieldDescription>
                  Opcional. Podemos usar isso para entrar em contato sobre sua conta.
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input 
                id="password" 
                name="password"
                type="password" 
                required 
              />
              {errors.password ? (
                <p className="text-sm text-red-600">{errors.password}</p>
              ) : (
                <FieldDescription>
                  Deve ter pelo menos 8 caracteres.
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirmar Senha
              </FieldLabel>
              <Input 
                id="confirm-password" 
                name="confirmPassword"
                type="password" 
                required 
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              ) : (
                <FieldDescription>Por favor, confirme sua senha.</FieldDescription>
              )}
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit">Criar Conta</Button>
                <FieldDescription className="px-6 text-center">
                  Já tem uma conta? <Link to="/login">Entrar</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </Form>
      </CardContent>
    </Card>
  )
}
