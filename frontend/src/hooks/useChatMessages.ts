import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../lib/api'

export interface ChatMessage {
  id: number
  sender_id: number
  receiver_id: number
  conteudo: string
  lida: boolean
  data_envio: string
}

/**
 * Incremental message sync via after_id. Full history on first load; append-only on polls/SSE invalidation.
 */
export function useChatMessages(activeUserId: string | undefined, pollEnabled: boolean) {
  const qc = useQueryClient()
  const lastIdRef = useRef(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    lastIdRef.current = 0
    setMessages([])
  }, [activeUserId])

  const syncQ = useQuery({
    queryKey: ['messages', activeUserId],
    enabled: Boolean(activeUserId),
    queryFn: async () => {
      const afterId = lastIdRef.current
      const batch = await api<ChatMessage[]>(
        `/reader/users/${activeUserId}/messages?after_id=${afterId}`,
      )
      if (afterId === 0) {
        setMessages(batch)
      } else if (batch.length > 0) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const extra = batch.filter((m) => !seen.has(m.id))
          return extra.length ? [...prev, ...extra] : prev
        })
      }
      if (batch.length > 0) {
        lastIdRef.current = Math.max(lastIdRef.current, ...batch.map((m) => m.id))
      }
      return batch
    },
    refetchInterval: pollEnabled ? 12_000 : false,
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['messages', activeUserId] })

  return {
    messages,
    isLoading: syncQ.isLoading,
    refresh,
  }
}
