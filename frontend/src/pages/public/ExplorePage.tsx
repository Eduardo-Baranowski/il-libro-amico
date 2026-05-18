import { useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { StarRating } from '../../app/components/StarRating'
import type { PaginatedResponse } from '../../lib/types'

interface RecommendedBook {
  id: number
  titulo: string
  autor: string
  imagem_url: string | null
  average_rating: number
}

export function ExplorePage() {
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['recommendations-grid'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api<PaginatedResponse<RecommendedBook>>(`/reader/recommendations?page=${pageParam}&per_page=20`),
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
  })

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    )
    if (loadMoreRef.current) obs.observe(loadMoreRef.current)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const allBooks = data?.pages.flatMap(p => p.items) ?? []

  return (
    <div className="card-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="explore-hero" style={{ marginBottom: '48px', marginTop: '24px' }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--primary)', lineHeight: 1 }}>
          Explorar Novos Horizontes
        </h1>
        <p className="muted" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', fontWeight: 600, marginTop: '12px', maxWidth: '600px' }}>
          Mergulhe nas obras mais bem avaliadas e recomendadas pela nossa comunidade.
        </p>
      </div>

      {isLoading && <p className="muted">Preparando sua curadoria personalizada…</p>}

      <div className="explore-grid-responsive">
        {allBooks.map((book, idx) => (
          <Link key={`${book.id}-${idx}`} to={`/livro/${book.id}`} className="explore-card hover-scale" style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            textDecoration: 'none'
          }}>
            <div style={{ 
              width: '100%', 
              aspectRatio: '2/3',
              borderRadius: '20px', 
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              background: 'var(--surface-2)',
              position: 'relative'
            }}>
              {book.imagem_url ? (
                <img src={book.imagem_url} alt={book.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="feed-book-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📖</div>
              )}
              <div style={{ 
                position: 'absolute', 
                top: '12px', 
                right: '12px', 
                background: 'rgba(255,255,255,0.92)', 
                backdropFilter: 'blur(8px)', 
                padding: '4px 8px', 
                borderRadius: '10px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
              }}>
                <StarRating rating={Math.round(book.average_rating)} size={10} />
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--primary)' }}>{book.average_rating}</span>
              </div>
            </div>
            
            <div style={{ padding: '0 4px' }}>
              <strong style={{ 
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                fontSize: '15px', 
                fontWeight: 800,
                color: 'var(--text-main)',
                lineHeight: '1.2',
                marginBottom: '4px'
              }}>{book.titulo}</strong>
              <div className="muted small" style={{ fontWeight: 600, fontSize: '13px' }}>{book.autor}</div>
            </div>
          </Link>
        ))}
      </div>

      <div ref={loadMoreRef} style={{ padding: '80px 0', textAlign: 'center' }}>
        {isFetchingNextPage ? (
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        ) : !hasNextPage && allBooks.length > 0 ? (
          <div style={{ padding: '40px', background: 'var(--surface-2)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
             <p className="muted small" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>✨ Você explorou todo o acervo de destaques ✨</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
