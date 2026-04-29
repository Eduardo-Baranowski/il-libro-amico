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
    <section className="explore-section">
      <div className="card">
        <div className="explore-header">
          <h3>Explore Books</h3>
          <Link to="/livros" className="link-hover small">Ver todos</Link>
        </div>
        
        <div className="explore-grid">
          {books.map(book => (
            <Link key={book.id} to={`/livro/${book.id}`} className="explore-card hover-scale">
              <div className="explore-card-media">
                <img src={book.imagem_url} alt={book.titulo} />
              </div>
              <div className="explore-card-info">
                <strong className="explore-card-title">{book.titulo}</strong>
                <div className="muted small">{book.autor}</div>
                <div className="explore-card-rating">
                  <StarRating rating={Math.round(book.average_rating)} size={12} />
                  <span className="rating-num">{book.average_rating}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
