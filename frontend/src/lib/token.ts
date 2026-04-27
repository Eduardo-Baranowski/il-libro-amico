const KEY = 'doc.jwt'
const ROLE_KEY = 'doc.role'

export type Role = 'admin' | 'editor' | 'leitor'

export function getToken(): string | null {
  return localStorage.getItem(KEY)
}

export function setToken(token: string, role: Role) {
  localStorage.setItem(KEY, token)
  localStorage.setItem(ROLE_KEY, role)
}

export function clearToken() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(ROLE_KEY)
}

export function getRole(): Role | null {
  const v = localStorage.getItem(ROLE_KEY)
  if (v === 'admin' || v === 'editor' || v === 'leitor') return v
  return null
}
