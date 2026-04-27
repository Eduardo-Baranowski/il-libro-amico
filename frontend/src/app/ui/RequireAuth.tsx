import { Navigate } from 'react-router-dom'

import type { Role } from '../../lib/token'
import { useAuth } from '../AuthProvider'

type Props = {
  role?: Role
  children: React.ReactNode
}

export function RequireAuth({ role, children }: Props) {
  const { auth } = useAuth()
  if (!auth.token || !auth.role) return <Navigate to="/entrar" replace />
  if (role && auth.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}
