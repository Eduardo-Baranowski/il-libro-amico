import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../app/AuthProvider'
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

  return (
    <div className="container" style={{ height: 'calc(100vh - 120px)', display: 'flex', gap: '20px', padding: '20px 0' }}>
      {/* Sidebar - Conversas */}
      <aside className="settings-card" style={{ width: '320px', display: 'flex', flexDirection: 'column', padding: '0' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Mensagens</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversationsQ.data?.map(conv => (
            <div 
              key={conv.user_id} 
              className={`dropdown-item ${activeUserId === String(conv.user_id) ? 'active' : ''}`}
              style={{ 
                padding: '16px', 
                cursor: 'pointer', 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                background: activeUserId === String(conv.user_id) ? 'var(--surface-2)' : 'transparent'
              }}
              onClick={() => navigate(`/mensagens/${conv.user_id}`)}
            >
              <div className="avatar-circle" style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                {conv.user_imagem_url ? <img src={conv.user_imagem_url} alt={conv.user_nome} /> : <span>{conv.user_nome.slice(0,1).toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.user_nome}</span>
                  {conv.unread_count > 0 && <span className="pill success" style={{ padding: '2px 6px', fontSize: '10px' }}>{conv.unread_count}</span>}
                </div>
                <div className="muted" style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.last_message}
                </div>
              </div>
            </div>
          ))}
          {conversationsQ.data?.length === 0 && (
            <p className="muted" style={{ padding: '40px', textAlign: 'center' }}>Nenhuma conversa iniciada.</p>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="settings-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', position: 'relative' }}>
        {activeUserId ? (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar-circle" style={{ width: '32px', height: '32px' }}>
                 <span>💬</span>
              </div>
              <strong style={{ fontSize: '1.1rem' }}>Conversa</strong>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messagesQ.data?.map(m => {
                const isMe = String(m.sender_id) === String(meId)
                return (
                  <div key={m.id} style={{ 
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: isMe ? '18px 18px 0 18px' : '18px 18px 18px 0',
                    background: isMe ? 'var(--primary)' : 'var(--surface-2)',
                    color: isMe ? '#fff' : 'inherit',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {m.conteudo}
                    <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>
                      {new Date(m.data_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleSend} style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
              <input 
                className="input" 
                placeholder="Escreva uma mensagem..." 
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                style={{ borderRadius: '24px', paddingLeft: '20px' }}
              />
              <button className="btn" type="submit" disabled={!msgInput.trim() || sendMsgM.isPending}>
                {sendMsgM.isPending ? '...' : 'Enviar'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
             <div style={{ fontSize: '64px' }}>💬</div>
             <h3>Suas Mensagens</h3>
             <p className="muted">Selecione uma conversa para começar.</p>
          </div>
        )}
      </main>
    </div>
  )
}
