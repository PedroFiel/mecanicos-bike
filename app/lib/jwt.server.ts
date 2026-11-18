import jwt from "jsonwebtoken"
import { parse } from "cookie"
import { env } from "~/lib/env.server"

// Configuração do JWT
const JWT_EXPIRES_IN = "7d" // Token expira em 7 dias

// Tipo do payload do JWT
export interface JWTPayload {
  userId: number
  email: string
  tokenVersion?: number // opcional para retrocompatibilidade com tokens existentes
}

/**
 * Cria um JWT token com userId, email e tokenVersion
 * @param payload - Dados do usuário
 * @returns Token JWT assinado
 */
export function createToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * Verifica se o token é válido e retorna o payload decodificado
 * @param token - Token JWT a ser verificado
 * @returns Payload decodificado ou null se inválido
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    // Token inválido, expirado ou adulterado
    return null
  }
}

/**
 * Extrai o token JWT do cookie da requisição
 * @param request - Objeto Request do React Router
 * @returns Token string ou null se não encontrado
 */
export function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie")

  if (!cookieHeader) {
    return null
  }

  const cookies = parse(cookieHeader)
  return cookies.token || null
}

/**
 * Verifica se há um usuário autenticado na requisição
 * @param request - Objeto Request do React Router
 * @returns Payload do JWT ou null
 */
export function getUserFromRequest(request: Request): JWTPayload | null {
  const token = getTokenFromRequest(request)

  if (!token) {
    return null
  }

  return verifyToken(token)
}
