const KEY = 'doc.jwt'
const ROLE_KEY = 'doc.role'
const NAME_KEY = 'doc.name'
const IMAGE_KEY = 'doc.image'

export type Role = 'admin' | 'editor' | 'leitor'

export function getToken(): string | null {
  return localStorage.getItem(KEY)
}

export function setToken(token: string, role: Role, name: string, image: string | null) {
  localStorage.setItem(KEY, token)
  localStorage.setItem(ROLE_KEY, role)
  localStorage.setItem(NAME_KEY, name)
  if (image) localStorage.setItem(IMAGE_KEY, image)
  else localStorage.removeItem(IMAGE_KEY)
}

export function clearToken() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(NAME_KEY)
  localStorage.removeItem(IMAGE_KEY)
}

export function getRole(): Role | null {
  const v = localStorage.getItem(ROLE_KEY)
  if (v === 'admin' || v === 'editor' || v === 'leitor') return v
  return null
}

export function getName(): string | null {
  return localStorage.getItem(NAME_KEY)
}

export function getImageUrl(): string | null {
  return localStorage.getItem(IMAGE_KEY)
}

export function getUserIdFromToken(): number | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    const sub = Number(json?.sub)
    return Number.isFinite(sub) ? sub : null
  } catch {
    return null
  }
}
