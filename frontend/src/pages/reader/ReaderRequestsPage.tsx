import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import type { ReaderRequest } from '../../lib/types'

function statusLabel(status: ReaderRequest['status']) {
  if (status === 'respondida') return 'RESPONDIDA'
  return 'PENDENTE'
}

export function ReaderRequestsPage() {
  const q = useQuery({
    queryKey: ['readerRequests'],
    queryFn: () => api<ReaderRequest[]>('/reader/requests'),
  })

  return (
    <div className="card requests-shell">
      <div className="requests-header">
        <h1 style={{ margin: 0 }}>My Requests</h1>
        <span className="muted requests-header-link">View all</span>
      </div>
      {q.isLoading ? <p>Carregando…</p> : null}
      {q.isError ? <p className="error">{(q.error as any)?.message}</p> : null}

      {q.data && q.data.length === 0 ? <p className="muted">Sem solicitações.</p> : null}

      <div className="stack" style={{ marginTop: 10 }}>
        {q.data?.map((r) => (
          <article key={r.id} className="request-row">
            <div className="request-thumb">
              {r.livro_imagem_url ? (
                <img src={r.livro_imagem_url} alt={r.livro_titulo ?? 'Livro'} />
              ) : (
                <span>Sem capa</span>
              )}
            </div>

            <div className="request-main">
              <div className="request-title">{r.livro_titulo ?? 'Livro não informado'}</div>
              <div className="request-author">{r.livro_autor ?? 'Autor não informado'}</div>

              <div className="request-meta">
                <span className={`request-status ${r.status}`}>{statusLabel(r.status)}</span>
                <span>{r.resposta ? 'Respondida pela editora' : 'Aguardando resposta'}</span>
              </div>

              <div className="request-note">Editora: {r.editor_nome ?? `#${r.editor_id}`}</div>
              <div className="request-note">Mensagem: {r.conteudo}</div>
              {r.resposta ? <div className="request-note">Resposta: {r.resposta}</div> : null}
            </div>

            <div className="request-date">{new Date(r.data_criacao).toLocaleString()}</div>
          </article>
        ))}
      </div>
    </div>
  )
}
