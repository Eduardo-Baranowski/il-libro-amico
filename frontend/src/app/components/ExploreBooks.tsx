import { useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { StarRating } from './StarRating'
import type { PaginatedResponse } from '../../lib/types'

interface RecommendedBook {
  id: number
  titulo: string
  autor: string
  imagem_url: string | null
  average_rating: number
}

export function ExploreBooks() {
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['recommendations-infinite'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api<PaginatedResponse<RecommendedBook>>(`/reader/recommendations?page=${pageParam}&per_page=10`),
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

  if (isLoading || allBooks.length === 0) return null

  return (
    <section className="explore-section" style={{ marginBottom: '40px' }}>
      <div className="card" style={{ padding: '32px 0', borderRadius: '32px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="explore-header" style={{ padding: '0 32px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-1px', color: 'var(--primary)' }}>Explorar Novos Horizontes</h3>
            <p className="muted small" style={{ margin: '4px 0 0', fontWeight: 600 }}>Descubra obras aclamadas pela nossa comunidade.</p>
          </div>
          <Link to="/explorar" className="link-hover" style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ver tudo →</Link>
        </div>
        
        <div className="explore-horizontal-scroll" style={{ 
          display: 'flex', 
          overflowX: 'auto', 
          gap: '24px', 
          padding: '4px 32px 32px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          {allBooks.map((book, idx) => (
            <Link key={`${book.id}-${idx}`} to={`/livro/${book.id}`} className="explore-card hover-scale" style={{ 
              flex: '0 0 180px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textDecoration: 'none'
            }}>
              <div className="explore-card-media" style={{ 
                width: '100%', 
                height: '250px', 
                borderRadius: '20px', 
                overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
                background: 'var(--surface-2)',
                position: 'relative'
              }}>
                {book.imagem_url ? (
                  <img src={book.imagem_url} alt={book.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="feed-book-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📖</div>
                )}
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', padding: '4px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <StarRating rating={Math.round(book.average_rating)} size={10} />
                  <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--primary)' }}>{book.average_rating}</span>
                </div>
              </div>
              <div className="explore-card-info">
                <strong className="explore-card-title" style={{ 
                  display: 'block', 
                  fontSize: '15px', 
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.2'
                }}>{book.titulo}</strong>
                <div className="muted small" style={{ fontWeight: 600, marginTop: '4px' }}>{book.autor}</div>
              </div>
            </Link>
          ))}

          {/* Loader for Infinite Scroll */}
          <div ref={loadMoreRef} style={{ flex: '0 0 100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isFetchingNextPage && <div className="spinner mini"></div>}
            {!hasNextPage && allBooks.length > 0 && (
              <div style={{ writingMode: 'vertical-lr', textTransform: 'uppercase', fontSize: '10px', fontWeight: 900, opacity: 0.3, letterSpacing: '2px' }}>Fim da Linha</div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
