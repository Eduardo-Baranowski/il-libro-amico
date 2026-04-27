import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import type { Report } from '../../lib/types'

export function AdminReportsPage() {
  const q = useQuery({
    queryKey: ['adminReports'],
    queryFn: () => api<Report>('/admin/reports'),
  })

  if (q.isLoading) return <div className="card">Carregando…</div>
  if (q.isError) return <div className="card error">{(q.error as any)?.message}</div>

  const r = q.data!

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: 1, minWidth: 260 }}>
        <h1 style={{ marginTop: 0 }}>Relatórios</h1>
        <p className="muted">Resumo do sistema.</p>
        <div className="row" style={{ marginTop: 12 }}>
          <span className="pill">Total usuários: {r.total_usuarios}</span>
          <span className="pill">Total livros: {r.total_livros}</span>
        </div>
      </div>

      <div className="card" style={{ flex: 1, minWidth: 320 }}>
        <h2 style={{ marginTop: 0 }}>Usuários por papel</h2>
        <ul>
          {Object.entries(r.usuarios).map(([k, v]) => (
            <li key={k}>
              <span className="pill">{k}</span> {v}
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ flex: 1, minWidth: 320 }}>
        <h2 style={{ marginTop: 0 }}>Solicitações por status</h2>
        <ul>
          {Object.entries(r.solicitacoes).map(([k, v]) => (
            <li key={k}>
              <span className="pill">{k}</span> {v}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
