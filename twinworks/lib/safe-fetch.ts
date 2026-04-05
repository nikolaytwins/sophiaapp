/**
 * Клиентские запросы к /api/* с cookie (nginx auth_request).
 * Не бросает исключений — чтобы один битый ответ не обнулял весь экран финансов.
 */
const clientFetchInit: RequestInit = {
  cache: 'no-store',
  credentials: 'include',
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json')
}

export async function fetchJsonArray<T>(url: string, fallback: T[] = []): Promise<T[]> {
  try {
    const res = await fetch(url, clientFetchInit)
    if (!res.ok) {
      console.warn('[safe-fetch]', url, res.status)
      return fallback
    }
    if (!isJsonResponse(res)) {
      console.warn('[safe-fetch] non-JSON body', url)
      return fallback
    }
    const data = (await res.json()) as unknown
    return Array.isArray(data) ? (data as T[]) : fallback
  } catch (e) {
    console.warn('[safe-fetch] error', url, e)
    return fallback
  }
}

export async function fetchJsonRecord<T extends Record<string, unknown>>(
  url: string,
  fallback: T | null = null
): Promise<T | null> {
  try {
    const res = await fetch(url, clientFetchInit)
    if (!res.ok) {
      console.warn('[safe-fetch]', url, res.status)
      return fallback
    }
    if (!isJsonResponse(res)) {
      console.warn('[safe-fetch] non-JSON body', url)
      return fallback
    }
    const data = (await res.json()) as unknown
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as T) : fallback
  } catch (e) {
    console.warn('[safe-fetch] error', url, e)
    return fallback
  }
}
