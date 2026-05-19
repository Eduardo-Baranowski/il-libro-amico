import { env } from './env'
import { getToken, clearToken } from './token'

export type ApiError = { status: number; message: string }

const API_TIMEOUT_MS = 30_000

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (!isFormData && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw { status: 408, message: 'Tempo limite excedido. Tente novamente.' } satisfies ApiError
    }
    throw { status: 0, message: 'Falha de rede. Verifique sua conexão.' } satisfies ApiError
  } finally {
    clearTimeout(timeoutId)
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken()
      window.location.href = '/entrar?expired=true'
      return undefined as any
    }
    const body = (await parseJsonSafe(res)) as any
    const msg = body?.message || body?.msg || res.statusText || 'Erro'
    throw { status: res.status, message: String(msg) } satisfies ApiError
  }

  return (await parseJsonSafe(res)) as T
}
