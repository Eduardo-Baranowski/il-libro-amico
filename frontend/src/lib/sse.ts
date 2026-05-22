export type SseHandler = (event: string, data: Record<string, unknown>) => void

function parseBlock(block: string): { event: string; data: string } | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (!dataLines.length) return null
  return { event, data: dataLines.join('\n') }
}

/** Consumes an SSE response body (fetch + Authorization header). */
export async function consumeSseStream(
  response: Response,
  onEvent: SseHandler,
  signal?: AbortSignal,
): Promise<void> {
  if (!response.ok || !response.body) {
    throw new Error(`SSE failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (!signal?.aborted) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed || trimmed.startsWith(':')) continue
      const parsed = parseBlock(trimmed)
      if (!parsed) continue
      try {
        onEvent(parsed.event, JSON.parse(parsed.data) as Record<string, unknown>)
      } catch {
        /* ignore malformed payloads */
      }
    }
  }
}
