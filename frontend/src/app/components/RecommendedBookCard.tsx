import { Link } from 'react-router-dom'
import { StarRating } from './StarRating'

export type RecommendedBook = {
  id: number
  titulo: string
  autor: string
  imagem_url: string | null
  average_rating: number
}

type RecommendedBookCardProps = {
  book: RecommendedBook
  layout?: 'grid' | 'carousel'
}

export function RecommendedBookCard({ book, layout = 'grid' }: RecommendedBookCardProps) {
  const isCarousel = layout === 'carousel'

  return (
    <Link
      to={`/livro/${book.id}`}
      className="explore-card hover-scale"
      style={{
        flex: isCarousel ? '0 0 180px' : undefined,
        display: 'flex',
        flexDirection: 'column',
        gap: isCarousel ? '16px' : '12px',
        textDecoration: 'none',
      }}
      aria-label={`${book.titulo}, por ${book.autor}, nota ${book.average_rating}`}
    >
      <div
        className={isCarousel ? 'explore-card-media' : undefined}
        style={{
          width: '100%',
          aspectRatio: isCarousel ? undefined : '2/3',
          height: isCarousel ? '250px' : undefined,
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          background: 'var(--surface-2)',
          position: 'relative',
        }}
      >
        {book.imagem_url ? (
          <img src={book.imagem_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div
            className="feed-book-placeholder"
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}
            aria-hidden="true"
          >
            📖
          </div>
        )}
        <div
          style={{
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
          aria-label={`Avaliação média ${book.average_rating}`}
        >
          <StarRating rating={Math.round(book.average_rating)} size={10} />
          <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--primary)' }}>{book.average_rating}</span>
        </div>
      </div>
      <div className={isCarousel ? 'explore-card-info' : undefined} style={{ padding: isCarousel ? undefined : '0 4px' }}>
        <strong
          className={isCarousel ? 'explore-card-title' : undefined}
          style={{
            display: isCarousel ? 'block' : '-webkit-box',
            WebkitLineClamp: isCarousel ? undefined : 2,
            WebkitBoxOrient: isCarousel ? undefined : 'vertical',
            overflow: 'hidden',
            fontSize: '15px',
            fontWeight: 800,
            color: 'var(--text)',
            lineHeight: '1.2',
            marginBottom: '4px',
            whiteSpace: isCarousel ? 'nowrap' : undefined,
            textOverflow: isCarousel ? 'ellipsis' : undefined,
          }}
        >
          {book.titulo}
        </strong>
        <div className="muted small" style={{ fontWeight: 600, fontSize: '13px', marginTop: isCarousel ? '4px' : undefined }}>
          {book.autor}
        </div>
      </div>
    </Link>
  )
}
