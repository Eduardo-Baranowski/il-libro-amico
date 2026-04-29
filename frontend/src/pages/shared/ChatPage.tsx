import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { getUserIdFromToken } from '../../lib/token'

interface Conversation {
  user_id: number
  user_nome: string
  user_imagem_url: string | null
  last_message: string
  last_message_time: string | null
  unread_count: number
}

interface Message {
  id: number
  sender_id: number
  receiver_id: number
  conteudo: string
  lida: boolean
  data_envio: string
}

export function ChatPage() {
  const meId = getUserIdFromToken()
  const navigate = useNavigate()
  const { userId: activeUserId } = useParams()
  const qc = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [msgInput, setMsgInput] = useState('')

  // List of conversations
  const conversationsQ = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api<Conversation[]>('/reader/conversations'),
    refetchInterval: 5000,
  })

  // Messages with active user
  const messagesQ = useQuery({
    queryKey: ['messages', activeUserId],
    enabled: Boolean(activeUserId),
    queryFn: () => api<Message[]>(`/reader/users/${activeUserId}/messages`),
    refetchInterval: 3000,
  })

  const sendMsgM = useMutation({
    mutationFn: (conteudo: string) => api(`/reader/users/${activeUserId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ conteudo })
    }),
    onSuccess: () => {
      setMsgInput('')
      qc.invalidateQueries({ queryKey: ['messages', activeUserId] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    }
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messagesQ.data])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!msgInput.trim()) return
    sendMsgM.mutate(msgInput)
  }

  // Active user data for the header
  const activeUser = conversationsQ.data?.find(c => String(c.user_id) === String(activeUserId))

  return (
    <div className={`chat-shell ${activeUserId ? 'has-active-chat' : ''}`}>
      {/* Sidebar - Conversas */}
      <aside className="chat-sidebar card">
        <div className="chat-sidebar-header">
          <h2>Mensagens</h2>
        </div>
        <div className="chat-sidebar-list">
          {conversationsQ.data?.map(conv => (
            <div 
              key={conv.user_id} 
              className={`chat-contact-item ${activeUserId === String(conv.user_id) ? 'active' : ''}`}
              onClick={() => navigate(`/mensagens/${conv.user_id}`)}
            >
              <div className="avatar-circle chat-avatar">
                {conv.user_imagem_url ? <img src={conv.user_imagem_url} alt={conv.user_nome} /> : <span>{conv.user_nome.slice(0,1).toUpperCase()}</span>}
              </div>
              <div className="chat-contact-info">
                <div className="chat-contact-top">
                  <span className="chat-contact-name">{conv.user_nome}</span>
                  {conv.unread_count > 0 && <span className="pill success mini-pill">{conv.unread_count}</span>}
                </div>
                <div className="chat-contact-msg muted">
                  {conv.last_message}
                </div>
              </div>
            </div>
          ))}
          {conversationsQ.data?.length === 0 && (
            <p className="muted empty-msg">Nenhuma conversa iniciada.</p>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main card">
        {activeUserId ? (
          <>
            <div className="chat-header">
              <button className="btn secondary chat-back-btn" onClick={() => navigate('/mensagens')}>
                ⬅️
              </button>
              <div className="avatar-circle chat-header-avatar">
                 {activeUser?.user_imagem_url ? <img src={activeUser.user_imagem_url} alt={activeUser.user_nome} /> : <span>💬</span>}
              </div>
              <div className="chat-header-info">
                <strong>{activeUser?.user_nome || 'Conversa'}</strong>
                <Link to={`/perfil/${activeUserId}`} className="link-hover muted" style={{ fontSize: '11px' }}>Ver perfil</Link>
              </div>
            </div>

            <div ref={scrollRef} className="chat-messages">
              {messagesQ.data?.map(m => {
                const isMe = String(m.sender_id) === String(meId)
                return (
                  <div key={m.id} className={`chat-bubble ${isMe ? 'outgoing' : 'incoming'}`}>
                    <div className="chat-bubble-content">
                      {m.conteudo}
                    </div>
                    <div className="chat-bubble-time">
                      {new Date(m.data_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleSend} className="chat-input-area">
              <input 
                className="input" 
                placeholder="Escreva uma mensagem..." 
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
              />
              <button className="btn" type="submit" disabled={!msgInput.trim() || sendMsgM.isPending}>
                {sendMsgM.isPending ? '...' : 'Enviar'}
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty-state">
             <div className="chat-empty-icon">💬</div>
             <h3>Suas Mensagens</h3>
             <p className="muted">Selecione uma conversa para começar.</p>
          </div>
        )}
      </main>
    </div>
  )
}
