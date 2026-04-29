import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'

import { api } from '../../lib/api'
import type { BookPublic, Order, SearchResponse, PaginatedResponse } from '../../lib/types'
import { useAuth } from '../../app/AuthProvider'
import { Pagination } from '../../app/components/Pagination'

export function StorePage() {
  const qc = useQueryClient()
  const { auth } = useAuth()
  const [term, setTerm] = useState('')
  const [scope, setScope] = useState<'all' | 'books' | 'users' | 'editors'>('all')
  const [page, setPage] = useState(1)
  
  const booksQ = useQuery({
    queryKey: ['storeBooks', page],
    queryFn: () => api<PaginatedResponse<BookPublic>>(`/reader/books?page=${page}&per_page=12`),
  })
  
  const searchQ = useQuery({
    queryKey: ['storeSearch', term],
    enabled: term.trim().length >= 2,
    queryFn: () => api<SearchResponse>(`/reader/search?q=${encodeURIComponent(term.trim())}&limit=8`),
  })
  
  const ordersQ = useQuery({
    queryKey: ['myOrders', 1], // Mostramos os primeiros pedidos aqui como resumo
    queryFn: () => api<PaginatedResponse<Order>>('/reader/orders?page=1&per_page=3'),
    enabled: auth.role === 'leitor',
  })

  const buyM = useMutation({
    mutationFn: (livroId: number) =>
      api<{ message: string; id: number }>('/reader/purchases', {
        method: 'POST',
        body: JSON.stringify({ livro_id: livroId, quantidade: 1 }),
      }),
    onSuccess: async () => {
      toast.success('Compra realizada com sucesso!')
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['storeBooks'] }),
        qc.invalidateQueries({ queryKey: ['myOrders'] }),
      ])
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao processar compra.')
  })

  const books = booksQ.data?.items ?? []
  const stats = useMemo(
    () => ({
      total: booksQ.data?.total ?? 0,
      disponiveis: books.filter((b) => b.estoque > 0).length, // Nota: Isso só conta a página atual. Em um app real, o backend traria os stats consolidados.
      baixo: books.filter((b) => b.status_estoque === 'baixo').length,
      esgotados: books.filter((b) => b.status_estoque === 'esgotado').length,
    }),
    [books, booksQ.data]
  )

  return (
    <div className="card-container">
      <div className="requests-header">
        <h1 style={{ margin: 0 }}>Todos os Livros</h1>
        <span className="muted requests-header-link">Catálogo Ativo</span>
      </div>

      <div className="store-metrics" style={{ marginBottom: 24 }}>
        <div className="store-metric-card is-primary">
          <div className="store-metric-label">Total de Títulos</div>
          <div className="store-metric-value">{stats.total}</div>
          <div className="store-metric-sub">Página {page} de {booksQ.data?.pages ?? 1}</div>
        </div>
        <div className="store-metric-card">
          <div className="store-metric-label">Status do Catálogo</div>
          <div className="store-metric-value">{stats.total > 0 ? 'Ativo' : 'Vazio'}</div>
          <div className="store-metric-sub">
            Explorando o conhecimento
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="store-search">
          <input
            className="input"
            placeholder="Pesquisar livros, usuários e editoras..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <div className="row" style={{ marginTop: 12 }}>
            <button className={`pill ${scope === 'all' ? 'primary' : ''}`} type="button" onClick={() => setScope('all')}>
              Tudo
            </button>
            <button className={`pill ${scope === 'books' ? 'primary' : ''}`} type="button" onClick={() => setScope('books')}>
              Livros
            </button>
            <button className={`pill ${scope === 'users' ? 'primary' : ''}`} type="button" onClick={() => setScope('users')}>
              Usuários
            </button>
            <button className={`pill ${scope === 'editors' ? 'primary' : ''}`} type="button" onClick={() => setScope('editors')}>
              Editoras
            </button>
          </div>
        </div>

        {term.trim().length >= 2 && (
          <div style={{ marginTop: 20 }} className="stack">
            {searchQ.isLoading ? <p className="muted">Buscando...</p> : null}
            {searchQ.isError ? <p className="error">Erro ao buscar.</p> : null}

            {searchQ.data && (scope === 'all' || scope === 'books') && (
              <div style={{ marginBottom: 12 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>Livros</strong>
                {searchQ.data.books.length > 0 ? (
                  <div className="stack">
                    {searchQ.data.books.map((b) => (
                      <Link key={`sb-${b.id}`} className="search-card" to={`/livro/${b.id}`}>
                        <div className="request-thumb sm">{b.imagem_url ? <img src={b.imagem_url} alt={b.titulo} /> : <span>Sem capa</span>}</div>
                        <div>
                          <strong>{b.titulo}</strong>
                          <div className="muted">{b.autor} - {b.editora}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : <p className="muted small">Nenhum livro encontrado.</p>}
              </div>
            )}

            {searchQ.data && (scope === 'all' || scope === 'users') && (
              <div style={{ marginBottom: 12 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>Usuários</strong>
                {searchQ.data.users.length > 0 ? (
                  <div className="stack">
                    {searchQ.data.users.map((u) => (
                      <Link key={`su-${u.id}`} className="search-card" to={`/perfil/${u.id}`}>
                        <div className="avatar-circle">
                          {u.imagem_url ? <img src={u.imagem_url} alt={u.nome} /> : <span>{u.nome.slice(0, 1).toUpperCase()}</span>}
                        </div>
                        <div>
                          <strong>{u.nome}</strong>
                          <div className="muted">Perfil: {u.papel}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : <p className="muted small">Nenhum usuário encontrado.</p>}
              </div>
            )}

            {searchQ.data && (scope === 'all' || scope === 'editors') && (
              <div style={{ marginBottom: 12 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>Editoras</strong>
                {searchQ.data.editors.length > 0 ? (
                  <div className="stack">
                    {searchQ.data.editors.map((e) => (
                      <Link key={`se-${e.id}`} className="search-card" to={`/editora/${e.id}`}>
                        <div className="avatar-circle">
                          {e.imagem_url ? <img src={e.imagem_url} alt={e.nome} /> : <span>{e.nome.slice(0, 1).toUpperCase()}</span>}
                        </div>
                        <div>
                          <strong>{e.nome}</strong>
                          <div className="muted">Ver perfil da editora</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : <p className="muted small">Nenhuma editora encontrada.</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {booksQ.isLoading ? <p className="muted" style={{ textAlign: 'center', padding: '40px' }}>Carregando catálogo...</p> : null}
      
      <div className="stack">
        {books.map((book) => (
          <article key={book.id} className="store-row">
            <div className="request-thumb">
              <Link to={`/livro/${book.id}`}>{book.imagem_url ? <img src={book.imagem_url} alt={book.titulo} /> : <span>Sem capa</span>}</Link>
            </div>

            <div className="request-main">
              <Link className="request-title" to={`/livro/${book.id}`}>
                {book.titulo}
              </Link>
              <div className="request-author">{book.autor}</div>
              <div className="request-meta">
                <span className={`request-status ${book.status_estoque === 'disponivel' ? 'respondida' : book.status_estoque === 'baixo' ? 'pendente' : 'out'}`}>
                  {book.status_estoque === 'disponivel' ? `EM ESTOQUE (${book.estoque})` : book.status_estoque === 'baixo' ? `ESTOQUE BAIXO (${book.estoque})` : 'ESGOTADO'}
                </span>
                <span style={{ fontWeight: 700 }}>R$ {book.preco}</span>
                <Link to={`/editora/${book.editor_id}`} className="muted" style={{ fontSize: '13px' }}>Editora: {book.editora}</Link>
              </div>
              {book.descricao && <div className="request-note" style={{ marginTop: '12px' }}>{book.descricao}</div>}
            </div>

            <div>
              {auth.role === 'leitor' ? (
                <button className="btn" type="button" disabled={buyM.isPending || book.estoque <= 0} onClick={() => buyM.mutate(book.id)}>
                  {book.estoque <= 0 ? 'Indisponível' : 'Comprar'}
                </button>
              ) : (
                <button className="btn secondary" type="button" disabled>Entrar para comprar</button>
              )}
            </div>
          </article>
        ))}
      </div>

      <Pagination 
        currentPage={page} 
        totalPages={booksQ.data?.pages ?? 1} 
        onPageChange={setPage} 
        isLoading={booksQ.isFetching}
      />

      {auth.role === 'leitor' && (
        <div style={{ marginTop: 60, borderTop: '1px solid var(--border)', paddingTop: '48px' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0 }}>Pedidos Recentes</h3>
            <Link to={`/perfil/${auth.id}`} className="link-hover" style={{ fontSize: '14px', fontWeight: 700 }}>Ver Histórico Completo →</Link>
          </div>
          
          {ordersQ.data?.items.length ? (
            <div className="stack" style={{ gap: '12px' }}>
              {ordersQ.data.items.map((p) => (
                <div key={p.id} className="row" style={{ 
                  padding: '16px', 
                  background: 'var(--surface-2)', 
                  borderRadius: '14px', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid var(--border)'
                }}>
                  <div className="row" style={{ gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--primary-soft)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px' }}>Pedido #{p.id}</strong>
                      <span className="muted small">{p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'} • {new Date(p.data).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary)' }}>R$ {p.total}</div>
                    <span className="pill success mini-pill" style={{ fontSize: '9px' }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhum pedido realizado ainda.</p>
          )}
        </div>
      )}
    </div>
  )
}
