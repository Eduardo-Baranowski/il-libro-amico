import { createContext, useContext, useMemo, useState } from 'react'

import { api } from '../lib/api'
import { clearToken, getRole, getToken, setToken } from '../lib/token'
import type { Role } from '../lib/token'
import type { LoginResponse } from '../lib/types'

type AuthState = { token: string | null; role: Role | null }

type AuthContextValue = {
  auth: AuthState
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    token: getToken(),
    role: getRole(),
  })

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      login: async (email, senha) => {
        const res = await api<LoginResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, senha }),
        })
        setToken(res.token_sessao, res.papel)
        setAuth({ token: res.token_sessao, role: res.papel })
      },
      logout: () => {
        clearToken()
        setAuth({ token: null, role: null })
      },
    }),
    [auth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
