import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { api } from '../../lib/api'
import type { BookPublic, PaginatedResponse } from '../../lib/types'
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
    queryKey: ['booksAll', 1], // Buscamos a primeira página para o select
    queryFn: () => api<PaginatedResponse<BookPublic>>('/reader/books?page=1&per_page=100'),
    enabled: !editBookId,
  })

  const options = useMemo(() => booksQ.data?.items ?? [], [booksQ.data])

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
      <div className="card" style={{ padding: '32px' }}>
        <h1 style={{ marginTop: 0, marginBottom: 8, letterSpacing: '-1px' }}>{editBookId ? '✏️ Editar Experiência' : '📖 Registrar Leitura'}</h1>
        <p className="muted" style={{ marginBottom: 40 }}>
          {editBookId 
            ? 'Atualize seu progresso e avaliação deste livro.' 
            : 'Escolha um livro do catálogo e marque como sua próxima leitura ou uma obra concluída.'}
        </p>

        {detailQ.isLoading && <p className="muted">Sincronizando dados...</p>}

        <div className="stack" style={{ gap: '32px' }}>
          {!editBookId ? (
            <div style={{ maxWidth: '600px' }}>
              <label className="label">Qual livro você está lendo?</label>
              <select className="input" value={bookId} onChange={(e) => setBookId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">— selecionar livro —</option>
                {options.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.titulo} — {b.autor}
                  </option>
                ))}
              </select>
              {booksQ.isLoading && <small className="muted">Carregando catálogo completo...</small>}
            </div>
          ) : (
            <div className="search-card" style={{ padding: '24px', background: 'var(--surface-2)', borderRadius: '16px', maxWidth: '600px', border: 'none' }}>
              <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--primary)', letterSpacing: '-0.5px' }}>{detailQ.data?.titulo}</div>
              <div className="muted" style={{ fontWeight: 600 }}>{detailQ.data?.autor}</div>
            </div>
          )}

          <div className="row" style={{ gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px', maxWidth: '400px' }}>
              <label className="label">Status atual</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                <option value="quero_ler">Quero ler</option>
                <option value="lendo">Lendo agora</option>
                <option value="lido">Já li</option>
              </select>
            </div>

            <div style={{ flex: '1 1 280px', maxWidth: '400px' }}>
              <label className="label">Sua avaliação</label>
              <div style={{ height: '52px', display: 'flex', alignItems: 'center', background: 'var(--surface-2)', padding: '0 20px', borderRadius: '14px' }}>
                <StarRating 
                  rating={Number(nota) || 0} 
                  onChange={(val) => setNota(val)} 
                  editable 
                  size={24} 
                />
                {nota ? <span style={{ marginLeft: 16, fontWeight: 800, color: 'var(--primary)' }}>{nota}/5</span> : null}
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '800px' }}>
            <label className="label">Algum comentário ou reflexão?</label>
            <textarea 
              className="input" 
              rows={6} 
              placeholder="O que esta obra está despertando em você?"
              value={comentario} 
              onChange={(e) => setComentario(e.target.value)} 
              style={{ padding: '16px', borderRadius: '14px' }}
            />
          </div>

          <div className="row" style={{ marginTop: '20px', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              className="btn secondary" 
              style={{ flex: 1, minWidth: '160px', borderRadius: '14px' }} 
              type="button"
              onClick={() => navigate('/leitor/leituras')}
            >
              Cancelar
            </button>
            <button 
              className="btn" 
              style={{ flex: 2, minWidth: '220px', borderRadius: '14px' }} 
              type="button" 
              onClick={() => saveM.mutate()} 
              disabled={saveM.isPending || (bookId === '')}
            >
              {saveM.isPending ? 'Salvando…' : editBookId ? 'Atualizar Experiência' : 'Confirmar Registro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
