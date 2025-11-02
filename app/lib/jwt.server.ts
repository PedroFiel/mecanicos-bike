import jwt from "jsonwebtoken"
import { parse } from "cookie"

// Pega a chave secreta do .env
const JWT_SECRET = process.env.JWT_SECRET as string

// Configuração do JWT
const JWT_EXPIRES_IN = "7d" // Token expira em 7 dias

// Tipo do payload do JWT
export interface JWTPayload {
  userId: number
  email: string
}

/**
 * Cria um JWT token com userId e email
 * @param payload - Dados do usuário (userId e email)
 * @returns Token JWT assinado
 * 
 * Exemplo:
 * const token = createToken({ userId: 5, email: "user@email.com" })
 * // Retorna: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export function createToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * Verifica se o token é válido e retorna o payload decodificado
 * @param token - Token JWT a ser verificado
 * @returns Payload decodificado ou null se inválido
 * 
 * Exemplo:
 * const payload = verifyToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
 * if (payload) {
 *   console.log(payload.userId) // 5
 * }
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
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
 * 
 * Exemplo:
 * export async function loader({ request }) {
 *   const token = getTokenFromRequest(request)
 *   if (!token) throw redirect("/login")
 * }
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
 * @returns UserId e email ou null
 * 
 * Exemplo:
 * const user = getUserFromRequest(request)
 * if (user) {
 *   console.log("Usuário logado:", user.userId)
 * }
 */
export function getUserFromRequest(request: Request): JWTPayload | null {
  const token = getTokenFromRequest(request)
  
  if (!token) {
    return null
  }
  
  return verifyToken(token)
}

