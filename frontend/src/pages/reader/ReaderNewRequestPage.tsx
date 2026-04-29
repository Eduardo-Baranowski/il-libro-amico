import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

type EditorOption = { id: number; nome: string }
type EditorBookOption = { id: number; titulo: string; autor: string }

export function ReaderNewRequestPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [editorId, setEditorId] = useState<number | ''>('')
  const [bookId, setBookId] = useState<number | ''>('')
  const [conteudo, setConteudo] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const editorsQ = useQuery({
    queryKey: ['readerEditors'],
    queryFn: () => api<EditorOption[]>('/reader/editors'),
  })

  const booksQ = useQuery({
    queryKey: ['readerEditorBooks', editorId],
    enabled: typeof editorId === 'number',
    queryFn: () => api<EditorBookOption[]>(`/reader/editors/${editorId}/books`),
  })

  const sendM = useMutation({
    mutationFn: () =>
      api<{ id: number; message: string }>('/reader/requests', {
        method: 'POST',
        body: JSON.stringify({ editor_id: editorId, livro_id: bookId, conteudo }),
      }),
    onSuccess: async () => {
      setErr(null)
      setOk('Solicitação enviada com sucesso!')
      setConteudo('')
      setEditorId('')
      setBookId('')
      await qc.invalidateQueries({ queryKey: ['readerRequests'] })
      setTimeout(() => navigate('/leitor/solicitacoes'), 1500)
    },
    onError: (e: any) => setErr(e?.message ?? 'Erro ao enviar'),
  })

  return (
    <div className="card-container">
      <div className="card">
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Nova solicitação</h1>
        <p className="muted" style={{ marginBottom: 32 }}>
          Envie uma mensagem para a editora demonstrando seu interesse em um livro específico ou solicitando informações.
        </p>

        {editorsQ.isLoading ? <p>Carregando editoras…</p> : null}
        {editorsQ.isError ? <p className="error">{(editorsQ.error as any)?.message}</p> : null}

        <div className="stack" style={{ gap: '24px' }}>
          <div className="row" style={{ gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 250px' }}>
              <label className="label">Editora</label>
              <select
                className="input"
                value={editorId}
                onChange={(e) => {
                  setEditorId(e.target.value ? Number(e.target.value) : '')
                  setBookId('')
                }}
              >
                <option value="">— escolher editora —</option>
                {editorsQ.data?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 250px' }}>
              <label className="label">Livro</label>
              <select
                className="input"
                value={bookId}
                onChange={(e) => setBookId(e.target.value ? Number(e.target.value) : '')}
                disabled={typeof editorId !== 'number' || booksQ.isLoading}
              >
                <option value="">
                  {typeof editorId !== 'number'
                    ? '— selecione a editora primeiro —'
                    : booksQ.isLoading
                      ? 'Carregando livros...'
                      : '— escolher livro —'}
                </option>
                {booksQ.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.titulo} — {b.autor}
                  </option>
                ))}
              </select>
              {typeof editorId === 'number' && booksQ.data?.length === 0 ? (
                <p className="muted small" style={{ marginTop: 6 }}>
                  Esta editora ainda não possui livros cadastrados.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label className="label">Mensagem para a editora</label>
            <textarea
              className="input"
              rows={6}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Descreva seu interesse nesse livro ou tire suas dúvidas..."
            />
          </div>

          {err ? <div className="error" style={{ padding: '12px', borderRadius: '8px' }}>{err}</div> : null}
          {ok ? <div className="success" style={{ padding: '12px', borderRadius: '8px' }}>{ok}</div> : null}

          <div className="row" style={{ gap: '12px' }}>
            <button
              className="btn secondary"
              type="button"
              style={{ flex: 1 }}
              onClick={() => navigate('/leitor/solicitacoes')}
            >
              Voltar
            </button>
            <button
              className="btn"
              type="button"
              style={{ flex: 2 }}
              onClick={() => sendM.mutate()}
              disabled={sendM.isPending || typeof editorId !== 'number' || typeof bookId !== 'number'}
            >
              {sendM.isPending ? 'Enviando…' : 'Enviar Solicitação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
