import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import type { FeedItem } from '../../lib/types'

export function HomePage() {
  const q = useQuery({
    queryKey: ['feed'],
    queryFn: () => api<FeedItem[]>('/reader/feed?limit=30'),
  })

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: 2, minWidth: 320 }}>
        <h1 style={{ margin: 0 }}>Feed</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Leituras recentes (estilo rede social). Preço não aparece aqui.
        </p>

        {q.isLoading ? <p style={{ marginTop: 16 }}>Carregando…</p> : null}
        {q.isError ? (
          <p className="error" style={{ marginTop: 16 }}>
            {(q.error as any)?.message ?? 'Erro ao carregar feed'}
          </p>
        ) : null}

        {q.data && q.data.length === 0 ? (
          <p style={{ marginTop: 16 }} className="muted">
            Ainda não há leituras no feed.
          </p>
        ) : null}

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {q.data?.map((it) => (
            <div key={it.id} className="card" style={{ borderRadius: 10, padding: 12 }}>
              <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="row" style={{ alignItems: 'center' }}>
                  <span className="pill">{it.leitor.nome}</span>
                  <span className="pill">{it.status}</span>
                  {it.nota ? <span className="pill">nota {it.nota}/5</span> : null}
                </div>
                <div className="muted">
                  {it.criado_em ? new Date(it.criado_em).toLocaleString() : ''}
                </div>
              </div>

              <div className="row" style={{ marginTop: 10, alignItems: 'flex-start' }}>
                {it.livro.imagem_url ? (
                  <img
                    src={it.livro.imagem_url}
                    alt={it.livro.titulo}
                    style={{ width: 72, height: 96, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0' }}
                  />
                ) : (
                  <div style={{ width: 72, height: 96, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f1f5f9' }} />
                )}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <strong>{it.livro.titulo}</strong>
                  <div className="muted">{it.livro.autor}</div>
                  {it.comentario ? (
                    <p className="muted" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                      {it.comentario}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ flex: 1, minWidth: 260 }}>
        <h2 style={{ margin: 0 }}>Dicas</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Cadastre leituras como leitor em “Nova solicitação” e (em breve) “Minhas leituras”.
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          Swagger: <code>/apidocs/</code>. Em dev: proxy <code>/api</code>.
        </p>
      </div>
    </div>
  )
}
