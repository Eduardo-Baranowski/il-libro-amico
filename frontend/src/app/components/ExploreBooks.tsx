import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { StarRating } from './StarRating'

interface RecommendedBook {
  id: number
  titulo: string
  autor: string
  imagem_url: string
  average_rating: number
}

export function ExploreBooks() {
  const { data: books, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api<RecommendedBook[]>('/reader/recommendations'),
  })

  if (isLoading || !books || books.length === 0) return null

  return (
    <section className="explore-section" style={{ marginTop: '40px' }}>
      <div className="card" style={{ padding: '24px 0' }}>
        <div className="explore-header" style={{ padding: '0 24px', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>Explorar Novos Horizontes</h3>
          <Link to="/livros" className="link-hover" style={{ fontSize: '14px', fontWeight: 700 }}>Ver catálogo completo →</Link>
        </div>
        
        <div className="explore-horizontal-scroll" style={{ 
          display: 'flex', 
          overflowX: 'auto', 
          gap: '20px', 
          padding: '4px 24px 20px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          {books.map(book => (
            <Link key={book.id} to={`/livro/${book.id}`} className="explore-card hover-scale" style={{ 
              flex: '0 0 160px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              textDecoration: 'none'
            }}>
              <div className="explore-card-media" style={{ 
                width: '100%', 
                height: '220px', 
                borderRadius: '16px', 
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                background: 'var(--surface-2)'
              }}>
                <img src={book.imagem_url} alt={book.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="explore-card-info">
                <strong className="explore-card-title" style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>{book.titulo}</strong>
                <div className="muted small" style={{ marginBottom: '6px' }}>{book.autor}</div>
                <div className="explore-card-rating" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <StarRating rating={Math.round(book.average_rating)} size={10} />
                  <span className="rating-num" style={{ fontSize: '11px', fontWeight: 700, opacity: 0.7 }}>{book.average_rating}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
