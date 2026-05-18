import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { ReaderRequest, PaginatedResponse } from '../../lib/types'
import { ExploreBooks } from '../../app/components/ExploreBooks'
import { Pagination } from '../../app/components/Pagination'

function statusLabel(status: ReaderRequest['status']) {
  if (status === 'respondida') return 'RESPONDIDA'
  return 'PENDENTE'
}

export function ReaderRequestsPage() {
  const [page, setPage] = useState(1)
  
  const q = useQuery({
    queryKey: ['readerRequests', page],
    queryFn: () => api<PaginatedResponse<ReaderRequest>>(`/reader/requests?page=${page}&per_page=10`),
  })

  return (
    <div className="card-container">
      <ExploreBooks />
      <div className="requests-shell">
        <div className="requests-header">
          <h1 style={{ margin: 0 }}>Minhas Solicitações</h1>
          <span className="muted requests-header-link">Gerenciamento de Pedidos</span>
        </div>
        
        {q.isLoading ? <p style={{ marginTop: 20, textAlign: 'center' }} className="muted">Carregando…</p> : null}
        {q.isError ? <p className="error" style={{ marginTop: 20 }}>{(q.error as any)?.message}</p> : null}

        {q.data && q.data.items.length === 0 ? (
          <p className="muted" style={{ padding: '60px 20px', textAlign: 'center' }}>
            Você ainda não fez nenhuma solicitação.
          </p>
        ) : null}

        <div className="requests-list">
          {q.data?.items.map((r) => (
            <article key={r.id} className="request-card card">
              <div className="request-card-body">
                <div className="request-thumb">
                  {r.livro_imagem_url ? (
                    <img src={r.livro_imagem_url} alt={r.livro_titulo ?? 'Livro'} />
                  ) : (
                    <div className="feed-book-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📖</div>
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

        <Pagination 
          currentPage={page} 
          totalPages={q.data?.pages ?? 1} 
          onPageChange={setPage} 
          isLoading={q.isFetching}
        />
      </div>
    </div>
  )
}
