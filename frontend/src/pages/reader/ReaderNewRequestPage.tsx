import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'

type EditorOption = { id: number; nome: string }
type EditorBookOption = { id: number; titulo: string; autor: string }

export function ReaderNewRequestPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [editorId, setEditorId] = useState<number | ''>('')
  const [bookId, setBookId] = useState<number | ''>('')
  const [conteudo, setConteudo] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  useEffect(() => {
    const e = searchParams.get('editor_id')
    const l = searchParams.get('livro_id')
    if (e) setEditorId(Number(e))
    if (l) setBookId(Number(l))
  }, [searchParams])

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
      <div className="card" style={{ padding: '32px' }}>
        <h1 style={{ marginTop: 0, marginBottom: 8, letterSpacing: '-1px' }}>📬 Nova Solicitação</h1>
        <p className="muted" style={{ marginBottom: 40 }}>
          Envie uma mensagem para a editora demonstrando seu interesse em um livro específico ou solicitando informações.
        </p>

        {editorsQ.isLoading ? <p className="muted">Carregando editoras…</p> : null}
        {editorsQ.isError ? <p className="error">{(editorsQ.error as any)?.message}</p> : null}

        <div className="stack" style={{ gap: '32px' }}>
          <div className="row" style={{ gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px', maxWidth: '450px' }}>
              <label className="label">Editora de interesse</label>
              <select
                className="input"
                value={editorId}
                onChange={(e) => {
                  setEditorId(e.target.value ? Number(e.target.value) : '')
                  setBookId('')
                }}
                style={{ borderRadius: '14px' }}
              >
                <option value="">— escolher editora —</option>
                {editorsQ.data?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 280px', maxWidth: '450px' }}>
              <label className="label">Obra pretendida</label>
              <select
                className="input"
                value={bookId}
                onChange={(e) => setBookId(e.target.value ? Number(e.target.value) : '')}
                disabled={typeof editorId !== 'number' || booksQ.isLoading}
                style={{ borderRadius: '14px' }}
              >
                <option value="">
                  {typeof editorId !== 'number'
                    ? '— selecione a editora primeiro —'
                    : booksQ.isLoading
                      ? 'Carregando acervo...'
                      : '— escolher livro —'}
                </option>
                {booksQ.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.titulo} — {b.autor}
                  </option>
                ))}
              </select>
              {typeof editorId === 'number' && booksQ.data?.length === 0 ? (
                <p className="muted small" style={{ marginTop: 8, fontWeight: 600 }}>
                  Esta editora ainda não possui livros listados.
                </p>
              ) : null}
            </div>
          </div>

          <div style={{ maxWidth: '800px' }}>
            <label className="label">Sua mensagem para a editora</label>
            <textarea
              className="input"
              rows={6}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Descreva seu interesse nesse livro ou tire suas dúvidas de forma clara e objetiva..."
              style={{ padding: '16px', borderRadius: '14px' }}
            />
          </div>

          {err ? <div className="error" style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(186, 26, 26, 0.2)' }}>{err}</div> : null}
          {ok ? <div className="success" style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(22, 101, 52, 0.2)' }}>{ok}</div> : null}

          <div className="row" style={{ gap: '16px', flexWrap: 'wrap' }}>
            <button
              className="btn secondary"
              type="button"
              style={{ flex: 1, minWidth: '160px', borderRadius: '14px' }}
              onClick={() => navigate('/leitor/solicitacoes')}
            >
              Voltar
            </button>
            <button
              className="btn"
              type="button"
              style={{ flex: 2, minWidth: '220px', borderRadius: '14px' }}
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
