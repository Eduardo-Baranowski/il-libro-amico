import { Link, useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

import { api } from '../../lib/api'
import type { RelationStatus, VisitProfile, Order } from '../../lib/types'
import { useAuth } from '../../app/AuthProvider'
import { getUserIdFromToken } from '../../lib/token'
import { ConfirmModal } from '../../app/components/ConfirmModal'

export function PublicProfilePage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { userId } = useParams()
  const [readingToDelete, setReadingToDelete] = useState<number | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({})

  const meId = getUserIdFromToken()
  const viewedId = userId ? Number(userId) : null
  const isOwnProfile = meId != null && viewedId != null && meId === viewedId
  
  const visitQ = useQuery({
    queryKey: ['publicVisit', userId],
    enabled: Boolean(userId),
    queryFn: () => api<VisitProfile>(`/reader/users/${userId}/visit`),
  })
  
  const relationQ = useQuery({
    queryKey: ['relationStatus', userId],
    enabled: Boolean(userId) && Boolean(auth.token),
    queryFn: () => api<RelationStatus>(`/reader/users/${userId}/relation`),
  })

  const ordersQ = useQuery({
    queryKey: ['myOrders'],
    enabled: isOwnProfile,
    queryFn: () => api<Order[]>('/reader/orders'),
  })

  const followM = useMutation({
    mutationFn: (following: boolean) =>
      api<{ message: string }>(`/reader/users/${userId}/follow`, {
        method: following ? 'DELETE' : 'POST',
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['relationStatus', userId] }),
        qc.invalidateQueries({ queryKey: ['publicVisit', userId] }),
      ])
    },
  })
  
  const connectM = useMutation({
    mutationFn: (isFriend: boolean) =>
      api<{ message: string }>(`/reader/users/${userId}/connect`, {
        method: isFriend ? 'DELETE' : 'POST',
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['relationStatus', userId] }),
        qc.invalidateQueries({ queryKey: ['publicVisit', userId] }),
      ])
    },
  })

  const deleteReadingM = useMutation({
    mutationFn: (id: number) => api(`/reader/readings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Leitura removida com sucesso!')
      setReadingToDelete(null)
      qc.invalidateQueries({ queryKey: ['publicVisit', userId] })
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao remover')
  })

  const toggleOrder = (orderId: number) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }

  if (visitQ.isLoading) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}>Carregando perfil...</div>
  if (visitQ.isError) return <div className="container error" style={{ padding: '40px', textAlign: 'center' }}>Erro ao carregar perfil.</div>
  if (!visitQ.data) return <div className="container muted" style={{ padding: '40px', textAlign: 'center' }}>Perfil não encontrado.</div>

  const profile = visitQ.data
  const u = profile.user
  const relation = relationQ.data

  const connectLabel = relation?.is_friend
    ? 'Conectado'
    : relation?.incoming_pending
      ? 'Aceitar Conexão'
      : relation?.outgoing_pending
        ? 'Pendente'
        : 'Conectar'

  return (
    <div className="visit-layout">
      <aside className="visit-sidebar">
        <h3>Portal da Biblioteca</h3>
        <p>Gestão de Conhecimento</p>
        <nav>
          <Link to="/">Painel</Link>
          <Link to="/livros">Catálogo</Link>
          <Link to="/">Centro de Pesquisa</Link>
          <Link to="/leitor/leituras">Contribuições</Link>
          <Link to={`/perfil/${meId}`}>Meu Perfil</Link>
          <Link to="/configuracoes">Configurações</Link>
        </nav>
      </aside>

      <section className="visit-main">
        <div className="visit-hero">
          <div className="visit-banner" />
          <div className="visit-header">
            <div className="avatar-circle visit-avatar">
              {u.imagem_url ? <img src={u.imagem_url} alt={u.nome} /> : <span>{u.nome.slice(0, 1).toUpperCase()}</span>}
            </div>
            <div style={{ flex: 1, paddingBottom: '8px' }}>
              <h1 style={{ 
                margin: 0, 
                fontSize: '2.4rem', 
                fontWeight: 900, 
                color: 'var(--primary)', 
                letterSpacing: '-1.5px',
                lineHeight: 1
              }}>
                {u.nome}
              </h1>
              <p style={{ 
                margin: '8px 0 0', 
                fontSize: '1.1rem', 
                color: 'var(--muted)',
                fontWeight: 500
              }}>
                {profile.user.headline || 'Membro da comunidade'}
              </p>
            </div>
            <div className="row" style={{ paddingBottom: '12px' }}>
              {auth.token && !isOwnProfile ? (
                <>
                  <button className="btn" type="button" onClick={() => navigate(`/mensagens/${userId}`)}>
                    Enviar Mensagem
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => connectM.mutate(Boolean(relation?.is_friend))}
                    disabled={connectM.isPending || relation?.outgoing_pending === true}
                  >
                    {connectLabel}
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => followM.mutate(Boolean(relation?.following))}
                    disabled={followM.isPending}
                  >
                    {relation?.following ? 'Deixar de seguir' : 'Seguir'}
                  </button>
                </>
              ) : auth.token && isOwnProfile ? (
                <span className="pill primary" style={{ fontWeight: 800 }}>✓ Este é o seu perfil</span>
              ) : (
                <Link className="btn" to="/entrar">
                  Entrar para interagir
                </Link>
              )}
            </div>
          </div>
          <div className="visit-bio">
            <h4>Biografia Acadêmica</h4>
            <p>{profile.user.bio || 'Nenhuma biografia informada.'}</p>
          </div>
        </div>

        <div className="visit-grid">
          <div className="stack" style={{ gap: '32px' }}>
            {/* Contribuições em Destaque */}
            <div>
              <div className="visit-section-title">
                <h3>Contribuições em Destaque</h3>
              </div>
              <div className="visit-cards">
                {profile.featured.length ? profile.featured.map((item) => (
                  <Link key={item.id} className="search-card" to={`/livro/${item.id}`}>
                    <div className="request-thumb sm">{item.imagem_url ? <img src={item.imagem_url} alt={item.titulo} /> : <span>Sem capa</span>}</div>
                    <div>
                      <strong>{item.titulo}</strong>
                      <div className="muted">{item.autor}</div>
                    </div>
                  </Link>
                )) : <p className="muted">Nenhuma contribuição em destaque.</p>}
              </div>
            </div>

            {/* Histórico de Pedidos (Privado & Expansível) */}
            {isOwnProfile && (
              <div>
                <div className="visit-section-title">
                  <h3>🛍️ Meu Histórico de Pedidos</h3>
                </div>
                <div className="stack" style={{ gap: '12px' }}>
                  {ordersQ.isLoading && <p className="muted">Carregando pedidos...</p>}
                  {ordersQ.data?.length ? (
                    ordersQ.data.map(order => {
                      const isExpanded = expandedOrders[order.id]
                      return (
                        <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                          {/* Cabeçalho do Pedido */}
                          <div 
                            onClick={() => toggleOrder(order.id)}
                            style={{ 
                              padding: '16px 24px', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              background: isExpanded ? 'var(--surface-2)' : 'transparent',
                              transition: 'background 0.2s ease'
                            }}
                          >
                            <div className="row" style={{ gap: '20px', alignItems: 'center' }}>
                              <div style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '10px', 
                                background: 'var(--primary-soft)', 
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px'
                              }}>
                                📦
                              </div>
                              <div>
                                <strong style={{ display: 'block', fontSize: '15px' }}>Pedido #{order.id}</strong>
                                <span className="muted small">{new Date(order.data).toLocaleDateString()} • {order.itens.length} {order.itens.length === 1 ? 'item' : 'itens'}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>R$ {order.total}</div>
                                <span className="pill success mini-pill" style={{ fontSize: '9px', textTransform: 'uppercase' }}>{order.status}</span>
                              </div>
                              <span style={{ 
                                fontSize: '12px', 
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease',
                                opacity: 0.5
                              }}>▼</span>
                            </div>
                          </div>

                          {/* Lista de Itens (Expandida) */}
                          {isExpanded && (
                            <div style={{ 
                              padding: '12px 24px 24px', 
                              background: 'var(--surface-2)',
                              borderTop: '1px solid var(--border)',
                              animation: 'slideDown 0.3s ease-out'
                            }}>
                              <div className="stack" style={{ gap: '12px' }}>
                                {order.itens.map((item, idx) => (
                                  <div key={idx} className="row" style={{ 
                                    padding: '12px', 
                                    background: 'var(--surface)', 
                                    borderRadius: '12px',
                                    alignItems: 'center',
                                    gap: '16px',
                                    border: '1px solid var(--border)'
                                  }}>
                                    <div style={{ width: '40px', height: '56px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                                      {item.imagem_url ? <img src={item.imagem_url} alt={item.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)' }}>📖</div>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{item.titulo}</div>
                                      <div className="muted small">{item.quantidade}x R$ {item.preco_unitario}</div>
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                                      R$ {(Number(item.preco_unitario) * item.quantidade).toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    !ordersQ.isLoading && <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                      <p className="muted">Você ainda não realizou nenhum pedido.</p>
                      <Link to="/livros" className="btn secondary" style={{ marginTop: '12px', display: 'inline-flex' }}>Explorar Catálogo</Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Diário de Leitura */}
            <div>
              <div className="visit-section-title">
                <h3>📖 Diário de Leitura</h3>
              </div>
              <div className="stack" style={{ gap: '16px' }}>
                {profile.reading_log.length ? (
                  profile.reading_log.map((r) => (
                    <div key={r.id} className="card" style={{ borderRadius: '16px', padding: '16px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                      <div className="row" style={{ alignItems: 'flex-start', gap: '20px' }}>
                        <div className="book-cover-sm" style={{ width: '80px', height: '110px', flexShrink: 0 }}>
                           {r.imagem_url ? (
                             <img src={r.imagem_url} alt={r.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                           ) : (
                             <div style={{ width: '100%', height: '100%', background: 'var(--surface-2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📖</div>
                           )}
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ fontSize: '1.1rem', display: 'block' }}>{r.titulo}</strong>
                              <div className="muted">{r.autor}</div>
                            </div>
                            <span className={`pill ${r.status === 'lido' ? 'success' : r.status === 'lendo' ? 'primary' : ''}`} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                              {r.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div style={{ marginTop: '12px' }}>
                             {r.nota ? (
                               <div className="row" style={{ gap: '4px', color: '#f59e0b' }}>
                                 {Array.from({ length: 5 }).map((_, i) => (
                                   <span key={i} style={{ fontSize: '16px' }}>{i < r.nota! ? '★' : '☆'}</span>
                                 ))}
                               </div>
                             ) : (
                               <span className="muted" style={{ fontSize: '12px' }}>Ainda não avaliado</span>
                             )}
                          </div>

                          {isOwnProfile && (
                            <div className="row" style={{ marginTop: '16px', gap: '12px' }}>
                              <Link 
                                to={`/leitor/leituras/editar/${r.livro_id}`} 
                                className="btn secondary" 
                                style={{ fontSize: '12px', height: '32px', minHeight: 'unset', padding: '0 12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              >
                                📝 Editar
                              </Link>
                              <button 
                                className="btn secondary" 
                                style={{ fontSize: '12px', height: '32px', minHeight: 'unset', padding: '0 12px', flex: 1, color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                onClick={() => setReadingToDelete(r.id)}
                              >
                                🗑️ Remover
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ textAlign: 'center', padding: '40px' }}>Sem leituras registradas ainda.</p>
                )}
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="card">
              <h4 style={{ marginTop: 0 }}>Estatísticas do Acervo</h4>
              <div className="visit-stats">
                <div>
                  <strong>{profile.stats.publications}</strong>
                  <span>Publicações</span>
                </div>
                <div>
                  <strong>{profile.stats.citations}</strong>
                  <span>Citações</span>
                </div>
                <div>
                  <strong>{profile.stats.tenure}</strong>
                  <span>Anos na Rede</span>
                </div>
                <div>
                  <strong>{profile.stats.contributions}</strong>
                  <span>Ações</span>
                </div>
                <div>
                  <strong>{profile.stats.followers}</strong>
                  <span>Seguidores</span>
                </div>
                <div>
                  <strong>{profile.stats.following}</strong>
                  <span>Seguindo</span>
                </div>
                <div>
                  <strong>{profile.stats.friends}</strong>
                  <span>Conexões</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h4 style={{ marginTop: 0 }}>Especializações</h4>
              <div className="row" style={{ gap: '8px' }}>
                {profile.specializations.length ? profile.specializations.map((s) => (
                  <span key={s} className="pill" style={{ fontSize: '11px', padding: '4px 12px', minHeight: 'unset' }}>
                    {s}
                  </span>
                )) : <span className="muted" style={{ fontSize: '12px' }}>Nenhuma especialização</span>}
              </div>
            </div>

            <div className="card">
              <h4 style={{ marginTop: 0 }}>Afiliações</h4>
              <div className="stack">
                {profile.affiliations.length ? profile.affiliations.map((a) => (
                  <div key={a.nome} style={{ fontSize: '14px' }}>
                    <strong>{a.nome}</strong>
                    <div className="muted" style={{ fontSize: '12px' }}>{a.cargo}</div>
                  </div>
                )) : <p className="muted" style={{ fontSize: '12px' }}>Nenhuma afiliação listada.</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ConfirmModal 
        isOpen={readingToDelete !== null}
        title="Remover Leitura"
        message="Deseja remover este registro do seu diário de leitura? Esta ação não pode ser desfeita."
        confirmLabel="Sim, Remover"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={() => readingToDelete && deleteReadingM.mutate(readingToDelete)}
        onCancel={() => setReadingToDelete(null)}
      />
    </div>
  )
}
