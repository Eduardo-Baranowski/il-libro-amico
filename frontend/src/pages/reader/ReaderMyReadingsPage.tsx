import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { api } from '../../lib/api'
import type { MyReading, PaginatedResponse } from '../../lib/types'
import { StarRating } from '../../app/components/StarRating'
import { ConfirmModal } from '../../app/components/ConfirmModal'
import { ExploreBooks } from '../../app/components/ExploreBooks'
import { Pagination } from '../../app/components/Pagination'

function statusLabel(st: MyReading['status']) {
  if (st === 'quero_ler') return 'Quero ler'
  if (st === 'lendo') return 'Lendo'
  return 'Lido'
}

export function ReaderMyReadingsPage() {
  const qc = useQueryClient()
  const [readingToDelete, setReadingToDelete] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  
  const q = useQuery({
    queryKey: ['myReadings', page],
    queryFn: () => api<PaginatedResponse<MyReading>>(`/reader/readings?page=${page}&per_page=10`),
  })

  const deleteM = useMutation({
    mutationFn: (id: number) => api(`/reader/readings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Leitura removida com sucesso!')
      qc.invalidateQueries({ queryKey: ['myReadings'] })
      setReadingToDelete(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao remover')
      setReadingToDelete(null)
    }
  })

  return (
    <div className="card-container">
      <ExploreBooks />

      <div className="readings-header">
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Minhas leituras</h1>
        <p className="muted" style={{ marginBottom: 24 }}>Gerencie seus livros e experiências literárias.</p>
      </div>

      {q.isLoading ? <p className="muted" style={{ textAlign: 'center', padding: '40px' }}>Carregando…</p> : null}
      {q.isError ? <p className="error">{(q.error as any)?.message}</p> : null}

      {q.data && q.data.items.length === 0 ? <p className="muted" style={{ padding: '60px 20px', textAlign: 'center' }}>Você ainda não registrou leituras.</p> : null}

      <div className="readings-list">
        {q.data?.items.map((r) => (
          <div key={r.id} className="reading-card card">
            <div className="reading-card-body">
              <div className="reading-card-media">
                {r.livro.imagem_url ? (
                  <img
                    src={r.livro.imagem_url}
                    alt={r.livro.titulo}
                    className="reading-book-cover"
                  />
                ) : (
                  <div className="feed-book-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📖</div>
                )}
              </div>
              
              <div className="reading-card-info">
                <div className="reading-card-header">
                  <div className="reading-card-titles">
                    <h3 className="reading-book-title">{r.livro.titulo}</h3>
                    <div className="muted">{r.livro.autor}</div>
                    <div className="muted small">Editora: {r.livro.editora}</div>
                  </div>
                  <div className="reading-card-status">
                    <span className="pill primary">{statusLabel(r.status)}</span>
                    {r.nota ? (
                      <StarRating rating={r.nota} size={14} />
                    ) : null}
                  </div>
                </div>

                {r.comentario ? (
                  <div className="reading-comment-box">
                    <p className="muted small pre-wrap">
                      {r.comentario}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="reading-card-actions">
              <Link to={`/leitor/leituras/editar/${r.livro.id}`} className="btn secondary flex-1">
                📝 Editar
              </Link>
              <button 
                className="btn secondary danger-outline flex-1"
                onClick={() => setReadingToDelete(r.id)}
                disabled={deleteM.isPending}
              >
                🗑️ Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <Pagination 
        currentPage={page} 
        totalPages={q.data?.pages ?? 1} 
        onPageChange={setPage} 
        isLoading={q.isFetching}
      />

      <ConfirmModal 
        isOpen={readingToDelete !== null}
        title="Remover Leitura"
        message="Deseja realmente remover este livro da sua lista de leituras? Esta ação não pode ser desfeita."
        confirmLabel="Sim, Remover"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={() => readingToDelete && deleteM.mutate(readingToDelete)}
        onCancel={() => setReadingToDelete(null)}
      />
    </div>
  )
}
