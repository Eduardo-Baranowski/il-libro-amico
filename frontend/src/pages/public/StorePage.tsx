import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'

import { api } from '../../lib/api'
import { getUserIdFromToken } from '../../lib/token'
import { useAuth } from '../../app/AuthProvider'
import { useCart } from '../../app/CartProvider'
import type { Book, PaginatedResponse } from '../../lib/types'
import { Pagination } from '../../app/components/Pagination'
import { QueryStatus } from '../../app/components/ui/QueryStatus'

const GENRES = [
  'Todos',
  'Romance',
  'Mistério',
  'Ficção Científica',
  'Fantasia',
  'Terror',
  'História',
  'Biografia',
  'Autoajuda',
  'Técnico',
  'Infantil'
]

export function StorePage() {
  const { auth } = useAuth()
  const userId = getUserIdFromToken()
  const { addItem } = useCart()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<'all' | 'books' | 'users' | 'editors'>('all')
  const [genre, setGenre] = useState('Todos')

  const isSearchMode = search.length > 1

  const booksQ = useQuery({
    queryKey: ['storeBooks', page, genre],
    queryFn: () => api<PaginatedResponse<Book>>(`/reader/books?page=${page}&per_page=10${genre !== 'Todos' ? `&genero=${genre}` : ''}`),
    enabled: !isSearchMode,
  })

  const searchQ = useQuery({
    queryKey: ['globalSearch', search, genre],
    queryFn: () => api<{ books: Book[]; users: any[]; editors: any[] }>(`/reader/search?q=${search}${genre !== 'Todos' ? `&genero=${genre}` : ''}`),
    enabled: isSearchMode,
  })

  const listLoading = isSearchMode ? searchQ.isLoading : booksQ.isLoading
  const listError = isSearchMode ? searchQ.isError : booksQ.isError
  const listErrorObj = isSearchMode ? searchQ.error : booksQ.error
  const refetchList = () => (isSearchMode ? searchQ.refetch() : booksQ.refetch())

  const handleAddToCart = (book: Book) => {
    addItem({
      id: book.id,
      titulo: book.titulo,
      preco: parseFloat(String(book.preco).replace(',', '.')),
      imagem_url: book.imagem_url ?? null,
      quantidade: 1
    })
    toast.success(`${book.titulo} adicionado ao carrinho!`)
  }

  const books = useMemo(() => {
    if (search.length > 1) return searchQ.data?.books ?? []
    return booksQ.data?.items ?? []
  }, [search, searchQ.data, booksQ.data])

  const ordersQ = useQuery({
    queryKey: ['recentOrders'],
    queryFn: () => api<PaginatedResponse<any>>('/reader/orders?page=1&per_page=3'),
    enabled: !!userId && auth.role === 'leitor'
  })

  return (
    <div className="card-container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-2px', color: 'var(--primary)' }}>Catálogo Lumina</h1>
          <p className="muted" style={{ margin: '8px 0 0', fontWeight: 600 }}>Explore milhares de obras das melhores editoras.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '32px', borderRadius: '28px', background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: '32px' }}>
        <div className="stack" style={{ gap: '24px' }}>
          <div className="row" style={{ gap: '16px' }}>
             <div style={{ flex: 1, position: 'relative' }}>
                <label htmlFor="store-search" className="sr-only">
                  Pesquisar títulos, autores ou editoras
                </label>
                <input
                  id="store-search"
                  className="input"
                  placeholder="Pesquisar títulos, autores ou editoras..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  style={{ height: '56px', borderRadius: '16px', paddingLeft: '48px', fontSize: '1.05rem', fontWeight: 600 }}
                />
                <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} aria-hidden="true">🔍</span>
             </div>
             
             <label htmlFor="store-genre" className="sr-only">Filtrar por gênero</label>
             <select
               id="store-genre"
               className="input" 
               value={genre} 
               onChange={(e) => { setGenre(e.target.value); setPage(1); }}
               style={{ width: '200px', height: '56px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}
             >
               {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
             </select>
          </div>

          <div className="row" style={{ gap: '8px' }}>
            {(['all', 'books', 'users', 'editors'] as const).map((s) => (
              <button
                key={s}
                className={`pill ${scope === s ? 'primary' : 'secondary'}`}
                style={{ height: '36px', padding: '0 20px', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                onClick={() => setScope(s)}
              >
                {s === 'all' ? 'Tudo' : s === 'books' ? 'Livros' : s === 'users' ? 'Usuários' : 'Editoras'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <QueryStatus
        isLoading={listLoading}
        isError={listError}
        error={listErrorObj as Error}
        isEmpty={!listLoading && !listError && books.length === 0}
        onRetry={() => refetchList()}
        loadingLabel="Carregando catálogo"
        emptyTitle="Nenhum livro encontrado"
        emptyDescription="Ajuste os filtros ou tente outra busca."
      >
        <div className="stack" style={{ gap: '20px' }}>
        {books.map((book) => (
          <article key={book.id} className="store-row card responsive-book-row" style={{ padding: '24px', borderRadius: '24px' }}>
            <div className="request-thumb" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
              <Link to={`/livro/${book.id}`} style={{ width: '100%', height: '100%', display: 'block' }}>
                {book.imagem_url ? (
                  <img src={book.imagem_url} alt={book.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="feed-book-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }} aria-hidden="true">📖</div>
                )}
              </Link>
            </div>

            <div className="request-main">
              <div className="row" style={{ gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                <Link className="request-title" to={`/livro/${book.id}`} style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary)', textDecoration: 'none' }}>
                  {book.titulo}
                </Link>
                {book.genero && <span className="pill secondary mini-pill" style={{ fontSize: '10px', textTransform: 'uppercase' }}>{book.genero}</span>}
              </div>
              <div className="muted" style={{ fontSize: '16px', fontWeight: 600 }}>{book.autor}</div>
              
              <div className="request-meta" style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span className={`pill ${book.status_estoque === 'disponivel' ? 'success' : book.status_estoque === 'baixo' ? 'warning' : 'error'} mini-pill`} style={{ fontSize: '10px', fontWeight: 900 }}>
                  {book.status_estoque === 'disponivel' ? `EM ESTOQUE (${book.estoque})` : book.status_estoque === 'baixo' ? `ÚLTIMAS UNIDADES (${book.estoque})` : 'ESGOTADO'}
                </span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>R$ {book.preco}</span>
                <Link to={`/editora/${book.editor_id}`} className="muted small link-hover" style={{ fontWeight: 700 }}>Editora: {book.editora}</Link>
              </div>
              
              {book.descricao && (
                <p className="muted" style={{ marginTop: '16px', fontSize: '14px', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {book.descricao}
                </p>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              {auth.role === 'leitor' ? (
                <button 
                  className="btn" 
                  type="button" 
                  disabled={book.estoque <= 0} 
                  onClick={() => handleAddToCart(book)}
                  style={{ width: '100%', height: '56px', fontSize: '1.1rem', fontWeight: 900, borderRadius: '16px' }}
                  aria-label={book.estoque <= 0 ? `${book.titulo} esgotado` : `Comprar ${book.titulo}`}
                >
                  {book.estoque <= 0 ? 'Esgotado' : 'Comprar'}
                </button>
              ) : (
                <button className="btn secondary" type="button" disabled style={{ width: '100%', height: '56px', borderRadius: '16px', fontWeight: 800, fontSize: '0.9rem' }}>Entrar para comprar</button>
              )}
            </div>
          </article>
        ))}
        </div>
      </QueryStatus>

      {search.length <= 1 && (
        <Pagination 
          currentPage={page} 
          totalPages={booksQ.data?.pages ?? 1} 
          onPageChange={setPage} 
          isLoading={booksQ.isFetching}
        />
      )}

      {auth.role === 'leitor' && ordersQ.data?.items.length ? (
        <div style={{ marginTop: 60, borderTop: '1px solid var(--border)', paddingTop: '48px' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>Pedidos Recentes</h3>
            <Link to={`/perfil/${userId}`} className="link-hover" style={{ fontSize: '14px', fontWeight: 700 }}>Ver Histórico Completo →</Link>
          </div>
          
          <div className="stack" style={{ gap: '12px' }}>
            {ordersQ.data.items.map((p: any) => (
              <div key={p.id} className="row card" style={{ 
                padding: '20px 24px', 
                borderRadius: '20px', 
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid var(--border)'
              }}>
                <div className="row" style={{ gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', background: 'var(--primary-soft)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '16px', fontWeight: 800 }}>Pedido #{p.id}</strong>
                    <span className="muted small" style={{ fontWeight: 600 }}>{p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'} • {new Date(p.data).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.1rem' }}>R$ {p.total}</div>
                  <span className="pill success mini-pill" style={{ fontSize: '9px', fontWeight: 800 }}>{p.status.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
