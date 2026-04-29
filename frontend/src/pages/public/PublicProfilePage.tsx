import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

import { api } from '../../lib/api'
import type { DirectMessage, RelationStatus, VisitProfile } from '../../lib/types'
import { useAuth } from '../../app/AuthProvider'
import { getUserIdFromToken } from '../../lib/token'
import { ConfirmModal } from '../../app/components/ConfirmModal'

export function PublicProfilePage() {
  const qc = useQueryClient()
  const { auth } = useAuth()
  const { userId } = useParams()
  const [searchParams] = useSearchParams()
  const [showChat, setShowChat] = useState(searchParams.get('chat') === '1')
  const [draft, setDraft] = useState('')
  const [readingToDelete, setReadingToDelete] = useState<number | null>(null)

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
  const messagesQ = useQuery({
    queryKey: ['directMessages', userId],
    enabled: Boolean(userId) && Boolean(auth.token) && showChat,
    queryFn: () => api<DirectMessage[]>(`/reader/users/${userId}/messages?limit=120`),
    refetchInterval: showChat ? 2000 : false,
    refetchOnWindowFocus: true,
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
  const sendM = useMutation({
    mutationFn: () =>
      api<{ id: number; message: string }>(`/reader/users/${userId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ conteudo: draft }),
      }),
    onSuccess: async () => {
      setDraft('')
      await qc.invalidateQueries({ queryKey: ['directMessages', userId] })
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
                  <button className="btn" type="button" onClick={() => setShowChat((v) => !v)}>
                    {showChat ? 'Fechar chat' : 'Enviar Mensagem'}
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
                <span className="pill primary">Este é o seu perfil</span>
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
        
        {showChat ? (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Conversa com {u.nome}</h3>
            <div className="chat-thread">
              {messagesQ.data?.length ? (
                messagesQ.data.map((m) => (
                  <div key={m.id} className={`chat-bubble ${m.sender_id === meId ? 'outgoing' : 'incoming'}`}>
                    <div>{m.conteudo}</div>
                    <small className="chat-time">{m.data_envio ? new Date(m.data_envio).toLocaleTimeString() : ''}</small>
                  </div>
                ))
              ) : (
                <p className="muted" style={{ textAlign: 'center', padding: '20px' }}>Sem mensagens ainda. Comece uma conversa!</p>
              )}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <input
                className="input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escreva uma mensagem..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && draft.trim() && !sendM.isPending) {
                    e.preventDefault()
                    sendM.mutate()
                  }
                }}
              />
              <button className="btn" type="button" onClick={() => sendM.mutate()} disabled={sendM.isPending || !draft.trim() || isOwnProfile}>
                Enviar
              </button>
            </div>
          </div>
        ) : null}

        <div className="visit-grid">
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

            <div className="card" style={{ marginTop: 24, padding: '24px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px' }}>📖 Diário de Leitura</h3>
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
