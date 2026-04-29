import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { api } from '../../lib/api'
import type { MyReading } from '../../lib/types'
import { StarRating } from '../../app/components/StarRating'
import { ConfirmModal } from '../../app/components/ConfirmModal'

function statusLabel(st: MyReading['status']) {
  if (st === 'quero_ler') return 'Quero ler'
  if (st === 'lendo') return 'Lendo'
  return 'Lido'
}

export function ReaderMyReadingsPage() {
  const qc = useQueryClient()
  const [readingToDelete, setReadingToDelete] = useState<number | null>(null)
  
  const q = useQuery({
    queryKey: ['myReadings'],
    queryFn: () => api<MyReading[]>('/reader/readings'),
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
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Minhas leituras</h1>
      <p className="muted">Gerencie seus livros e experiências literárias.</p>

      {q.isLoading ? <p>Carregando…</p> : null}
      {q.isError ? <p className="error">{(q.error as any)?.message}</p> : null}

      {q.data && q.data.length === 0 ? <p className="muted">Você ainda não registrou leituras.</p> : null}

      <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        {q.data?.map((r) => (
          <div key={r.id} className="card" style={{ borderRadius: 16, padding: 16 }}>
            <div className="row" style={{ alignItems: 'flex-start', gap: '20px' }}>
              {r.livro.imagem_url ? (
                <img
                  src={r.livro.imagem_url}
                  alt={r.livro.titulo}
                  style={{ width: 120, height: 160, objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              ) : (
                <div style={{ width: 120, height: 160, borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📖</div>
              )}
              <div style={{ flex: 1 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{r.livro.titulo}</h3>
                    <div className="muted">{r.livro.autor}</div>
                    <div className="muted" style={{ fontSize: '13px' }}>Editora: {r.livro.editora}</div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span className="pill primary">{statusLabel(r.status)}</span>
                    {r.nota ? (
                      <StarRating rating={r.nota} size={14} />
                    ) : null}
                  </div>
                </div>

                {r.comentario ? (
                  <div style={{ marginTop: 12, padding: '12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                    <p className="muted" style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                      {r.comentario}
                    </p>
                  </div>
                ) : null}

                <div className="row" style={{ marginTop: 16, gap: '12px', justifyContent: 'flex-end' }}>
                  <Link 
                    to={`/leitor/leituras/editar/${r.livro.id}`} 
                    className="btn secondary" 
                    style={{ 
                      fontSize: '12px', 
                      height: '36px', 
                      minHeight: 'unset', 
                      padding: '0 16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      borderRadius: '10px'
                    }}
                  >
                    📝 Editar
                  </Link>
                  <button 
                    className="btn secondary" 
                    style={{ 
                      fontSize: '12px', 
                      height: '36px', 
                      minHeight: 'unset', 
                      padding: '0 16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      borderRadius: '10px',
                      color: 'var(--error)',
                      borderColor: 'rgba(239, 68, 68, 0.2)'
                    }}
                    onClick={() => setReadingToDelete(r.id)}
                    disabled={deleteM.isPending}
                  >
                    🗑️ Remover
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

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
