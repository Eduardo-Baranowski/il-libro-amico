import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import type { BookPublic } from '../../lib/types'

export function BookDetailsPage() {
  const { bookId } = useParams()
  const q = useQuery({
    queryKey: ['bookDetails', bookId],
    enabled: Boolean(bookId),
    queryFn: () => api<BookPublic & { descricao?: string | null; editora: string }>(`/reader/books/${bookId}`),
  })

  if (q.isLoading) return <div className="card">Carregando...</div>
  if (q.isError) return <div className="card error">Erro ao carregar livro.</div>
  if (!q.data) return <div className="card muted">Livro não encontrado.</div>

  const b = q.data
  return (
    <div className="card" style={{ maxWidth: 860 }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="request-thumb" style={{ width: 100, height: 140 }}>
          {b.imagem_url ? <img src={b.imagem_url} alt={b.titulo} /> : <span>Sem capa</span>}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ marginTop: 0, marginBottom: 6 }}>{b.titulo}</h1>
          <div className="muted">{b.autor}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="pill primary">R$ {b.preco}</span>
            <span className="pill">Estoque {b.estoque}</span>
            <Link className="pill" to={`/editora/${b.editor_id}`}>
              Editora: {b.editora}
            </Link>
          </div>
          {b.descricao ? <p style={{ marginTop: 12 }}>{b.descricao}</p> : null}
        </div>
      </div>
    </div>
  )
}
