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
        <h1 style={{ margin: 0 }}>Minhas Solicitações</h1>
        <span className="muted requests-header-link">Ver histórico</span>
      </div>
      {q.isLoading ? <p>Carregando…</p> : null}
      {q.isError ? <p className="error">{(q.error as any)?.message}</p> : null}

      {q.data && q.data.length === 0 ? <p className="muted" style={{ padding: '20px', textAlign: 'center' }}>Você ainda não fez nenhuma solicitação.</p> : null}

      <div className="stack" style={{ marginTop: 20 }}>
        {q.data?.map((r) => (
          <article key={r.id} className="request-row" style={{ padding: '20px', gap: '24px', gridTemplateColumns: '140px 1fr auto' }}>
            <div className="request-thumb" style={{ width: '140px', height: '190px', borderRadius: '12px' }}>
              {r.livro_imagem_url ? (
                <img src={r.livro_imagem_url} alt={r.livro_titulo ?? 'Livro'} style={{ borderRadius: '12px' }} />
              ) : (
                <div style={{ fontSize: '2rem' }}>📖</div>
              )}
            </div>

            <div className="request-main">
              <h3 style={{ margin: 0 }}>{r.livro_titulo ?? 'Livro não informado'}</h3>
              <div className="request-author" style={{ fontSize: '1rem', marginTop: '4px' }}>{r.livro_autor ?? 'Autor não informado'}</div>

              <div className="request-meta" style={{ marginTop: '12px' }}>
                <span className={`request-status ${r.status}`}>{statusLabel(r.status)}</span>
                <span className="muted">{r.resposta ? 'Respondida pela editora' : 'Aguardando resposta'}</span>
              </div>

              <div style={{ marginTop: '16px', display: 'grid', gap: '8px' }}>
                <div className="request-note"><strong>Editora:</strong> {r.editor_nome ?? `#${r.editor_id}`}</div>
                <div className="request-note" style={{ background: 'var(--surface-2)', padding: '10px', borderRadius: '8px' }}>
                  <strong>Minha Mensagem:</strong> {r.conteudo}
                </div>
                {r.resposta && (
                  <div className="request-note" style={{ background: 'var(--primary-soft)', padding: '10px', borderRadius: '8px', color: 'var(--primary)' }}>
                    <strong>Resposta:</strong> {r.resposta}
                  </div>
                )}
              </div>
            </div>

            <div className="request-date" style={{ fontSize: '12px', fontWeight: 600 }}>
              {new Date(r.data_criacao).toLocaleDateString()}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
