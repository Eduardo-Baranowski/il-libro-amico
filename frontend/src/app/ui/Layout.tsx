import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../AuthProvider'
import { useCart } from '../CartProvider'
import { api } from '../../lib/api'
import type { NotificationsResponse } from '../../lib/types'

export function Layout() {
  const qc = useQueryClient()
  const { auth, logout } = useAuth()
  const { totalItems } = useCart()
  const location = useLocation()
  const [openNotifications, setOpenNotifications] = useState(false)
  const [openUserMenu, setOpenUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Reset menus on route or auth change
  useEffect(() => {
    setOpenUserMenu(false)
    setOpenNotifications(false)
  }, [location.pathname, auth.token])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setOpenUserMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setOpenNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
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
            <Link to="/" className="brand">
              <span style={{ fontSize: '24px' }}>📚</span>
              <span className="brand-text">Lumina Library</span>
            </Link>
            <div className="nav-links-desktop">
              <Link className="nav-link" to="/">
                Início
              </Link>
              <Link className="nav-link" to="/livros">
                Livros
              </Link>
            </div>
          </div>

          <div className="nav">
            {!auth.token ? (
              <>
                <Link className="nav-link" to="/entrar">
                  Entrar
                </Link>
                <Link className="btn" to="/cadastro">
                  Criar Conta
                </Link>
              </>
            ) : (
              <>
                <Link to="/carrinho" className="btn secondary" style={{ padding: '8px 12px', borderRadius: '12px', position: 'relative' }}>
                  🛒 {totalItems > 0 && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '99px', padding: '0 6px', fontSize: '11px', position: 'absolute', top: '-5px', right: '-5px', border: '2px solid #fff' }}>{totalItems}</span>}
                </Link>

                <div style={{ position: 'relative' }} ref={notifRef}>
                  <button
                    className="btn secondary"
                    style={{ padding: '8px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    type="button"
                    onClick={() => setOpenNotifications((v) => !v)}
                  >
                    🔔 {notifCount > 0 && <span style={{ background: 'var(--error)', color: '#fff', borderRadius: '99px', padding: '0 5px', fontSize: '10px' }}>{notifCount}</span>}
                    <span className="nav-text-mobile">Notificações</span>
                  </button>

                  {openNotifications ? (
                    <div className="notif-panel">
                      <div className="dropdown-header">
                        <strong>Notificações</strong>
                      </div>
                      <div className="stack" style={{ padding: '8px' }}>
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
                                <button className="btn" style={{ padding: '4px 8px', fontSize: '12px' }} type="button" onClick={() => acceptFriendM.mutate(fr.id)}>
                                  Aceitar
                                </button>
                                <button className="btn secondary" style={{ padding: '4px 8px', fontSize: '12px' }} type="button" onClick={() => rejectFriendM.mutate(fr.id)}>
                                  Recusar
                                </button>
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
                                <strong>{m.sender_nome}</strong> ({m.count})
                              </div>
                              <div className="muted" style={{ fontSize: '12px' }}>{m.latest_conteudo}</div>
                            </div>
                          </Link>
                        ))}

                        {!notificationsQ.data?.friend_requests.length && !notificationsQ.data?.unread_messages.length ? (
                          <p className="muted" style={{ textAlign: 'center', padding: '20px' }}>Sem novas notificações.</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="dropdown" ref={userMenuRef}>
                  <div className="user-badge" onClick={() => setOpenUserMenu((v) => !v)}>
                    <div className="user-avatar-sm">
                      {auth.imagem_url ? (
                        <img src={auth.imagem_url} alt={auth.nome || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span>{auth.nome?.slice(0, 1).toUpperCase() || auth.role?.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="nav-text-mobile user-info-box">
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>
                        {auth.nome || 'Usuário'}
                      </span>
                      <span style={{ fontSize: '10px', opacity: 0.6, textTransform: 'capitalize' }}>
                        {auth.role === 'admin' ? 'Administrador' : auth.role === 'leitor' ? 'Leitor' : 'Editor'}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', opacity: 0.5 }}>▼</span>
                  </div>

                  {openUserMenu && (
                    <div className="dropdown-menu" onMouseLeave={() => setOpenUserMenu(false)}>
                      <div className="nav-only-mobile">
                        <Link className="dropdown-item" to="/" onClick={() => setOpenUserMenu(false)}>
                          🏠 Início
                        </Link>
                        <Link className="dropdown-item" to="/livros" onClick={() => setOpenUserMenu(false)}>
                          📚 Livros Catálogo
                        </Link>
                        <div className="dropdown-divider" />
                      </div>

                      <div className="dropdown-header">
                        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Acesso: {auth.role === 'admin' ? 'Administrador' : auth.role === 'leitor' ? 'Leitor' : 'Editor'}
                        </div>
                      </div>

                      {auth.role === 'admin' && (
                        <>
                          <Link className="dropdown-item" to="/admin/usuarios" onClick={() => setOpenUserMenu(false)}>
                            👥 Usuários
                          </Link>
                          <Link className="dropdown-item" to="/admin/relatorios" onClick={() => setOpenUserMenu(false)}>
                            📊 Relatórios
                          </Link>
                          <div className="dropdown-divider" />
                        </>
                      )}

                      {auth.role === 'leitor' && (
                        <>
                          <Link className="dropdown-item" to="/leitor/solicitacoes" onClick={() => setOpenUserMenu(false)}>
                            📩 Minhas solicitações
                          </Link>
                          <Link className="dropdown-item" to="/leitor/leituras" onClick={() => setOpenUserMenu(false)}>
                            📖 Minhas leituras
                          </Link>
                          <Link className="dropdown-item" to="/leitor/nova-leitura" onClick={() => setOpenUserMenu(false)}>
                            ✍️ Registrar leitura
                          </Link>
                          <Link className="dropdown-item" to="/leitor/nova-solicitacao" onClick={() => setOpenUserMenu(false)}>
                            ➕ Nova solicitação
                          </Link>
                          <div className="dropdown-divider" />
                        </>
                      )}

                      {auth.role === 'editor' && (
                        <>
                          <Link className="dropdown-item" to="/editor/solicitacoes" onClick={() => setOpenUserMenu(false)}>
                            📩 Solicitações
                          </Link>
                          <Link className="dropdown-item" to="/editor/livros" onClick={() => setOpenUserMenu(false)}>
                            📚 Gerenciar Livros
                          </Link>
                          <div className="dropdown-divider" />
                        </>
                      )}

                      <Link className="dropdown-item" to="/mensagens" onClick={() => setOpenUserMenu(false)}>
                        💬 Mensagens
                      </Link>

                      <Link className="dropdown-item" to="/configuracoes" onClick={() => setOpenUserMenu(false)}>
                        ⚙️ Configurações
                      </Link>

                      <button className="dropdown-item danger" onClick={logout} type="button">
                        🚪 Sair da Conta
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
