import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../../lib/api'

type EditorOption = { id: number; nome: string }

export function ReaderNewRequestPage() {
  const qc = useQueryClient()
  const [editorId, setEditorId] = useState<number | ''>('')
  const [conteudo, setConteudo] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const editorsQ = useQuery({
    queryKey: ['readerEditors'],
    queryFn: () => api<EditorOption[]>('/reader/editors'),
  })

  const sendM = useMutation({
    mutationFn: () =>
      api<{ id: number; message: string }>('/reader/requests', {
        method: 'POST',
        body: JSON.stringify({ editor_id: editorId, conteudo }),
      }),
    onSuccess: async () => {
      setErr(null)
      setOk('Solicitação enviada.')
      setConteudo('')
      setEditorId('')
      await qc.invalidateQueries({ queryKey: ['readerRequests'] })
    },
    onError: (e: any) => setErr(e?.message ?? 'Erro ao enviar'),
  })

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h1 style={{ marginTop: 0 }}>Nova solicitação</h1>

      {editorsQ.isLoading ? <p>Carregando editoras…</p> : null}
      {editorsQ.isError ? <p className="error">{(editorsQ.error as any)?.message}</p> : null}

      <div className="stack" style={{ marginTop: 12 }}>
        <div>
          <label className="label">Editora</label>
          <select
            className="input"
            value={editorId}
            onChange={(e) => setEditorId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">— escolher —</option>
            {editorsQ.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome} (id {e.id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Conteúdo</label>
          <textarea
            className="input"
            rows={5}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
          />
        </div>

        {err ? <div className="error">{err}</div> : null}
        {ok ? <div className="success">{ok}</div> : null}

        <button className="btn" type="button" onClick={() => sendM.mutate()} disabled={sendM.isPending}>
          {sendM.isPending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
