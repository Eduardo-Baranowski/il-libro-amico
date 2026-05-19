import { useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { RecommendedBookCard, type RecommendedBook } from './RecommendedBookCard'
import { LoadingState } from './ui/LoadingState'
import type { PaginatedResponse } from '../../lib/types'

export function ExploreBooks() {
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ['recommendations-infinite'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<PaginatedResponse<RecommendedBook>>(`/reader/recommendations?page=${pageParam}&per_page=10`),
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
  })

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1, rootMargin: '400px' },
    )
    if (loadMoreRef.current) obs.observe(loadMoreRef.current)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const allBooks = data?.pages.flatMap((p) => p.items) ?? []

  if (isLoading) {
    return (
      <section className="explore-section" style={{ marginBottom: '40px' }} aria-label="Recomendações em destaque">
        <LoadingState label="Carregando recomendações" variant="inline" />
      </section>
    )
  }

  if (isError || allBooks.length === 0) {
    return null
  }

  return (
    <section className="explore-section" style={{ marginBottom: '40px' }} aria-label="Recomendações em destaque">
      <div className="card" style={{ padding: '32px 0', borderRadius: '32px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div
          className="explore-header"
          style={{ padding: '0 32px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-1px', color: 'var(--primary)' }}>
              Explorar Novos Horizontes
            </h2>
            <p className="muted small" style={{ margin: '4px 0 0', fontWeight: 600 }}>
              Descubra obras aclamadas pela nossa comunidade.
            </p>
          </div>
          <Link
            to="/explorar"
            className="link-hover"
            style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}
          >
            Ver tudo →
          </Link>
        </div>

        <div
          className="explore-horizontal-scroll"
          style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '24px',
            padding: '4px 32px 32px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
          role="list"
        >
          {allBooks.map((book, idx) => (
            <div key={`${book.id}-${idx}`} role="listitem">
              <RecommendedBookCard book={book} layout="carousel" />
            </div>
          ))}

          <div ref={loadMoreRef} style={{ flex: '0 0 100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isFetchingNextPage && <div className="spinner mini" role="status" aria-label="Carregando mais" />}
            {!hasNextPage && allBooks.length > 0 && (
              <div
                style={{
                  writingMode: 'vertical-lr',
                  textTransform: 'uppercase',
                  fontSize: '10px',
                  fontWeight: 900,
                  opacity: 0.3,
                  letterSpacing: '2px',
                }}
                aria-hidden="true"
              >
                Fim da linha
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
