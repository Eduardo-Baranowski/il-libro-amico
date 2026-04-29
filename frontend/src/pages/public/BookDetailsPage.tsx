import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

import { api } from '../../lib/api'
import { useAuth } from '../../app/AuthProvider'
import { useCart } from '../../app/CartProvider'
import type { BookPublic } from '../../lib/types'

export function BookDetailsPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { addItem } = useCart()
  const [qtd, setQtd] = useState(1)

  const q = useQuery({
    queryKey: ['bookDetails', bookId],
    enabled: Boolean(bookId),
    queryFn: () => api<BookPublic & { descricao?: string | null; editora: string; editora_imagem_url?: string | null }>(`/reader/books/${bookId}`),
  })

  if (q.isLoading) return <div className="container">Carregando detalhes...</div>
  if (q.isError) return <div className="container error">Erro ao carregar livro.</div>
  if (!q.data) return <div className="container muted">Livro não encontrado.</div>

  const b = q.data
  const isLeitor = auth.role === 'leitor'

  const handleAddToCart = (checkout: boolean = false) => {
    addItem({
      id: b.id,
      titulo: b.titulo,
      preco: Number(b.preco),
      imagem_url: b.imagem_url || null,
      quantidade: qtd
    })
    if (checkout) {
      navigate('/checkout')
    } else {
      toast.success('Livro adicionado ao carrinho! 🛒')
    }
  }

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <div className="settings-card" style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="settings-grid" style={{ gridTemplateColumns: '300px 1fr', gap: '40px' }}>
          <div className="book-cover-large">
            {b.imagem_url ? (
              <img src={b.imagem_url} alt={b.titulo} style={{ width: '100%', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} />
            ) : (
              <div className="avatar-circle" style={{ width: '100%', height: '400px', borderRadius: '12px' }}>Sem Capa</div>
            )}
          </div>
          
          <div className="stack">
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ margin: '0 0 8px', fontSize: '2.5rem', fontWeight: 900 }}>{b.titulo}</h1>
              <p className="muted" style={{ fontSize: '1.2rem' }}>por <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{b.autor}</span></p>
            </div>

            <div className="row" style={{ gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
              <span className="pill primary">R$ {b.preco}</span>
              <span className={`pill ${b.estoque > 0 ? 'success' : 'error'}`}>
                {b.estoque > 0 ? `${b.estoque} em estoque` : 'Esgotado'}
              </span>
              <Link to={`/editora/${b.editor_id}`} className="pill" style={{ textDecoration: 'none', paddingLeft: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="avatar-circle" style={{ width: '24px', height: '24px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {b.editora_imagem_url ? <img src={b.editora_imagem_url} alt={b.editora} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : <span>🏢</span>}
                </div>
                {b.editora}
              </Link>
            </div>

            <div style={{ padding: '24px', background: 'var(--surface-2)', borderRadius: '16px', marginBottom: '24px' }}>
              <h3 style={{ marginTop: 0 }}>Descrição</h3>
              <p style={{ lineHeight: 1.6, opacity: 0.8 }}>{b.descricao || 'Este livro ainda não possui uma descrição detalhada.'}</p>
            </div>

            {isLeitor && b.estoque > 0 && (
              <div className="search-card" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div className="stack" style={{ gap: '4px', width: '90px' }}>
                    <label className="label" style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, opacity: 0.5 }}>Quantidade</label>
                    <input 
                      type="number" 
                      className="input" 
                      value={qtd} 
                      onChange={e => setQtd(Math.max(1, Number(e.target.value)))}
                      style={{ height: '48px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, padding: 0 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1, alignSelf: 'flex-end' }}>
                    <button 
                      className="btn secondary" 
                      style={{ height: '48px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '12px' }}
                      onClick={() => handleAddToCart(false)}
                    >
                      <span style={{ fontSize: '1.2rem' }}>🛒</span> No Carrinho
                    </button>
                    <button 
                      className="btn" 
                      style={{ height: '48px', whiteSpace: 'nowrap', fontSize: '1rem', borderRadius: '12px' }}
                      onClick={() => handleAddToCart(true)}
                    >
                      Comprar Agora
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {!isLeitor && auth.token && (
              <p className="muted" style={{ fontSize: '14px' }}>Apenas usuários com perfil de Leitor podem realizar compras.</p>
            )}
            
            {!auth.token && (
              <Link to="/entrar" className="btn" style={{ textAlign: 'center' }}>Faça login para comprar</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
