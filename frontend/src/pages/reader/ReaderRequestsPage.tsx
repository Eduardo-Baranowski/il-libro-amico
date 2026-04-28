import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import type { ReaderRequest } from '../../lib/types'

export function ReaderRequestsPage() {
  const q = useQuery({
    queryKey: ['readerRequests'],
    queryFn: () => api<ReaderRequest[]>('/reader/requests'),
  })

  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Minhas solicitações</h1>
      {q.isLoading ? <p>Carregando…</p> : null}
      {q.isError ? <p className="error">{(q.error as any)?.message}</p> : null}

      {q.data && q.data.length === 0 ? <p className="muted">Sem solicitações.</p> : null}

      {q.data ? (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th align="left">ID</th>
                <th align="left">Editora</th>
                <th align="left">Status</th>
                <th align="left">Criada em</th>
                <th align="left">Conteúdo</th>
                <th align="left">Resposta</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: '6px 0' }}>{r.id}</td>
                  <td>{r.editor_id}</td>
                  <td>
                    <span className="pill primary">{r.status}</span>
                  </td>
                  <td>{new Date(r.data_criacao).toLocaleString()}</td>
                  <td className="muted">{r.conteudo}</td>
                  <td>{r.resposta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
