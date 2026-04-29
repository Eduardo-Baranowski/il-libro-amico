import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { api } from '../../lib/api'
import type { BookPublic } from '../../lib/types'
import { StarRating } from '../../app/components/StarRating'

type Status = 'quero_ler' | 'lendo' | 'lido'

export function ReaderNewReadingPage() {
  const qc = useQueryClient()
  const [bookId, setBookId] = useState<number | ''>('')
  const [status, setStatus] = useState<Status>('lendo')
  const [nota, setNota] = useState<number | ''>('')
  const [comentario, setComentario] = useState('')

  const booksQ = useQuery({
    queryKey: ['booksAll'],
    queryFn: () => api<BookPublic[]>('/reader/books'),
  })

  const options = useMemo(() => booksQ.data ?? [], [booksQ.data])

  const createM = useMutation({
    mutationFn: () =>
      api<{ id: number; message: string }>('/reader/readings', {
        method: 'POST',
        body: JSON.stringify({
          livro_id: bookId,
          status,
          nota: nota === '' ? null : nota,
          comentario: comentario || null,
        }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['myReadings'] })
      setBookId('')
      setStatus('lendo')
      setNota('')
      setComentario('')
      toast.success('Leitura registrada!')
    },
  })

  return (
    <div className="card" style={{ maxWidth: 820 }}>
      <h1 style={{ marginTop: 0 }}>Registrar leitura</h1>
      <p className="muted">Escolha um livro (cadastrado por editoras) e marque seu status/nota. Preço não aparece.</p>

      {booksQ.isLoading ? <p>Carregando livros…</p> : null}
      {booksQ.isError ? <p className="error">{(booksQ.error as any)?.message}</p> : null}

      <div className="stack" style={{ marginTop: 12 }}>
        <div>
          <label className="label">Livro</label>
          <select className="input" value={bookId} onChange={(e) => setBookId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">— escolher —</option>
            {options.map((b) => (
              <option key={b.id} value={b.id}>
                {b.titulo} — {b.autor}
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="quero_ler">Quero ler</option>
              <option value="lendo">Lendo</option>
              <option value="lido">Já li</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="label">Sua Avaliação</label>
            <div style={{ height: '48px', display: 'flex', alignItems: 'center' }}>
              <StarRating 
                rating={Number(nota) || 0} 
                onChange={(val) => setNota(val)} 
                editable 
                size={28} 
              />
            </div>
          </div>
        </div>

        <div>
          <label className="label">Comentário</label>
          <textarea className="input" rows={4} value={comentario} onChange={(e) => setComentario(e.target.value)} />
        </div>

        <button className="btn" type="button" onClick={() => createM.mutate()} disabled={createM.isPending}>
          {createM.isPending ? 'Salvando…' : 'Salvar'}
        </button>
        {createM.isError ? <div className="error">{(createM.error as any)?.message}</div> : null}
      </div>
    </div>
  )
}
