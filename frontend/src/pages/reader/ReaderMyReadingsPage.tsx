import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { MyReading } from '../../lib/types'
import { StarRating } from '../../app/components/StarRating'

function statusLabel(st: MyReading['status']) {
  if (st === 'quero_ler') return 'Quero ler'
  if (st === 'lendo') return 'Lendo'
  return 'Lido'
}

export function ReaderMyReadingsPage() {
  const q = useQuery({
    queryKey: ['myReadings'],
    queryFn: () => api<MyReading[]>('/reader/readings'),
  })

  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Minhas leituras</h1>
      <p className="muted">Aqui aparecem os livros que você marcou como quero ler / lendo / lido.</p>

      {q.isLoading ? <p>Carregando…</p> : null}
      {q.isError ? <p className="error">{(q.error as any)?.message}</p> : null}

      {q.data && q.data.length === 0 ? <p className="muted">Você ainda não registrou leituras.</p> : null}

      <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        {q.data?.map((r) => (
          <div key={r.id} className="card" style={{ borderRadius: 16, padding: 16 }}>
            <div className="row" style={{ alignItems: 'flex-start', gap: '20px' }}>
              {r.livro.imagem_url ? (
                <img
                  src={r.livro.imagem_url}
                  alt={r.livro.titulo}
                  style={{ width: 120, height: 160, objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              ) : (
                <div style={{ width: 120, height: 160, borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📖</div>
              )}
              <div style={{ flex: 1 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{r.livro.titulo}</h3>
                    <div className="muted">{r.livro.autor}</div>
                    <div className="muted" style={{ fontSize: '13px' }}>Editora: {r.livro.editora}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="pill primary">{statusLabel(r.status)}</span>
                    {r.nota ? (
                      <div style={{ marginTop: 8 }}>
                        <StarRating rating={r.nota} size={14} />
                      </div>
                    ) : null}
                  </div>
                </div>

                {r.comentario ? (
                  <div style={{ marginTop: 16, padding: '12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                    <p className="muted" style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                      {r.comentario}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
