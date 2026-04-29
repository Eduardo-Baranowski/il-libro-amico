import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { api } from '../../lib/api'
import type { DirectMessage, RelationStatus, VisitProfile } from '../../lib/types'
import { useAuth } from '../../app/AuthProvider'
import { getUserIdFromToken } from '../../lib/token'

export function PublicProfilePage() {
  const qc = useQueryClient()
  const { auth } = useAuth()
  const { userId } = useParams()
  const [searchParams] = useSearchParams()
  const [showChat, setShowChat] = useState(searchParams.get('chat') === '1')
  const [draft, setDraft] = useState('')
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

  if (visitQ.isLoading) return <div className="card">Carregando...</div>
  if (visitQ.isError) return <div className="card error">Erro ao carregar perfil.</div>
  if (!visitQ.data) return <div className="card muted">Perfil não encontrado.</div>

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
            <div style={{ flex: 1 }}>
              <h1>{u.nome}</h1>
              <p>{profile.user.headline}</p>
            </div>
            <div className="row">
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

            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>Diário de Leitura</h3>
              <div className="stack">
                {profile.reading_log.length ? (
                  profile.reading_log.map((r) => (
                    <div key={r.id} className="search-card">
                      <div className="avatar-circle">📖</div>
                      <div>
                        <strong>{r.titulo}</strong>
                        <div className="muted">
                          {r.autor} — <span style={{ textTransform: 'capitalize' }}>{r.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">Sem leituras recentes.</p>
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
    </div>
  )
}
