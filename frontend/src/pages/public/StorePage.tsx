import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'

import { api } from '../../lib/api'
import type { BookPublic, Purchase, SearchResponse } from '../../lib/types'
import { useAuth } from '../../app/AuthProvider'

export function StorePage() {
  const qc = useQueryClient()
  const { auth } = useAuth()
  const [term, setTerm] = useState('')
  const [scope, setScope] = useState<'all' | 'books' | 'users' | 'editors'>('all')
  
  const booksQ = useQuery({
    queryKey: ['storeBooks'],
    queryFn: () => api<BookPublic[]>('/reader/books'),
  })
  
  const searchQ = useQuery({
    queryKey: ['storeSearch', term],
    enabled: term.trim().length >= 2,
    queryFn: () => api<SearchResponse>(`/reader/search?q=${encodeURIComponent(term.trim())}&limit=8`),
  })
  
  const purchasesQ = useQuery({
    queryKey: ['myPurchases'],
    queryFn: () => api<Purchase[]>('/reader/purchases'),
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
        qc.invalidateQueries({ queryKey: ['myPurchases'] }),
      ])
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao processar compra.')
  })

  const books = booksQ.data ?? []
  const stats = useMemo(
    () => ({
      total: books.length,
      disponiveis: books.filter((b) => b.estoque > 0).length,
      baixo: books.filter((b) => b.status_estoque === 'baixo').length,
      esgotados: books.filter((b) => b.status_estoque === 'esgotado').length,
    }),
    [books],
  )

  return (
    <div className="card store-shell">
      <div className="requests-header">
        <h1 style={{ margin: 0 }}>Todos os Livros</h1>
        <span className="muted requests-header-link">Catálogo Ativo</span>
      </div>

      <div className="store-metrics">
        <div className="store-metric-card is-primary">
          <div className="store-metric-label">Total de Títulos</div>
          <div className="store-metric-value">{stats.total}</div>
          <div className="store-metric-sub">{stats.disponiveis} em estoque</div>
        </div>
        <div className="store-metric-card">
          <div className="store-metric-label">Status do Catálogo</div>
          <div className="store-metric-value">{stats.esgotados === 0 ? '100%' : '92%'}</div>
          <div className="store-metric-sub">
            {stats.baixo} estoque baixo / {stats.esgotados} esgotados
          </div>
        </div>
      </div>

      <div className="store-search">
        <input
          className="input"
          placeholder="Pesquisar livros, usuários e editoras..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <div className="row" style={{ marginTop: 8 }}>
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

      {booksQ.isLoading ? <p style={{ marginTop: 16 }}>Carregando catálogo...</p> : null}
      {booksQ.isError ? (
        <p className="error" style={{ marginTop: 16 }}>
          {(booksQ.error as any)?.message ?? 'Erro ao carregar catálogo'}
        </p>
      ) : null}

      {term.trim().length >= 2 ? (
        <div style={{ marginTop: 12 }} className="stack">
          {searchQ.isLoading ? <p className="muted">Buscando...</p> : null}
          {searchQ.isError ? <p className="error">Erro ao buscar.</p> : null}

          {searchQ.data && (scope === 'all' || scope === 'books') ? (
            <div className="card" style={{ padding: 12 }}>
              <strong>Livros</strong>
              {searchQ.data.books.length ? (
                <div className="stack" style={{ marginTop: 8 }}>
                  {searchQ.data.books.map((b) => (
                    <Link key={`sb-${b.id}`} className="search-card" to={`/livro/${b.id}`}>
                      <div className="request-thumb sm">{b.imagem_url ? <img src={b.imagem_url} alt={b.titulo} /> : <span>Sem capa</span>}</div>
                      <div>
                        <strong>{b.titulo}</strong>
                        <div className="muted">
                          {b.autor} - {b.editora}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted">Nenhum livro encontrado.</p>
              )}
            </div>
          ) : null}

          {searchQ.data && (scope === 'all' || scope === 'users') ? (
            <div className="card" style={{ padding: 12 }}>
              <strong>Usuários</strong>
              {searchQ.data.users.length ? (
                <div className="stack" style={{ marginTop: 8 }}>
                  {searchQ.data.users.map((u) => (
                    <Link key={`su-${u.id}`} className="search-card" to={`/perfil/${u.id}`}>
                      <div className="avatar-circle">
                        {u.imagem_url ? <img src={u.imagem_url} alt={u.nome} /> : <span>{u.nome.slice(0, 1).toUpperCase()}</span>}
                      </div>
                      <div>
                        <strong>{u.nome}</strong>
                        <div className="muted">perfil: {u.papel}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted">Nenhum usuário encontrado.</p>
              )}
            </div>
          ) : null}

          {searchQ.data && (scope === 'all' || scope === 'editors') ? (
            <div className="card" style={{ padding: 12 }}>
              <strong>Editoras</strong>
              {searchQ.data.editors.length ? (
                <div className="stack" style={{ marginTop: 8 }}>
                  {searchQ.data.editors.map((e) => (
                    <Link key={`se-${e.id}`} className="search-card" to={`/editora/${e.id}`}>
                      <div className="avatar-circle">
                        {e.imagem_url ? <img src={e.imagem_url} alt={e.nome} /> : <span>{e.nome.slice(0, 1).toUpperCase()}</span>}
                      </div>
                      <div>
                        <strong>{e.nome}</strong>
                        <div className="muted">ver perfil da editora</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted">Nenhuma editora encontrada.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="stack" style={{ marginTop: 12 }}>
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
                <span
                  className={`request-status ${
                    book.status_estoque === 'disponivel' ? 'respondida' : book.status_estoque === 'baixo' ? 'pendente' : 'out'
                  }`}
                >
                  {book.status_estoque === 'disponivel'
                    ? `EM ESTOQUE (${book.estoque})`
                    : book.status_estoque === 'baixo'
                      ? `ESTOQUE BAIXO (${book.estoque})`
                      : 'ESGOTADO'}
                </span>
                <span style={{ fontWeight: 700 }}>R$ {book.preco}</span>
                <Link to={`/editora/${book.editor_id}`} className="muted" style={{ fontSize: '13px' }}>Editora: {book.editora}</Link>
              </div>
              {book.descricao ? <div className="request-note" style={{ marginTop: '12px' }}>{book.descricao}</div> : null}
            </div>

            <div>
              {auth.role === 'leitor' ? (
                <button className="btn" type="button" disabled={buyM.isPending || book.estoque <= 0} onClick={() => buyM.mutate(book.id)}>
                  {book.estoque <= 0 ? 'Indisponível' : 'Comprar'}
                </button>
              ) : (
                <button className="btn secondary" type="button" disabled>
                  Entrar para comprar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {auth.role === 'leitor' ? (
        <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <h3 style={{ marginBottom: 12 }}>Minhas compras recentes</h3>
          {purchasesQ.data?.length ? (
            <div className="stack">
              {purchasesQ.data.slice(0, 3).map((p) => (
                <div key={p.id} className="muted" style={{ fontSize: 14, background: 'var(--surface-2)', padding: '8px 12px', borderRadius: '8px' }}>
                  Pedido #{p.id} — {p.livro.titulo} — {p.quantidade} un — <strong>R$ {p.total}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhuma compra realizada ainda.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
