import { Outlet, Link } from 'react-router-dom'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../AuthProvider'
import { api } from '../../lib/api'
import type { NotificationsResponse } from '../../lib/types'

export function Layout() {
  const qc = useQueryClient()
  const { auth, logout } = useAuth()
  const [openNotifications, setOpenNotifications] = useState(false)
  const notificationsQ = useQuery({
    queryKey: ['notifications'],
    enabled: Boolean(auth.token),
    queryFn: () => api<NotificationsResponse>('/reader/notifications'),
    refetchInterval: auth.token ? 4000 : false,
  })
  const acceptFriendM = useMutation({
    mutationFn: (id: number) => api<{ message: string }>(`/reader/friendships/${id}/accept`, { method: 'POST' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  const rejectFriendM = useMutation({
    mutationFn: (id: number) => api<{ message: string }>(`/reader/friendships/${id}/reject`, { method: 'POST' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  const notifCount = (notificationsQ.data?.counts.friend_requests ?? 0) + (notificationsQ.data?.counts.unread_messages_total ?? 0)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="nav">
            <span className="brand">Lumina Library</span>
            <Link className="pill" to="/">
              Feed
            </Link>
            <Link className="pill" to="/livros">
              Livros
            </Link>
            {!auth.token ? (
              <>
                <Link className="pill" to="/entrar">
                  Entrar
                </Link>
                <Link className="pill" to="/cadastro">
                  Cadastro (leitor)
                </Link>
              </>
            ) : null}
            {auth.role === 'admin' ? (
              <>
                <Link className="pill" to="/admin/usuarios">
                  Usuários
                </Link>
                <Link className="pill" to="/admin/relatorios">
                  Relatórios
                </Link>
              </>
            ) : null}
            {auth.role === 'leitor' ? (
              <>
                <Link className="pill" to="/leitor/solicitacoes">
                  Minhas solicitações
                </Link>
                <Link className="pill" to="/leitor/leituras">
                  Minhas leituras
                </Link>
                <Link className="pill" to="/leitor/nova-leitura">
                  Registrar leitura
                </Link>
                <Link className="pill" to="/leitor/nova-solicitacao">
                  Nova solicitação
                </Link>
              </>
            ) : null}
            {auth.role === 'editor' ? (
              <>
                <Link className="pill" to="/editor/solicitacoes">
                  Solicitações
                </Link>
                <Link className="pill" to="/editor/livros">
                  Livros
                </Link>
              </>
            ) : null}
          </div>

          <div className="nav">
            {auth.role ? <span className="pill primary">Perfil: {auth.role}</span> : null}
            {auth.token ? (
              <div style={{ position: 'relative' }}>
                <button className="btn secondary" type="button" onClick={() => setOpenNotifications((v) => !v)}>
                  Notificações{notifCount > 0 ? ` (${notifCount})` : ''}
                </button>
                {openNotifications ? (
                  <div className="notif-panel">
                    <strong>Notificações</strong>
                    <div className="stack" style={{ marginTop: 8 }}>
                      {notificationsQ.data?.friend_requests.map((fr) => (
                        <div key={`fr-${fr.id}`} className="search-card">
                          <div className="avatar-circle">
                            {fr.requester_imagem_url ? (
                              <img src={fr.requester_imagem_url} alt={fr.requester_nome} />
                            ) : (
                              <span>{fr.requester_nome.slice(0, 1).toUpperCase()}</span>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div>
                              <strong>{fr.requester_nome}</strong> enviou conexão
                            </div>
                            <div className="row" style={{ marginTop: 6 }}>
                              <button className="btn" type="button" onClick={() => acceptFriendM.mutate(fr.id)}>
                                Aceitar
                              </button>
                              <button className="btn secondary" type="button" onClick={() => rejectFriendM.mutate(fr.id)}>
                                Recusar
                              </button>
                              <Link className="pill" to={`/perfil/${fr.requester_id}`} onClick={() => setOpenNotifications(false)}>
                                Ver perfil
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}

                      {notificationsQ.data?.unread_messages.map((m) => (
                        <Link
                          key={`msg-${m.sender_id}`}
                          className="search-card"
                          to={`/perfil/${m.sender_id}?chat=1`}
                          onClick={() => setOpenNotifications(false)}
                        >
                          <div className="avatar-circle">
                            {m.sender_imagem_url ? <img src={m.sender_imagem_url} alt={m.sender_nome} /> : <span>{m.sender_nome.slice(0, 1).toUpperCase()}</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div>
                              <strong>{m.sender_nome}</strong> ({m.count} novas)
                            </div>
                            <div className="muted">{m.latest_conteudo}</div>
                          </div>
                        </Link>
                      ))}

                      {!notificationsQ.data?.friend_requests.length && !notificationsQ.data?.unread_messages.length ? (
                        <p className="muted">Sem notificações.</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {auth.token ? (
              <button className="btn secondary" onClick={logout} type="button">
                Sair
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
