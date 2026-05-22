import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { env } from '../lib/env'
import { consumeSseStream } from '../lib/sse'
import { getToken } from '../lib/token'
import { useDocumentVisible } from './useDocumentVisible'

const MAX_RETRY_MS = 30_000

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

/**
 * SSE push for messages and notifications. Invalidates React Query caches on events.
 */
export function useReaderEvents(enabled: boolean) {
  const qc = useQueryClient()
  const tabVisible = useDocumentVisible()

  useEffect(() => {
    if (!enabled || !tabVisible) return

    const token = getToken()
    if (!token) return

    const ac = new AbortController()
    let retryMs = 1000

    const run = async () => {
      while (!ac.signal.aborted) {
        try {
          const res = await fetch(`${env.apiBaseUrl}/reader/events`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'text/event-stream',
            },
            signal: ac.signal,
          })

          await consumeSseStream(
            res,
            (event, data) => {
              if (event === 'message') {
                const senderId = data.sender_id
                if (senderId != null) {
                  qc.invalidateQueries({ queryKey: ['messages', String(senderId)] })
                }
                qc.invalidateQueries({ queryKey: ['conversations-infinite'] })
                qc.invalidateQueries({ queryKey: ['notifications'] })
                return
              }
              if (event === 'notification') {
                qc.invalidateQueries({ queryKey: ['notifications'] })
                qc.invalidateQueries({ queryKey: ['conversations-infinite'] })
              }
            },
            ac.signal,
          )
          retryMs = 1000
        } catch (err) {
          if (ac.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) break
          try {
            await sleep(retryMs, ac.signal)
          } catch {
            break
          }
          retryMs = Math.min(retryMs * 2, MAX_RETRY_MS)
        }
      }
    }

    void run()
    return () => ac.abort()
  }, [enabled, tabVisible, qc])
}
