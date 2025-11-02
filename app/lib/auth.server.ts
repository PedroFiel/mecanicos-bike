import { redirect } from "react-router"
import { serialize } from "cookie"
import { createToken, getUserFromRequest, type JWTPayload } from "./jwt.server"

/**
 * Middleware que EXIGE autenticação
 * Se não estiver autenticado, redireciona para /login
 * 
 * Use em loaders de páginas PROTEGIDAS
 * 
 * @param request - Objeto Request do React Router
 * @returns userId do usuário autenticado
 * @throws redirect("/login") se não autenticado
 * 
 * Exemplo:
 * export async function loader({ request }) {
 *   const userId = await requireAuth(request)
 *   // Se chegou aqui, usuário está autenticado!
 *   const user = await prisma.user.findUnique({ where: { id: userId } })
 *   return { user }
 * }
 */
export async function requireAuth(request: Request): Promise<number> {
  const user = getUserFromRequest(request)
  
  if (!user) {
    throw redirect("/login")
  }
  
  return user.userId
}

/**
 * Tenta pegar o usuário autenticado, mas NÃO força login
 * Útil para páginas que mudam comportamento se usuário está logado
 * 
 * @param request - Objeto Request do React Router
 * @returns Payload do JWT ou null
 * 
 * Exemplo:
 * export async function loader({ request }) {
 *   const user = await getOptionalUser(request)
 *   if (user) {
 *     // Usuário está logado, redireciona para home
 *     throw redirect("/")
 *   }
 *   return null
 * }
 */
export async function getOptionalUser(request: Request): Promise<JWTPayload | null> {
  return getUserFromRequest(request)
}

/**
 * Cria uma sessão JWT para o usuário e redireciona
 * 
 * Use após login bem-sucedido ou registro
 * 
 * @param userId - ID do usuário no banco
 * @param email - Email do usuário
 * @param redirectTo - Página para redirecionar após login
 * @returns Response com cookie setado e redirect
 * 
 * Exemplo:
 * export async function action({ request }) {
 *   // ... valida credenciais ...
 *   if (passwordValid) {
 *     return createUserSession(user.id, user.email, "/")
 *   }
 * }
 */
export async function createUserSession(
  userId: number,
  email: string,
  redirectTo: string = "/"
): Promise<Response> {
  // Cria o JWT token
  const token = createToken({ userId, email })
  
  // Serializa o cookie com configurações de segurança
  const cookie = serialize("token", token, {
    httpOnly: true, // Não acessível via JavaScript (proteção XSS)
    secure: process.env.NODE_ENV === "production", // HTTPS em produção
    sameSite: "lax", // Proteção CSRF
    maxAge: 60 * 60 * 24 * 7, // 7 dias em segundos
    path: "/", // Cookie válido para todo o site
  })
  
  // Redireciona com o cookie setado
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": cookie,
    },
  })
}

/**
 * Remove a sessão do usuário (logout)
 * 
 * @param request - Objeto Request do React Router
 * @param redirectTo - Página para redirecionar após logout
 * @returns Response com cookie removido e redirect
 * 
 * Exemplo:
 * export async function action({ request }) {
 *   return logout(request, "/login")
 * }
 */
export async function logout(
  request: Request,
  redirectTo: string = "/login"
): Promise<Response> {
  // Remove o cookie setando maxAge = 0
  const cookie = serialize("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // Expira imediatamente
    path: "/",
  })
  
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": cookie,
    },
  })
}

