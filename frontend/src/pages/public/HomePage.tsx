import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { api } from '../../lib/api'
import type { FeedItem } from '../../lib/types'
import { StarRating } from '../../app/components/StarRating'

const statusLabels: Record<string, string> = {
  quero_ler: 'Quero ler',
  lendo: 'Lendo',
  lido: 'Lido'
}

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
          Leituras recentes da comunidade.
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
                  <span className="pill primary">{it.leitor.nome}</span>
                  <span className="pill">{statusLabels[it.status] || it.status}</span>
                  {it.nota ? (
                    <div style={{ marginLeft: '8px' }}>
                      <StarRating rating={it.nota} size={16} />
                    </div>
                  ) : null}
                </div>
                <div className="muted">
                  {it.criado_em ? new Date(it.criado_em).toLocaleString() : ''}
                </div>
              </div>

              <div className="row" style={{ marginTop: 10, alignItems: 'flex-start' }}>
                <Link to={`/livro/${it.livro.id}`} style={{ display: 'block', transition: 'transform 0.2s' }} className="hover-scale">
                  {it.livro.imagem_url ? (
                    <img
                      src={it.livro.imagem_url}
                      alt={it.livro.titulo}
                      style={{ width: 120, height: 160, objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  ) : (
                    <div style={{ width: 120, height: 160, borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📖</div>
                  )}
                </Link>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <Link to={`/livro/${it.livro.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <strong style={{ display: 'block' }} className="link-hover">{it.livro.titulo}</strong>
                  </Link>
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

      <div className="card card-accent" style={{ flex: 1, minWidth: 260 }}>
        <h2 style={{ margin: 0 }}>Loja integrada</h2>
        <p style={{ marginTop: 8, opacity: 0.9 }}>
          O app continua social no feed, e as vendas agora ficam na guia <code>Livros</code>.
        </p>
        <p style={{ marginTop: 8, opacity: 0.9 }}>
          Leitor compra com estoque em tempo real. Editor gerencia catálogo e estoque.
        </p>
      </div>
    </div>
  )
}
