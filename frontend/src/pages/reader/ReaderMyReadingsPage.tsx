import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import type { MyReading } from '../../lib/types'

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
      <p className="muted">Aqui aparecem os livros que você marcou como quero ler / lendo / lido. (Sem preço.)</p>

      {q.isLoading ? <p>Carregando…</p> : null}
      {q.isError ? <p className="error">{(q.error as any)?.message}</p> : null}

      {q.data && q.data.length === 0 ? <p className="muted">Você ainda não registrou leituras.</p> : null}

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {q.data?.map((r) => (
          <div key={r.id} className="card" style={{ borderRadius: 10, padding: 12 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              {r.livro.imagem_url ? (
                <img
                  src={r.livro.imagem_url}
                  alt={r.livro.titulo}
                  style={{ width: 72, height: 96, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0' }}
                />
              ) : (
                <div style={{ width: 72, height: 96, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f1f5f9' }} />
              )}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong>{r.livro.titulo}</strong>
                    <div className="muted">{r.livro.autor}</div>
                    <div className="muted">Editora: {r.livro.editora}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="pill primary">{statusLabel(r.status)}</span>
                    {r.nota ? <div className="muted" style={{ marginTop: 6 }}>nota {r.nota}/5</div> : null}
                  </div>
                </div>

                {r.comentario ? (
                  <p className="muted" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                    {r.comentario}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
