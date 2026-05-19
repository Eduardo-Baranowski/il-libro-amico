import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { api } from '../../lib/api'
import { getUserIdFromToken } from '../../lib/token'
import { useAuth } from '../../app/AuthProvider'
import { StarRating } from '../../app/components/StarRating'
import type { BookPublic, PaginatedResponse, Order, RelationStatus } from '../../lib/types'

interface ProfileData {
  user: {
    id: number
    nome: string
    papel: string
    imagem_url: string | null
    headline: string | null
    bio: string | null
  }
  stats: {
    publications: number
    citations: number
    tenure: string
    followers: number
    following: number
  }
  featured: Array<{
    id: number
    titulo: string
    imagem_url: string | null
    autor: string
    tipo: string
  }>
}

interface Reading {
  id: number
  livro: BookPublic
  status: 'quero_ler' | 'lendo' | 'lido'
  nota: number | null
  comentario: string | null
  criado_em: string
}

export function PublicProfilePage() {
  const { userId } = useParams()
  const { auth } = useAuth()
  const meId = getUserIdFromToken()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isOwnProfile = String(meId) === String(userId)
  const canInteract = Boolean(auth.token && userId && !isOwnProfile)
  
  const [orderPage, setOrderPage] = useState(1)
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({})
  const loadMoreReadingsRef = useRef<HTMLDivElement>(null)

  const profileQ = useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => api<ProfileData>(`/reader/users/${userId}/visit`),
  })

  // Infinite Scroll for Readings
  const {
    data: readingsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isReadingsLoading
  } = useInfiniteQuery({
    queryKey: ['publicReadings-infinite', userId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api<PaginatedResponse<Reading>>(`/reader/readings?user_id=${userId}&page=${pageParam}&per_page=6`),
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
  })

  const ordersQ = useQuery({
    queryKey: ['publicOrders', userId, orderPage],
    enabled: isOwnProfile,
    queryFn: () => api<PaginatedResponse<Order>>(`/reader/orders?page=${orderPage}&per_page=5`),
  })

  const deleteReadingM = useMutation({
    mutationFn: (id: number) => api(`/reader/readings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Registro removido')
      qc.invalidateQueries({ queryKey: ['publicReadings-infinite', userId] })
      qc.invalidateQueries({ queryKey: ['publicProfile', userId] })
    }
  })

  const relationQ = useQuery({
    queryKey: ['relation', userId],
    enabled: canInteract,
    queryFn: () => api<RelationStatus>(`/reader/users/${userId}/relation`),
  })

  const followM = useMutation({
    mutationFn: (follow: boolean) =>
      api(`/reader/users/${userId}/follow`, { method: follow ? 'POST' : 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['relation', userId] })
      await qc.invalidateQueries({ queryKey: ['publicProfile', userId] })
      toast.success('Atualizado!')
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao seguir'),
  })

  const connectM = useMutation({
    mutationFn: (connect: boolean) =>
      api(`/reader/users/${userId}/connect`, { method: connect ? 'POST' : 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['relation', userId] })
      toast.success('Atualizado!')
    },
    onError: (err: Error) => toast.error(err.message || 'Erro na conexão'),
  })

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.5, rootMargin: '100px' }
    )
    if (loadMoreReadingsRef.current) obs.observe(loadMoreReadingsRef.current)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const toggleOrder = (id: number) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (profileQ.isLoading) return <div className="container muted">Carregando perfil...</div>
  if (!profileQ.data) return <div className="container error">Usuário não encontrado.</div>

  const p = profileQ.data
  const allReadings = readingsData?.pages.flatMap(pg => pg.items) ?? []

  return (
    <div className="card-container" style={{ paddingTop: '32px' }}>
      <div className="settings-grid" style={{ gridTemplateColumns: '280px 1fr' }}>
        {/* Sidebar fixa com infos básicas */}
        <aside className="stack" style={{ gap: '20px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div className="avatar-circle" style={{ width: '120px', height: '120px', margin: '0 auto 20px', border: '4px solid var(--primary-soft)', fontSize: '2.5rem', background: 'var(--primary-soft)', color: 'var(--primary)', fontWeight: 800 }}>
              {p.user.imagem_url ? <img src={p.user.imagem_url} alt={p.user.nome} /> : <span>{p.user.nome.slice(0, 1).toUpperCase()}</span>}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>{p.user.nome}</h2>
            <p className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>{p.user.papel}</p>
            
            {isOwnProfile ? (
               <Link to="/configuracoes" className="btn secondary small" style={{ marginTop: '20px', width: '100%', borderRadius: '12px' }}>Editar Perfil</Link>
            ) : auth.token ? (
              <div className="stack" style={{ marginTop: '20px', gap: '10px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ width: '100%', borderRadius: '12px', fontWeight: 800 }}
                  onClick={() => navigate(`/mensagens/${userId}`)}
                >
                  💬 Enviar mensagem
                </button>
                {relationQ.data ? (
                  <>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ width: '100%', borderRadius: '12px', fontWeight: 700 }}
                      disabled={followM.isPending}
                      onClick={() => followM.mutate(!relationQ.data.following)}
                    >
                      {relationQ.data.following ? '✓ Seguindo' : '+ Seguir'}
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ width: '100%', borderRadius: '12px', fontWeight: 700 }}
                      disabled={connectM.isPending || relationQ.data.outgoing_pending || relationQ.data.incoming_pending}
                      onClick={() => connectM.mutate(!relationQ.data.is_friend)}
                    >
                      {relationQ.data.is_friend
                        ? '✓ Conectados'
                        : relationQ.data.outgoing_pending
                          ? 'Convite enviado'
                          : relationQ.data.incoming_pending
                            ? 'Convite recebido'
                            : '+ Conectar'}
                    </button>
                  </>
                ) : relationQ.isLoading ? (
                  <p className="muted small" style={{ margin: 0 }}>Carregando…</p>
                ) : null}
              </div>
            ) : (
              <Link to="/entrar" className="btn secondary small" style={{ marginTop: '20px', width: '100%', borderRadius: '12px' }}>
                Entrar para interagir
              </Link>
            )}
          </div>

          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>Biografia</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{p.user.bio || 'Sem biografia disponível.'}</p>
          </div>
        </aside>

        {/* Conteúdo Principal */}
        <main className="stack" style={{ gap: '32px' }}>
          {/* Stats Grid */}
          <div className="card" style={{ padding: '24px', borderRadius: '24px' }}>
             <div className="row" style={{ justifyContent: 'space-between', gap: '24px' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>{p.stats.citations}</div>
                  <div className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Citações</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)', opacity: 0.5 }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>{p.stats.tenure}</div>
                  <div className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Na Rede</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)', opacity: 0.5 }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>{p.stats.followers}</div>
                  <div className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Seguidores</div>
                </div>
             </div>
          </div>

          {/* Histórico de Pedidos (Somente Dono) */}
          {isOwnProfile && (
            <section>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 800 }}>📦 Meu Histórico de Pedidos</h3>
              <div className="stack" style={{ gap: '12px' }}>
                {ordersQ.data?.items.map(order => (
                  <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '20px' }}>
                    <div 
                      onClick={() => toggleOrder(order.id)}
                      style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: expandedOrders[order.id] ? 'var(--surface-2)' : 'transparent', transition: 'background 0.2s' }}
                    >
                      <div className="row" style={{ alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
                        <div>
                          <div style={{ fontWeight: 800 }}>Pedido #{order.id}</div>
                          <div className="muted small">{new Date(order.data).toLocaleDateString()} • {order.itens.length} {order.itens.length === 1 ? 'Item' : 'Itens'}</div>
                        </div>
                      </div>
                      <div className="row" style={{ alignItems: 'center', gap: '20px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, color: 'var(--primary)' }}>R$ {order.total}</div>
                          <span className="pill success mini-pill" style={{ fontSize: '9px', marginTop: '4px' }}>{order.status}</span>
                        </div>
                        <span style={{ transform: expandedOrders[order.id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', opacity: 0.5 }}>▼</span>
                      </div>
                    </div>
                    
                    {expandedOrders[order.id] && (
                      <div style={{ padding: '24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', animation: 'slideDown 0.3s ease' }}>
                        <div className="stack" style={{ gap: '16px' }}>
                          {order.itens.map((item, idx) => (
                            <div key={idx} className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                              <div className="row" style={{ gap: '16px', alignItems: 'center' }}>
                                <img src={item.imagem_url ?? undefined} alt="" style={{ width: '45px', height: '64px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.titulo}</div>
                                  <div className="muted small">Qtd: {item.quantidade} • Unitário: R$ {item.preco_unitario}</div>
                                </div>
                              </div>
                              <div style={{ fontWeight: 800, color: 'var(--primary)' }}>R$ {(Number(item.preco_unitario) * item.quantidade).toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {ordersQ.data && ordersQ.data.pages > 1 && (
                  <div className="row" style={{ justifyContent: 'center', marginTop: '12px', gap: '16px' }}>
                    <button className="btn secondary small" style={{ borderRadius: '10px' }} disabled={orderPage === 1} onClick={() => setOrderPage(p => p - 1)}>Anterior</button>
                    <span className="muted small" style={{ alignSelf: 'center', fontWeight: 700 }}>{orderPage} / {ordersQ.data.pages}</span>
                    <button className="btn secondary small" style={{ borderRadius: '10px' }} disabled={orderPage === ordersQ.data.pages} onClick={() => setOrderPage(p => p + 1)}>Próximo</button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Diário de Leitura (Infinite Scroll) */}
          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 800 }}>📖 Diário de Leitura</h3>
            <div className="stack" style={{ gap: '16px' }}>
              {allReadings.map((r, idx) => (
                <div key={`${r.id}-${idx}`} className="card" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '90px 1fr', 
                  gap: '24px', 
                  padding: '24px',
                  borderRadius: '24px',
                  animation: 'slideDown 0.4s ease forwards',
                  animationDelay: `${(idx % 6) * 0.05}s`,
                  opacity: 0
                }}>
                  <Link to={`/livro/${r.livro.id}`} className="hover-scale">
                    {r.livro.imagem_url ? (
                      <img src={r.livro.imagem_url} alt={r.livro.titulo} style={{ width: '100%', borderRadius: '12px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }} />
                    ) : (
                      <div className="feed-book-placeholder" style={{ width: '100%', height: '120px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📖</div>
                    )}
                  </Link>
                  <div className="stack" style={{ gap: '12px' }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Link to={`/livro/${r.livro.id}`}><h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>{r.livro.titulo}</h4></Link>
                        <div className="muted" style={{ fontWeight: 600, fontSize: '14px' }}>{r.livro.autor}</div>
                      </div>
                      <span className={`pill ${r.status === 'lido' ? 'success' : 'primary'} mini-pill`} style={{ fontSize: '10px', fontWeight: 800 }}>
                        {r.status === 'quero_ler' ? 'Quero ler' : r.status === 'lendo' ? 'Lendo' : 'Lido'}
                      </span>
                    </div>

                    {r.nota && <StarRating rating={r.nota} size={14} />}
                    {r.comentario && (
                      <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '16px', fontSize: '14px', fontStyle: 'italic', color: 'var(--text)', opacity: 0.9 }}>
                        "{r.comentario}"
                      </div>
                    )}

                    {isOwnProfile && (
                      <div className="row" style={{ gap: '12px', marginTop: '12px' }}>
                        <button className="btn secondary small" style={{ flex: 1, height: '36px', borderRadius: '10px', fontWeight: 700 }} onClick={() => navigate(`/leitor/leituras/editar/${r.livro.id}`)}>Editar</button>
                        <button className="btn error small" style={{ flex: 1, height: '36px', borderRadius: '10px', background: 'transparent', color: 'var(--error)', border: '1px solid var(--error)' }} onClick={() => deleteReadingM.mutate(r.id)}>Remover</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div ref={loadMoreReadingsRef} style={{ padding: '48px 0', textAlign: 'center' }}>
                {isFetchingNextPage ? (
                  <div className="stack" style={{ gap: '12px' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <p className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Expandindo horizontes…</p>
                  </div>
                ) : hasNextPage ? (
                  <button 
                    className="btn secondary small" 
                    onClick={() => fetchNextPage()}
                    style={{ borderRadius: '12px', padding: '8px 24px' }}
                  >
                    Carregar mais registros
                  </button>
                ) : allReadings.length > 0 ? (
                  <p className="muted small" style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.4 }}>✨ Você explorou todo o diário</p>
                ) : null}
              </div>

              {allReadings.length === 0 && !isReadingsLoading && (
                <div className="card" style={{ padding: '48px', textAlign: 'center', background: 'var(--surface-2)', border: '2px dashed var(--border)' }}>
                   <p className="muted" style={{ fontWeight: 600 }}>Nenhum registro de leitura encontrado.</p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
