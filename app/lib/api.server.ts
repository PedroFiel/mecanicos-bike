function buildRequest(request: Request, path: string, init: RequestInit = {}): Request {
  const url = new URL(path, request.url)
  return new Request(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: request.headers.get("Cookie") || "",
      ...(init.headers as Record<string, string>),
    },
  })
}

// Para leituras (GET) — lança exceção em caso de erro HTTP
export async function apiGet<T>(request: Request, path: string): Promise<T> {
  const res = await fetch(buildRequest(request, path))
  if (!res.ok) {
    throw new Response(await res.text(), { status: res.status })
  }
  return res.json() as Promise<T>
}

type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> }

function parseApiErrors(json: {
  error?: string
  details?: { fieldErrors?: Record<string, string[]> }
}): Record<string, string> {
  if (json.details?.fieldErrors) {
    const errors: Record<string, string> = {}
    for (const [field, msgs] of Object.entries(json.details.fieldErrors)) {
      errors[field] = Array.isArray(msgs) ? msgs[0] : msgs
    }
    return errors
  }
  return { general: json.error ?? "Erro ao processar requisição" }
}

async function mutate<T>(
  request: Request,
  path: string,
  method: string,
  body?: unknown
): Promise<MutationResult<T>> {
  const req = buildRequest(request, path, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const res = await fetch(req)

  if (res.ok) {
    const data = res.status === 204 ? (null as T) : ((await res.json()) as T)
    return { ok: true, data }
  }

  const json = await res
    .json()
    .catch(() => ({ error: "Erro interno do servidor" }))
  return { ok: false, errors: parseApiErrors(json) }
}

// Para criações (POST)
export function apiPost<T>(
  request: Request,
  path: string,
  body: unknown
): Promise<MutationResult<T>> {
  return mutate<T>(request, path, "POST", body)
}

// Para atualizações (PUT)
export function apiPut<T>(
  request: Request,
  path: string,
  body: unknown
): Promise<MutationResult<T>> {
  return mutate<T>(request, path, "PUT", body)
}

// Para remoções (DELETE)
export function apiDelete(
  request: Request,
  path: string
): Promise<MutationResult<void>> {
  return mutate<void>(request, path, "DELETE")
}
