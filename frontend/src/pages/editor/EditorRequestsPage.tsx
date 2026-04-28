import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../../lib/api'
import type { EditorRequest } from '../../lib/types'

export function EditorRequestsPage() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['editorRequests'],
    queryFn: () => api<EditorRequest[]>('/editor/requests'),
  })

  const [draft, setDraft] = useState<Record<number, string>>({})

  const respondM = useMutation({
    mutationFn: ({ id, resposta }: { id: number; resposta: string }) =>
      api<{ message: string }>(`/editor/requests/${id}/respond`, {
        method: 'PUT',
        body: JSON.stringify({ resposta }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['editorRequests'] })
    },
  })

  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Solicitações</h1>

      {q.isLoading ? <p>Carregando…</p> : null}
      {q.isError ? <p className="error">{(q.error as any)?.message}</p> : null}

      {q.data && q.data.length === 0 ? <p className="muted">Sem solicitações.</p> : null}

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {q.data?.map((r) => (
          <div key={r.id} className="card" style={{ borderRadius: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>#{r.id}</strong> <span className="pill primary">{r.status}</span>
                <div className="muted">Leitor: {r.leitor_id}</div>
              </div>
              <div className="muted">{r.data_criacao ? new Date(r.data_criacao).toLocaleString() : ''}</div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="muted">Mensagem</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{r.conteudo}</div>
            </div>

            {r.status === 'respondida' ? (
              <div style={{ marginTop: 10 }}>
                <div className="muted">Resposta</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{r.resposta}</div>
              </div>
            ) : (
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                <div className="muted">Responder</div>
                <textarea
                  className="input"
                  rows={4}
                  value={draft[r.id] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                />
                <button
                  className="btn"
                  type="button"
                  onClick={() => respondM.mutate({ id: r.id, resposta: draft[r.id] ?? '' })}
                  disabled={respondM.isPending}
                >
                  {respondM.isPending ? 'Enviando…' : 'Enviar resposta'}
                </button>
                {respondM.isError ? <div className="error">{(respondM.error as any)?.message}</div> : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
