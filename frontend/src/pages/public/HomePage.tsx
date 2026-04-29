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
    <div className="feed-container">
      <div className="feed-main-card card">
        <div className="feed-header">
          <h1 style={{ margin: 0 }}>Feed</h1>
          <p className="muted">Leituras recentes da comunidade.</p>
        </div>

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

        <div className="feed-list">
          {q.data?.map((it) => (
            <article key={it.id} className="feed-item card">
              <div className="feed-item-top">
                <div className="feed-item-user">
                  <span className="pill primary">{it.leitor.nome}</span>
                  <span className="pill">{statusLabels[it.status] || it.status}</span>
                </div>
                <div className="feed-item-date muted">
                  {it.criado_em ? new Date(it.criado_em).toLocaleString() : ''}
                </div>
              </div>

              <div className="feed-item-content">
                <div className="feed-item-media">
                  <Link to={`/livro/${it.livro.id}`} className="hover-scale">
                    {it.livro.imagem_url ? (
                      <img src={it.livro.imagem_url} alt={it.livro.titulo} className="feed-book-cover" />
                    ) : (
                      <div className="feed-book-placeholder">📖</div>
                    )}
                  </Link>
                  {it.nota ? (
                    <div className="feed-item-rating">
                      <StarRating rating={it.nota} size={20} />
                    </div>
                  ) : null}
                </div>

                <div className="feed-item-info">
                  <Link to={`/livro/${it.livro.id}`} className="feed-book-title-link">
                    <strong className="link-hover">{it.livro.titulo}</strong>
                  </Link>
                  <div className="muted">{it.livro.autor}</div>
                  {it.comentario ? (
                    <p className="feed-item-comment">
                      {it.comentario}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="feed-sidebar card card-accent">
        <h2 style={{ margin: 0 }}>Loja integrada</h2>
        <div className="stack" style={{ marginTop: 12 }}>
          <p style={{ opacity: 0.9 }}>
            O app continua social no feed, e as vendas agora ficam na guia <code>Livros</code>.
          </p>
          <p style={{ opacity: 0.9 }}>
            Leitor compra com estoque em tempo real. Editor gerencia catálogo e estoque.
          </p>
        </div>
      </aside>
    </div>
  )
}
