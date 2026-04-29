import { useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { api } from '../../lib/api'
import type { FeedItem, PaginatedResponse } from '../../lib/types'
import { StarRating } from '../../app/components/StarRating'

const statusLabels: Record<string, string> = {
  quero_ler: 'Quero ler',
  lendo: 'Lendo',
  lido: 'Lido'
}

export function HomePage() {
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: ['feed-infinite'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api<PaginatedResponse<FeedItem>>(`/reader/feed?page=${pageParam}&per_page=10`),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.pages) {
        return lastPage.page + 1
      }
      return undefined
    }
  })

  // Intersection Observer para carregar mais automaticamente
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 1.0 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const allItems = data?.pages.flatMap(page => page.items) ?? []

  return (
    <div className="feed-container">
      <div className="feed-main-card card">
        <div className="feed-header">
          <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--primary)' }}>Comunidade Lumina</h1>
          <p className="muted" style={{ fontSize: '1.1rem', marginTop: '4px' }}>Descubra o que outros leitores estão explorando agora.</p>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p className="muted">Sincronizando experiências literárias…</p>
          </div>
        ) : null}

        {isError ? (
          <div className="error" style={{ marginTop: 24, padding: '16px', borderRadius: '12px' }}>
            {(error as any)?.message ?? 'Erro ao carregar feed'}
          </div>
        ) : null}

        {allItems.length === 0 && !isLoading ? (
          <p style={{ marginTop: 24, textAlign: 'center' }} className="muted">
            O silêncio ecoa na biblioteca... Seja o primeiro a registrar uma leitura!
          </p>
        ) : null}

        <div className="feed-list">
          {allItems.map((it, idx) => (
            <article 
              key={`${it.id}-${idx}`} 
              className="feed-item card" 
              style={{ 
                border: '1px solid var(--border)', 
                borderRadius: '24px',
                animation: 'slideDown 0.4s ease forwards',
                animationDelay: `${(idx % 10) * 0.05}s`,
                opacity: 0
              }}
            >
              <div className="feed-item-top">
                <div className="feed-item-user" style={{ gap: '12px' }}>
                  <span className="pill primary" style={{ fontWeight: 800, fontSize: '11px', letterSpacing: '0.05em' }}>{it.leitor.nome}</span>
                  <span className="pill secondary" style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.8 }}>{statusLabels[it.status] || it.status}</span>
                </div>
                <div className="feed-item-date muted" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {it.criado_em ? new Date(it.criado_em).toLocaleDateString() : ''}
                </div>
              </div>

              <div className="feed-item-content">
                <div className="feed-item-media">
                  <Link to={`/livro/${it.livro.id}`} className="hover-scale">
                    {it.livro.imagem_url ? (
                      <img src={it.livro.imagem_url} alt={it.livro.titulo} className="feed-book-cover" style={{ borderRadius: '18px', boxShadow: '0 12px 24px rgba(0,0,0,0.12)' }} />
                    ) : (
                      <div className="feed-book-placeholder">📖</div>
                    )}
                  </Link>
                  {it.nota ? (
                    <div className="feed-item-rating" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '10px' }}>
                      <StarRating rating={it.nota} size={14} />
                    </div>
                  ) : null}
                </div>

                <div className="feed-item-info">
                  <Link to={`/livro/${it.livro.id}`} className="feed-book-title-link">
                    <strong className="link-hover" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', lineHeight: '1.2' }}>{it.livro.titulo}</strong>
                  </Link>
                  <div className="muted" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '14px', marginTop: '4px' }}>{it.livro.autor}</div>
                  {it.comentario ? (
                    <div style={{ background: 'var(--surface-2)', padding: '20px', borderRadius: '20px', fontSize: '14.5px', lineHeight: '1.6', color: 'var(--text)', border: '1px solid rgba(0,0,0,0.03)' }}>
                      {it.comentario}
                    </div>
                  ) : (
                    <p className="muted small italic" style={{ opacity: 0.6 }}>O leitor preferiu manter suas reflexões em segredo por enquanto.</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Elemento sentinela para o scroll infinito */}
        <div ref={loadMoreRef} style={{ padding: '40px 0', textAlign: 'center' }}>
          {isFetchingNextPage ? (
            <div className="stack" style={{ gap: '12px' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
              <p className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Expandindo horizontes…</p>
            </div>
          ) : hasNextPage ? (
            <button className="btn secondary small" onClick={() => fetchNextPage()}>Carregar mais leituras</button>
          ) : allItems.length > 0 ? (
            <p className="muted small" style={{ fontWeight: 600 }}>✨ Você chegou ao fim do acervo da comunidade.</p>
          ) : null}
        </div>
      </div>

      <aside className="feed-sidebar">
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, #1a365d 100%)', 
          border: 'none', 
          padding: '32px',
          color: '#fff',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,32,69,0.2)',
          position: 'sticky',
          top: '100px'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-1px', color: '#fff' }}>Universo Lumina</h2>
          <div className="stack" style={{ marginTop: 24, gap: '24px' }}>
            <p style={{ fontSize: '14px', lineHeight: '1.7', opacity: 0.9, margin: 0 }}>
              Descubra, avalie e compartilhe suas jornadas literárias com uma comunidade apaixonada por livros.
            </p>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)' }} />
            <div className="stack" style={{ gap: '16px' }}>
              <div className="row" style={{ gap: '14px', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📖</div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Registre suas experiências</span>
              </div>
              <div className="row" style={{ gap: '14px', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏢</div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Explore acervos de editoras</span>
              </div>
            </div>
            <Link to="/livros" className="btn" style={{ 
              marginTop: '12px', 
              background: '#fff', 
              color: 'var(--primary)', 
              fontWeight: 900, 
              textAlign: 'center',
              borderRadius: '16px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
            }}>
              Ver Catálogo Completo
            </Link>
          </div>
        </div>
      </aside>
    </div>
  )
}
