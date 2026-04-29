import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { ReaderRequest } from '../../lib/types'
import { ExploreBooks } from '../../app/components/ExploreBooks'

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
    <div className="card-container">
      <div className="requests-shell">
        <div className="requests-header">
          <h1 style={{ margin: 0 }}>Minhas Solicitações</h1>
          <span className="muted requests-header-link">Ver histórico</span>
        </div>
        
        {q.isLoading ? <p style={{ marginTop: 20 }}>Carregando…</p> : null}
        {q.isError ? <p className="error" style={{ marginTop: 20 }}>{(q.error as any)?.message}</p> : null}

        {q.data && q.data.length === 0 ? (
          <p className="muted" style={{ padding: '40px 20px', textAlign: 'center' }}>
            Você ainda não fez nenhuma solicitação.
          </p>
        ) : null}

        <div className="requests-list">
          {q.data?.map((r) => (
            <article key={r.id} className="request-card card">
              <div className="request-card-body">
                <div className="request-thumb">
                  {r.livro_imagem_url ? (
                    <img src={r.livro_imagem_url} alt={r.livro_titulo ?? 'Livro'} />
                  ) : (
                    <div className="request-placeholder">📖</div>
                  )}
                </div>

                <div className="request-main">
                  <div className="request-info-top">
                    <div>
                      <h3 style={{ margin: 0 }}>{r.livro_titulo ?? 'Livro não informado'}</h3>
                      <div className="request-author">{r.livro_autor ?? 'Autor não informado'}</div>
                    </div>
                    <div className="request-date">
                      {new Date(r.data_criacao).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="request-meta">
                    <span className={`request-status ${r.status}`}>{statusLabel(r.status)}</span>
                    <span className="muted small">{r.resposta ? 'Respondida pela editora' : 'Aguardando resposta'}</span>
                  </div>

                  <div className="request-details-stack">
                    <div className="request-note"><strong>Editora:</strong> {r.editor_nome ?? `#${r.editor_id}`}</div>
                    <div className="request-msg-box">
                      <strong>Minha Mensagem:</strong> {r.conteudo}
                    </div>
                    {r.resposta && (
                      <div className="request-reply-box">
                        <strong>Resposta:</strong> {r.resposta}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      
      <ExploreBooks />
    </div>
  )
}
