import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { api } from '../../lib/api'
import type { BookPublic } from '../../lib/types'
import { StarRating } from '../../app/components/StarRating'

type Status = 'quero_ler' | 'lendo' | 'lido'

export function ReaderNewReadingPage() {
  const { bookId: editBookId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  
  const [bookId, setBookId] = useState<number | ''>(editBookId ? Number(editBookId) : '')
  const [status, setStatus] = useState<Status>('lendo')
  const [nota, setNota] = useState<number | ''>('')
  const [comentario, setComentario] = useState('')

  const detailQ = useQuery({
    queryKey: ['bookDetails', editBookId],
    enabled: Boolean(editBookId),
    queryFn: () => api<BookPublic & { my_reading?: { status: Status; nota: number | null; comentario: string | null } }>(`/reader/books/${editBookId}`),
  })

  useEffect(() => {
    if (detailQ.data?.my_reading) {
      setStatus(detailQ.data.my_reading.status)
      setNota(detailQ.data.my_reading.nota ?? '')
      setComentario(detailQ.data.my_reading.comentario ?? '')
    }
  }, [detailQ.data])

  const booksQ = useQuery({
    queryKey: ['booksAll'],
    queryFn: () => api<BookPublic[]>('/reader/books'),
    enabled: !editBookId,
  })

  const options = useMemo(() => booksQ.data ?? [], [booksQ.data])

  const saveM = useMutation({
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
      await qc.invalidateQueries({ queryKey: ['bookDetails', bookId] })
      await qc.invalidateQueries({ queryKey: ['publicVisit'] })
      toast.success(editBookId ? 'Leitura atualizada!' : 'Leitura registrada!')
      navigate(-1)
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar')
  })

  return (
    <div className="card-container">
      <div className="card">
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>{editBookId ? '✏️ Editar experiência' : '📖 Registrar leitura'}</h1>
        <p className="muted" style={{ marginBottom: 32 }}>
          {editBookId 
            ? 'Atualize seu progresso e avaliação deste livro.' 
            : 'Escolha um livro do catálogo e marque como sua próxima leitura ou uma obra concluída.'}
        </p>

        {detailQ.isLoading && <p>Carregando dados da leitura...</p>}

        <div className="stack" style={{ gap: '24px' }}>
          {!editBookId ? (
            <div>
              <label className="label">Qual livro você está lendo?</label>
              <select className="input" value={bookId} onChange={(e) => setBookId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">— selecionar livro —</option>
                {options.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.titulo} — {b.autor}
                  </option>
                ))}
              </select>
              {booksQ.isLoading && <small className="muted">Carregando catálogo...</small>}
            </div>
          ) : (
            <div className="search-card" style={{ padding: '20px', background: 'var(--surface-2)', borderRadius: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>{detailQ.data?.titulo}</div>
              <div className="muted">{detailQ.data?.autor}</div>
            </div>
          )}

          <div className="row" style={{ gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label className="label">Status atual</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                <option value="quero_ler">Quero ler</option>
                <option value="lendo">Lendo agora</option>
                <option value="lido">Já li</option>
              </select>
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <label className="label">Sua nota</label>
              <div style={{ height: '48px', display: 'flex', alignItems: 'center', background: 'var(--surface-2)', padding: '0 16px', borderRadius: '12px' }}>
                <StarRating 
                  rating={Number(nota) || 0} 
                  onChange={(val) => setNota(val)} 
                  editable 
                  size={24} 
                />
                {nota ? <span style={{ marginLeft: 12, fontWeight: 700 }}>{nota}/5</span> : null}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Algum comentário ou reflexão?</label>
            <textarea 
              className="input" 
              rows={5} 
              placeholder="O que você está achando da obra?"
              value={comentario} 
              onChange={(e) => setComentario(e.target.value)} 
            />
          </div>

          <div className="row" style={{ marginTop: '12px', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              className="btn secondary" 
              style={{ flex: 1, minWidth: '140px' }} 
              type="button"
              onClick={() => navigate('/leitor/leituras')}
            >
              Cancelar
            </button>
            <button 
              className="btn" 
              style={{ flex: 2, minWidth: '200px' }} 
              type="button" 
              onClick={() => saveM.mutate()} 
              disabled={saveM.isPending || (bookId === '')}
            >
              {saveM.isPending ? 'Salvando…' : editBookId ? 'Salvar Alterações' : 'Confirmar Registro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
