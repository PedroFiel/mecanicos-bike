/**
 * rate-limit.server.ts
 *
 * Rate limiter em memória para tentativas de login e 2FA.
 *
 * Se a aplicação rodar em múltiplas instâncias, use o banco (SecurityEvent)
 * para persistir contadores entre réplicas.
 * Para instância única (Fly.io single machine), memória é suficiente.
 *
 * Uso:
 *   isRateLimited(`login:${ip}`, 5, 15 * 60 * 1000)  // 5 tentativas em 15 min
 *   resetRateLimit(`login:${ip}`)                     // após login bem-sucedido
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

/**
 * Verifica e incrementa o contador para a chave informada.
 * Retorna `true` se o número de tentativas passou do limite (bloqueado),
 * `false` se ainda está dentro do limite (permitido e incrementado).
 *
 * @param key        - Identificador único (ex: "login:192.168.0.1", "2fa:42")
 * @param maxAttempts - Número máximo de tentativas permitidas na janela
 * @param windowMs   - Duração da janela em milissegundos
 */
export function isRateLimited(
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const bucket = store.get(key);

  // Janela expirada ou primeira tentativa — reinicia o bucket
  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false; // primeira tentativa, não bloqueado
  }

  // Já passou do limite: bloqueia sem incrementar
  if (bucket.count >= maxAttempts) {
    return true;
  }

  // Dentro do limite: incrementa e permite
  bucket.count += 1;
  return false;
}

/**
 * Reseta o contador de uma chave (após login bem-sucedido, por exemplo).
 *
 * @param key - A mesma chave usada em isRateLimited
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * IP do cliente para o limite de tentativas.
 * Usa primeiro os headers definidos pela plataforma (Fly.io / Vercel), que o
 * cliente não consegue forjar; o X-Forwarded-For fica como último recurso.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("fly-client-ip") ??
    headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}
