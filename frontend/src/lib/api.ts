import { env } from './env'
import { getToken } from './token'

export type ApiError = { status: number; message: string }

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

  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers,
  })

  if (!res.ok) {
    const body = (await parseJsonSafe(res)) as any
    const msg = body?.message || body?.msg || res.statusText || 'Erro'
    throw { status: res.status, message: String(msg) } satisfies ApiError
  }

  return (await parseJsonSafe(res)) as T
}
