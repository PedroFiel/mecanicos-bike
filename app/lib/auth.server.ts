import { redirect } from "react-router"
import { serialize, parse } from "cookie"
import { createToken, getUserFromRequest, type JWTPayload } from "./jwt.server"
import prisma from "prisma/prisma"
import { env } from "~/lib/env.server"

/**
 * Middleware que EXIGE autenticação.
 * Após verificar o JWT, busca o usuário no banco e confirma tokenVersion.
 * Se a versão diferir (sessão revogada), redireciona para /login.
 *
 * @param request - Objeto Request do React Router
 * @returns userId do usuário autenticado
 * @throws redirect("/login") se não autenticado ou sessão revogada
 */
export async function requireAuth(request: Request): Promise<number> {
  const jwtPayload = getUserFromRequest(request)

  if (!jwtPayload) {
    throw redirect("/login")
  }

  // Busca o usuário no banco para validar tokenVersion
  const user = await prisma.user.findUnique({
    where: { id: jwtPayload.userId },
    select: { id: true, tokenVersion: true },
  })

  if (!user) {
    throw redirect("/login")
  }

  // Se tokenVersion diverge, a sessão foi revogada (logout em outro dispositivo, troca de senha)
  if ((jwtPayload.tokenVersion ?? 0) !== user.tokenVersion) {
    throw redirect("/login")
  }

  return user.id
}

/**
 * Tenta pegar o usuário autenticado, mas NÃO força login.
 * Útil para páginas que mudam comportamento se usuário está logado.
 *
 * @param request - Objeto Request do React Router
 * @returns Payload do JWT ou null
 */
export async function getOptionalUser(request: Request): Promise<JWTPayload | null> {
  return getUserFromRequest(request)
}

/**
 * Cria uma sessão JWT para o usuário e redireciona.
 * Inclui tokenVersion no JWT para suportar revogação de sessão.
 *
 * @param userId - ID do usuário no banco
 * @param email - Email do usuário
 * @param tokenVersion - Versão do token (para revogação)
 * @param redirectTo - Página para redirecionar após login
 * @returns Response com cookie setado e redirect
 */
export async function createUserSession(
  userId: number,
  email: string,
  tokenVersion: number,
  redirectTo: string = "/"
): Promise<Response> {
  // Cria o JWT token com tokenVersion
  const token = createToken({ userId, email, tokenVersion })

  // Serializa o cookie com configurações de segurança
  const cookie = serialize("token", token, {
    httpOnly: true, // Não acessível via JavaScript (proteção XSS)
    secure: env.NODE_ENV === "production", // HTTPS em produção
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
 * Remove a sessão do usuário (logout).
 * Incrementa tokenVersion no banco para invalidar todas as sessões ativas.
 *
 * @param request - Objeto Request do React Router
 * @param redirectTo - Página para redirecionar após logout
 * @returns Response com cookie removido e redirect
 */
export async function logout(
  request: Request,
  redirectTo: string = "/login"
): Promise<Response> {
  const jwtPayload = getUserFromRequest(request)

  // Incrementa tokenVersion para invalidar todas as sessões do usuário
  if (jwtPayload?.userId) {
    await prisma.user.update({
      where: { id: jwtPayload.userId },
      data: { tokenVersion: { increment: 1 } },
    })
  }

  // Remove o cookie setando maxAge = 0
  const cookie = serialize("token", "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
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

/**
 * Cria o cookie temporário de desafio 2FA.
 * Válido por 10 minutos, restrito ao path /login.
 *
 * @param userId - ID do usuário que iniciou o login
 * @returns String serializada do Set-Cookie header
 */
export function createChallengeCookie(userId: number): string {
  return serialize("challenge_uid", String(userId), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutos
    path: "/login",
  })
}

/**
 * Extrai o userId do cookie de desafio 2FA.
 *
 * @param request - Objeto Request do React Router
 * @returns userId ou null se cookie ausente/inválido
 */
export function getChallengeUserId(request: Request): number | null {
  const cookieHeader = request.headers.get("Cookie")
  if (!cookieHeader) return null

  const cookies = parse(cookieHeader)
  const raw = cookies["challenge_uid"]
  if (!raw) return null

  const parsed = parseInt(raw, 10)
  return isNaN(parsed) ? null : parsed
}

/**
 * Retorna o valor de Set-Cookie que remove o cookie de desafio 2FA.
 *
 * @returns String serializada do Set-Cookie header com maxAge=0
 */
export function clearChallengeCookie(): string {
  return serialize("challenge_uid", "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/login",
  })
}
