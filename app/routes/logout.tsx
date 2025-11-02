import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { logout } from "~/lib/auth.server"

/**
 * Rota de logout
 * 
 * Aceita tanto GET quanto POST para máxima flexibilidade:
 * - POST: Usado em formulários <Form method="post" action="/logout">
 * - GET: Usado em links diretos <Link to="/logout">
 * 
 * Em ambos os casos, remove o cookie JWT e redireciona para /login
 */

export async function action({ request }: ActionFunctionArgs) {
  return logout(request, "/login")
}

export async function loader({ request }: LoaderFunctionArgs) {
  return logout(request, "/login")
}

