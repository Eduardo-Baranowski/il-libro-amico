import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface EditorRequest {
  id: number
  leitor_id: number
  leitor_nome: string
  livro_id: number
  livro_titulo: string | null
  livro_autor: string | null
  livro_imagem_url: string | null
  conteudo: string
  resposta: string | null
  status: 'pendente' | 'respondida'
  data_criacao: string
}

export function EditorRequestsPage() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['editorRequests'],
    queryFn: () => api<EditorRequest[]>('/editor/requests'),
  })

  const [draft, setDraft] = useState<Record<number, string>>({})

  const respondM = useMutation({
    mutationFn: ({ id, resposta }: { id: number; resposta: string }) =>
      api<{ message: string }>(`/editor/requests/${id}/respond`, {
        method: 'PUT',
        body: JSON.stringify({ resposta }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['editorRequests'] })
    },
  })

  return (
    <div className="card-container">
      <div className="requests-shell">
        <div className="requests-header">
          <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}>Solicitações Recebidas</h1>
          <span className="muted requests-header-link" style={{ fontWeight: 700 }}>Painel de Curadoria</span>
        </div>

        {q.isLoading ? <p style={{ marginTop: 40, textAlign: 'center' }} className="muted">Carregando…</p> : null}
        {q.isError ? <p className="error" style={{ marginTop: 20 }}>{(q.error as any)?.message}</p> : null}

        {q.data && q.data.length === 0 ? (
          <div className="card" style={{ padding: '80px 24px', textAlign: 'center', borderRadius: '32px', marginTop: '24px' }}>
             <p className="muted" style={{ fontWeight: 600 }}>Nenhuma solicitação pendente no momento.</p>
          </div>
        ) : null}

        <div className="requests-list" style={{ marginTop: '32px' }}>
          {q.data?.map((r) => (
            <article key={r.id} className="request-card card" style={{ borderRadius: '28px', padding: '32px' }}>
              <div className="request-card-body" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '32px' }}>
                <div className="request-thumb">
                  {r.livro_imagem_url ? (
                    <img src={r.livro_imagem_url} alt={r.livro_titulo ?? 'Livro'} style={{ width: '100%', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
                  ) : (
                    <div className="feed-book-placeholder" style={{ width: '100%', height: '160px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📖</div>
                  )}
                </div>

                <div className="request-main">
                  <div className="request-info-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{r.livro_titulo ?? 'Obra não especificada'}</h3>
                      <div className="muted" style={{ fontWeight: 600 }}>{r.livro_autor ?? 'Autor não informado'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <div className="muted small" style={{ fontWeight: 700 }}>{new Date(r.data_criacao).toLocaleDateString()}</div>
                       <span className={`pill ${r.status === 'respondida' ? 'success' : 'primary'} mini-pill`} style={{ marginTop: '8px', fontSize: '9px' }}>{r.status.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="stack" style={{ gap: '20px' }}>
                    <div style={{ background: 'var(--surface-2)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.03)' }}>
                      <div className="row" style={{ gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                         <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{r.leitor_nome.slice(0, 1).toUpperCase()}</div>
                         <strong style={{ fontSize: '13px' }}>{r.leitor_nome} perguntou:</strong>
                      </div>
                      <div style={{ fontSize: '14.5px', lineHeight: '1.6', color: 'var(--text)' }}>"{r.conteudo}"</div>
                    </div>

                    {r.status === 'respondida' ? (
                      <div style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                        <strong style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.6 }}>Minha Resposta</strong>
                        <div style={{ fontSize: '14.5px', lineHeight: '1.6' }}>{r.resposta}</div>
                      </div>
                    ) : (
                      <div className="stack" style={{ gap: '12px' }}>
                        <textarea
                          className="input"
                          rows={4}
                          placeholder="Escreva sua resposta para o leitor..."
                          style={{ borderRadius: '16px', padding: '16px', resize: 'none' }}
                          value={draft[r.id] ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                        />
                        <button
                          className="btn"
                          type="button"
                          style={{ height: '48px', borderRadius: '12px', fontWeight: 800 }}
                          onClick={() => respondM.mutate({ id: r.id, resposta: draft[r.id] ?? '' })}
                          disabled={respondM.isPending}
                        >
                          {respondM.isPending ? 'Enviando…' : 'Enviar Resposta Oficial'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
