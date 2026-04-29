import { Link, useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

import { api } from '../../lib/api'
import { useAuth } from '../../app/AuthProvider'
import { useCart } from '../../app/CartProvider'
import { StarRating } from '../../app/components/StarRating'
import type { BookPublic } from '../../lib/types'

export function BookDetailsPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { auth } = useAuth()
  const { addItem } = useCart()
  const [qtd, setQtd] = useState(1)
  
  const [readingStatus, setReadingStatus] = useState<'quero_ler' | 'lendo' | 'lido' | null>(null)
  const [readingNota, setReadingNota] = useState<number>(0)
  const [comentario, setComentario] = useState('')

  const q = useQuery({
    queryKey: ['bookDetails', bookId],
    enabled: Boolean(bookId),
    queryFn: () => api<BookPublic & { 
      descricao?: string | null; 
      editora: string; 
      editora_imagem_url?: string | null;
      my_reading?: { status: 'quero_ler' | 'lendo' | 'lido'; nota: number | null; comentario: string | null } | null
    }>(`/reader/books/${bookId}`),
  })

  // Sincronizar estado com dados do banco ao carregar
  useEffect(() => {
    if (q.data?.my_reading) {
      setReadingStatus(q.data.my_reading.status)
      setReadingNota(q.data.my_reading.nota || 0)
      setComentario(q.data.my_reading.comentario || '')
    }
  }, [q.data])

  const saveReadingM = useMutation({
    mutationFn: () => api('/reader/readings', {
      method: 'POST',
      body: JSON.stringify({
        livro_id: Number(bookId),
        status: readingStatus,
        nota: readingNota || null,
        comentario: comentario || null
      })
    }),
    onSuccess: () => {
      toast.success('Sua experiência foi registrada! 📖')
      qc.invalidateQueries({ queryKey: ['feed'] })
      qc.invalidateQueries({ queryKey: ['myReadings'] })
      qc.invalidateQueries({ queryKey: ['bookDetails', bookId] })
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao registrar leitura')
  })

  if (q.isLoading) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}>Carregando detalhes...</div>
  if (q.isError) return <div className="container error" style={{ padding: '40px', textAlign: 'center' }}>Erro ao carregar livro.</div>
  if (!q.data) return <div className="container muted" style={{ padding: '40px', textAlign: 'center' }}>Livro não encontrado.</div>

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
    <div className="card-container" style={{ paddingTop: '40px' }}>
      <div className="settings-card" style={{ padding: '48px', margin: '0 auto' }}>
        <div className="settings-grid" style={{ gridTemplateColumns: 'minmax(300px, 340px) 1fr', gap: '56px' }}>
          
          {/* Coluna da Esquerda (Capa + Ações de Leitura) */}
          <div className="stack" style={{ gap: '32px' }}>
            <div className="book-cover-large" style={{ position: 'relative' }}>
              {b.imagem_url ? (
                <img src={b.imagem_url} alt={b.titulo} style={{ width: '100%', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
              ) : (
                <div className="avatar-circle" style={{ width: '100%', height: '450px', borderRadius: '16px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📖</div>
              )}
            </div>

            {isLeitor && (
              <div className="card" style={{ padding: '24px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}>Sua Experiência</h3>
                
                <div className="stack" style={{ gap: '10px' }}>
                  <button 
                    className={`btn ${readingStatus === 'quero_ler' ? '' : 'secondary'}`} 
                    style={{ width: '100%', minHeight: '44px', fontSize: '12px', fontWeight: 700, borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    onClick={() => setReadingStatus('quero_ler')}
                  >
                    {readingStatus === 'quero_ler' ? '✓ Quero ler' : 'Quero ler'}
                  </button>
                  <button 
                    className={`btn ${readingStatus === 'lendo' ? '' : 'secondary'}`} 
                    style={{ width: '100%', minHeight: '44px', fontSize: '12px', fontWeight: 700, borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    onClick={() => setReadingStatus('lendo')}
                  >
                    {readingStatus === 'lendo' ? '✓ Lendo agora' : 'Lendo agora'}
                  </button>
                  <button 
                    className={`btn ${readingStatus === 'lido' ? '' : 'secondary'}`} 
                    style={{ width: '100%', minHeight: '44px', fontSize: '12px', fontWeight: 700, borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    onClick={() => setReadingStatus('lido')}
                  >
                    {readingStatus === 'lido' ? '✓ Já li' : 'Já li'}
                  </button>
                </div>

                {readingStatus && (
                  <div className="stack" style={{ marginTop: '24px', gap: '16px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div className="muted small" style={{ marginBottom: '10px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6 }}>Sua Avaliação</div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <StarRating rating={readingNota} onChange={setReadingNota} editable size={32} />
                      </div>
                    </div>
                    
                    <div>
                      <textarea 
                        className="input" 
                        rows={3} 
                        placeholder="O que você está achando? (Opcional)" 
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        style={{ fontSize: '13px', padding: '12px', borderRadius: '12px', background: 'var(--surface)' }}
                      />
                    </div>

                    <button 
                      className="btn primary" 
                      style={{ width: '100%', borderRadius: '12px', height: '48px', fontWeight: 800 }}
                      onClick={() => saveReadingM.mutate()}
                      disabled={saveReadingM.isPending}
                    >
                      {saveReadingM.isPending ? 'Salvando...' : 'Salvar Experiência'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Coluna da Direita (Infos + Compra) */}
          <div className="stack" style={{ gap: '32px' }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span className="pill primary" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: 'none', fontWeight: 800 }}>R$ {b.preco}</span>
                {b.estoque > 0 && <span className="pill success" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', border: 'none', fontWeight: 800 }}>{b.estoque} em estoque</span>}
              </div>
              <h1 style={{ margin: '0 0 12px', fontSize: '3.2rem', fontWeight: 900, lineHeight: 1.1, color: 'var(--text)' }}>{b.titulo}</h1>
              <p className="muted" style={{ fontSize: '1.4rem', fontWeight: 500 }}>por <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{b.autor}</span></p>
            </div>

            <div className="row" style={{ gap: '16px', alignItems: 'center' }}>
              <Link to={`/editora/${b.editor_id}`} className="pill" style={{ textDecoration: 'none', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '50px' }}>
                <div className="avatar-circle" style={{ width: '28px', height: '28px', border: 'none', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {b.editora_imagem_url ? <img src={b.editora_imagem_url} alt={b.editora} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : <span>🏢</span>}
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.editora}</span>
              </Link>
            </div>

            <div style={{ padding: '32px', background: 'var(--surface-2)', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary)' }} />
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem', fontWeight: 800 }}>Descrição</h3>
              <p style={{ lineHeight: 1.8, fontSize: '1.05rem', opacity: 0.85, margin: 0 }}>{b.descricao || 'Este livro ainda não possui uma descrição detalhada. Em breve traremos mais informações sobre esta obra fascinante.'}</p>
            </div>

            {isLeitor && b.estoque > 0 && (
              <div className="card" style={{ padding: '32px', background: 'var(--surface)', border: '2px solid var(--primary-soft)', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div className="stack" style={{ gap: '6px', width: '100px' }}>
                    <label className="label" style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', fontWeight: 900, opacity: 0.6 }}>Qtd</label>
                    <input 
                      type="number" 
                      className="input" 
                      value={qtd} 
                      onChange={e => setQtd(Math.max(1, Number(e.target.value)))}
                      style={{ height: '56px', textAlign: 'center', fontSize: '1.25rem', fontWeight: 800, borderRadius: '14px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, alignSelf: 'flex-end' }}>
                    <button 
                      className="btn secondary" 
                      style={{ height: '56px', fontSize: '1rem', fontWeight: 800, borderRadius: '14px', border: '2px solid var(--border)' }}
                      onClick={() => handleAddToCart(false)}
                    >
                      🛒 No Carrinho
                    </button>
                    <button 
                      className="btn" 
                      style={{ height: '56px', fontSize: '1.1rem', fontWeight: 900, borderRadius: '14px', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.3)' }}
                      onClick={() => handleAddToCart(true)}
                    >
                      Comprar Agora
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {isLeitor && b.estoque <= 0 && (
              <div className="card" style={{ padding: '24px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed #ef4444', borderRadius: '16px' }}>
                <p style={{ color: '#ef4444', fontWeight: 700, margin: 0 }}>Ops! Este livro está esgotado no momento. Volte em breve!</p>
              </div>
            )}

            {!isLeitor && auth.token && (
              <div className="muted" style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '12px', fontSize: '14px', borderLeft: '4px solid var(--border)' }}>
                Apenas usuários com perfil de <strong>Leitor</strong> podem realizar compras e gerenciar experiências literárias.
              </div>
            )}
            
            {!auth.token && (
              <Link to="/entrar" className="btn" style={{ textAlign: 'center', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', fontWeight: 800, fontSize: '1.1rem' }}>Faça login para interagir</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
