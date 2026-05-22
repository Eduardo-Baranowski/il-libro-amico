import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { api } from '../../lib/api'
import { getUserIdFromToken } from '../../lib/token'
import { useDocumentVisible } from '../../hooks/useDocumentVisible'
import { useChatMessages } from '../../hooks/useChatMessages'
import type { PaginatedResponse } from '../../lib/types'

interface Conversation {
  user_id: number
  user_nome: string
  user_imagem_url: string | null
  last_message: string
  last_message_time: string | null
  unread_count: number
}

export function ChatPage() {
  const meId = getUserIdFromToken()
  const navigate = useNavigate()
  const location = useLocation()
  const { userId: activeUserId } = useParams()
  const qc = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadMoreConvRef = useRef<HTMLDivElement>(null)
  const [msgInput, setMsgInput] = useState('')

  const tabVisible = useDocumentVisible()
  const onChatRoute = location.pathname.startsWith('/mensagens')
  const pollEnabled = tabVisible && onChatRoute

  const {
    data: convData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isConvLoading,
  } = useInfiniteQuery({
    queryKey: ['conversations-infinite'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<PaginatedResponse<Conversation>>(`/reader/conversations?page=${pageParam}&per_page=15`),
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
    refetchInterval: pollEnabled ? 15_000 : false,
  })

  const { messages, isLoading: isMessagesLoading, refresh } = useChatMessages(activeUserId, pollEnabled && Boolean(activeUserId))

  const sendMsgM = useMutation({
    mutationFn: (conteudo: string) =>
      api<{ message: string; id: number }>(`/reader/users/${activeUserId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ conteudo }),
      }),
    onSuccess: () => {
      setMsgInput('')
      void refresh()
      void qc.invalidateQueries({ queryKey: ['conversations-infinite'] })
    },
  })

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.5 },
    )
    if (loadMoreConvRef.current) obs.observe(loadMoreConvRef.current)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!msgInput.trim()) return
    sendMsgM.mutate(msgInput)
  }

  const allConversations = convData?.pages.flatMap((p) => p.items) ?? []
  const activeUser = allConversations.find((c) => String(c.user_id) === String(activeUserId))

  return (
    <div className={`chat-shell ${activeUserId ? 'has-active-chat' : ''}`}>
      <aside className="chat-sidebar card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <div className="chat-sidebar-header" style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px' }}>Mensagens</h2>
        </div>
        <div className="chat-sidebar-list" style={{ padding: '12px' }}>
          {allConversations.map((conv) => (
            <div
              key={conv.user_id}
              className={`chat-contact-item ${activeUserId === String(conv.user_id) ? 'active' : ''}`}
              onClick={() => navigate(`/mensagens/${conv.user_id}`)}
              style={{ borderRadius: '16px', marginBottom: '4px', transition: 'all 0.2s ease' }}
            >
              <div
                className="avatar-circle chat-avatar"
                style={{ border: 'none', background: 'var(--primary-soft)', color: 'var(--primary)', fontWeight: 800 }}
              >
                {conv.user_imagem_url ? (
                  <img src={conv.user_imagem_url} alt={conv.user_nome} />
                ) : (
                  <span>{conv.user_nome.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="chat-contact-info">
                <div className="chat-contact-top">
                  <span className="chat-contact-name" style={{ fontWeight: 800 }}>
                    {conv.user_nome}
                  </span>
                  {conv.unread_count > 0 && (
                    <span className="pill success mini-pill" style={{ height: '20px', minHeight: '20px', padding: '0 8px', fontSize: '10px' }}>
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="chat-contact-msg muted" style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {conv.last_message}
                </div>
              </div>
            </div>
          ))}

          <div ref={loadMoreConvRef} style={{ padding: '20px', textAlign: 'center' }}>
            {isFetchingNextPage && <div className="spinner" style={{ margin: '0 auto' }}></div>}
            {!hasNextPage && allConversations.length > 0 && (
              <p className="muted small" style={{ fontSize: '11px', fontWeight: 600 }}>
                Fim da lista
              </p>
            )}
          </div>

          {allConversations.length === 0 && !isConvLoading && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p className="muted" style={{ fontSize: '14px' }}>
                Nenhuma conversa iniciada.
              </p>
            </div>
          )}
        </div>
      </aside>

      <main className="chat-main card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        {activeUserId ? (
          <>
            <div
              className="chat-header"
              style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}
            >
              <button className="btn secondary chat-back-btn" style={{ border: 'none', background: 'transparent' }} onClick={() => navigate('/mensagens')}>
                ⬅️
              </button>
              <div
                className="avatar-circle chat-header-avatar"
                style={{ width: '40px', height: '40px', border: 'none', background: 'var(--primary-soft)', color: 'var(--primary)', fontWeight: 800 }}
              >
                {activeUser?.user_imagem_url ? (
                  <img src={activeUser.user_imagem_url} alt={activeUser.user_nome} />
                ) : (
                  <span>{activeUser?.user_nome.slice(0, 1).toUpperCase() || '💬'}</span>
                )}
              </div>
              <div className="chat-header-info">
                <strong style={{ fontSize: '1.1rem' }}>{activeUser?.user_nome || 'Conversa'}</strong>
                <Link to={`/perfil/${activeUserId}`} className="link-hover muted" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Ver perfil
                </Link>
              </div>
            </div>

            <div ref={scrollRef} className="chat-messages" style={{ padding: '24px', background: 'var(--background)' }}>
              {isMessagesLoading && messages.length === 0 ? (
                <p className="muted" style={{ textAlign: 'center' }}>
                  Carregando mensagens…
                </p>
              ) : null}
              {messages.map((m) => {
                const isMe = String(m.sender_id) === String(meId)
                return (
                  <div
                    key={m.id}
                    className={`chat-bubble ${isMe ? 'outgoing' : 'incoming'}`}
                    style={{
                      maxWidth: '80%',
                      borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      padding: '12px 16px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div className="chat-bubble-content" style={{ fontSize: '14.5px', lineHeight: '1.5' }}>
                      {m.conteudo}
                    </div>
                    <div className="chat-bubble-time" style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right', fontWeight: 700 }}>
                      {new Date(m.data_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleSend} className="chat-input-area" style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', gap: '12px' }}>
              <input
                className="input"
                placeholder="Escreva uma mensagem..."
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                style={{ borderRadius: '14px', height: '48px', padding: '0 20px' }}
              />
              <button className="btn" type="submit" disabled={!msgInput.trim() || sendMsgM.isPending} style={{ borderRadius: '14px', height: '48px', padding: '0 24px', fontWeight: 800 }}>
                {sendMsgM.isPending ? '...' : 'Enviar'}
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty-state" style={{ background: 'var(--background)' }}>
            <div className="chat-empty-icon" style={{ fontSize: '4rem', marginBottom: '16px' }}>
              💬
            </div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px' }}>Suas Mensagens</h3>
            <p className="muted" style={{ maxWidth: '300px', margin: '0 auto', fontSize: '14px' }}>
              Selecione uma conversa para começar a trocar experiências literárias.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
