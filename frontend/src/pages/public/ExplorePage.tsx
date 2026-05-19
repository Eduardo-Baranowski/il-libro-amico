import { useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { RecommendedBookCard, type RecommendedBook } from '../../app/components/RecommendedBookCard'
import { QueryStatus } from '../../app/components/ui/QueryStatus'
import { LoadingState } from '../../app/components/ui/LoadingState'
import type { PaginatedResponse } from '../../lib/types'

export function ExplorePage() {
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const query = useInfiniteQuery({
    queryKey: ['recommendations-grid'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<PaginatedResponse<RecommendedBook>>(`/reader/recommendations?page=${pageParam}&per_page=20`),
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error, refetch, isFetched } =
    query

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

  return (
    <div className="card-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <header className="explore-hero" style={{ marginBottom: '48px', marginTop: '24px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: 'var(--primary)',
            lineHeight: 1,
          }}
        >
          Explorar Novos Horizontes
        </h1>
        <p
          className="muted"
          style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', fontWeight: 600, marginTop: '12px', maxWidth: '600px' }}
        >
          Mergulhe nas obras mais bem avaliadas e recomendadas pela nossa comunidade.
        </p>
      </header>

      <QueryStatus
        isLoading={isLoading}
        isError={isError}
        error={error as Error}
        isEmpty={isFetched && allBooks.length === 0}
        onRetry={() => refetch()}
        loadingVariant="skeleton-grid"
        loadingLabel="Preparando sua curadoria personalizada"
        emptyTitle="Nenhuma recomendação disponível"
        emptyDescription="Ainda não há livros avaliados para exibir. Volte em breve ou explore o catálogo."
        emptyActionLabel="Ver catálogo"
        emptyActionTo="/livros"
      >
        <div className="explore-grid-responsive" role="list" aria-label="Livros recomendados">
          {allBooks.map((book, idx) => (
            <div key={`${book.id}-${idx}`} role="listitem">
              <RecommendedBookCard book={book} layout="grid" />
            </div>
          ))}
        </div>
      </QueryStatus>

      <div ref={loadMoreRef} style={{ padding: '80px 0', textAlign: 'center' }} aria-hidden={isLoading}>
        {isFetchingNextPage ? (
          <LoadingState label="Carregando mais obras" variant="inline" />
        ) : !hasNextPage && allBooks.length > 0 ? (
          <div
            style={{
              padding: '40px',
              background: 'var(--surface-2)',
              borderRadius: '24px',
              border: '1px dashed var(--border)',
            }}
          >
            <p className="muted small" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>
              Você explorou todo o acervo de destaques
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
