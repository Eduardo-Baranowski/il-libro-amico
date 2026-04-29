import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { api } from '../../lib/api'
import type { BookEditor } from '../../lib/types'
import { ConfirmModal } from '../../app/components/ConfirmModal'

function buildFormData(fields: {
  titulo?: string
  autor?: string
  preco?: string
  estoque?: string
  descricao?: string
  imagem?: File | null
}) {
  const fd = new FormData()
  if (fields.titulo != null) fd.set('titulo', fields.titulo)
  if (fields.autor != null) fd.set('autor', fields.autor)
  if (fields.preco != null) fd.set('preco', fields.preco)
  if (fields.estoque != null) fd.set('estoque', fields.estoque)
  if (fields.descricao != null) fd.set('descricao', fields.descricao)
  if (fields.imagem) fd.set('imagem', fields.imagem)
  return fd
}

export function EditorBooksPage() {
  const qc = useQueryClient()
  const [bookToDelete, setBookToDelete] = useState<number | null>(null)
  
  const q = useQuery({
    queryKey: ['editorBooks'],
    queryFn: () => api<BookEditor[]>('/editor/books'),
  })

  const [newBook, setNewBook] = useState({ titulo: '', autor: '', preco: '', estoque: '0', descricao: '' })
  const [file, setFile] = useState<File | null>(null)
  const [stockDraft, setStockDraft] = useState<Record<number, string>>({})

  const createM = useMutation({
    mutationFn: async () => {
      const fd = buildFormData({ ...newBook, imagem: file })
      return await api<{ id: number; message: string }>('/editor/books', {
        method: 'POST',
        body: fd,
      })
    },
    onSuccess: async () => {
      setNewBook({ titulo: '', autor: '', preco: '', estoque: '0', descricao: '' })
      setFile(null)
      toast.success('Livro cadastrado com sucesso!')
      await qc.invalidateQueries({ queryKey: ['editorBooks'] })
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao cadastrar')
  })

  const updateStockM = useMutation({
    mutationFn: ({ id, estoque }: { id: number; estoque: number }) => {
      const fd = new FormData()
      fd.set('estoque', String(estoque))
      return api<{ message: string }>(`/editor/books/${id}`, { method: 'PUT', body: fd })
    },
    onSuccess: async () => {
      toast.success('Estoque atualizado!')
      await qc.invalidateQueries({ queryKey: ['editorBooks'] })
    },
  })

  const deleteM = useMutation({
    mutationFn: (id: number) => api<{ message: string }>(`/editor/books/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      toast.success('Livro removido do catálogo')
      setBookToDelete(null)
      await qc.invalidateQueries({ queryKey: ['editorBooks'] })
    },
  })

  const books = useMemo(() => q.data ?? [], [q.data])

  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: '32px' }}>
      <div className="card" style={{ flex: 2, minWidth: 400 }}>
        <h1 style={{ marginTop: 0 }}>Gestão do Catálogo</h1>
        {q.isLoading ? <p>Carregando acervo…</p> : null}
        {q.isError ? <p className="error">{(q.error as any)?.message}</p> : null}

        {books.length === 0 ? <p className="muted">Nenhum livro disponível no catálogo.</p> : null}

        <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
          {books.map((b) => (
            <div key={b.id} className="card" style={{ borderRadius: 16, padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
                <div className="row" style={{ alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                  {b.imagem_url ? (
                    <img
                      src={b.imagem_url}
                      alt={b.titulo}
                      style={{
                        width: 80,
                        height: 110,
                        objectFit: 'cover',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 80,
                        height: 110,
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem'
                      }}
                    >📖</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '1.1rem', display: 'block' }}>{b.titulo}</strong>
                    <div className="muted">{b.autor}</div>
                    <div className="row" style={{ marginTop: '12px', gap: '8px' }}>
                       <span className="pill primary">R$ {b.preco}</span>
                       <span className="pill">estoque {b.estoque}</span>
                    </div>
                  </div>
                </div>

                <div className="stack" style={{ gap: '10px', width: '180px' }}>
                  <div className="row" style={{ gap: '8px' }}>
                    <input
                      className="input"
                      style={{ height: '40px', flex: 1, textAlign: 'center' }}
                      inputMode="numeric"
                      value={stockDraft[b.id] ?? String(b.estoque)}
                      onChange={(e) => setStockDraft((d) => ({ ...d, [b.id]: e.target.value }))}
                    />
                    <button
                      className="btn secondary"
                      type="button"
                      style={{ height: '40px', minHeight: 'unset', padding: '0 12px', flex: 2 }}
                      onClick={() => updateStockM.mutate({ id: b.id, estoque: Number(stockDraft[b.id] ?? b.estoque) })}
                      disabled={updateStockM.isPending}
                    >
                      💾 Atualizar
                    </button>
                  </div>
                  <button
                    className="btn secondary"
                    type="button"
                    style={{ 
                      height: '40px', 
                      minHeight: 'unset', 
                      width: '100%', 
                      color: 'var(--error)', 
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onClick={() => setBookToDelete(b.id)}
                    disabled={deleteM.isPending}
                  >
                    🗑️ Remover do Catálogo
                  </button>
                </div>
              </div>
              {b.descricao && (
                <div style={{ marginTop: 16, padding: '12px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                   <p className="muted" style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap' }}>{b.descricao}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ flex: 1, minWidth: 340, height: 'fit-content', position: 'sticky', top: '100px' }}>
        <h2 style={{ marginTop: 0 }}>✨ Cadastrar Novo Livro</h2>

        <div className="stack" style={{ gap: '16px' }}>
          <div>
            <label className="label">Título da Obra</label>
            <input className="input" placeholder="ex: O Alquimista" value={newBook.titulo} onChange={(e) => setNewBook({ ...newBook, titulo: e.target.value })} />
          </div>
          <div>
            <label className="label">Autor / Escritor</label>
            <input className="input" placeholder="Nome do autor" value={newBook.autor} onChange={(e) => setNewBook({ ...newBook, autor: e.target.value })} />
          </div>
          <div className="row" style={{ gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Preço (R$)</label>
              <input className="input" placeholder="0.00" inputMode="decimal" value={newBook.preco} onChange={(e) => setNewBook({ ...newBook, preco: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Estoque Inicial</label>
              <input className="input" placeholder="0" inputMode="numeric" value={newBook.estoque} onChange={(e) => setNewBook({ ...newBook, estoque: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Sinopse / Descrição</label>
            <textarea className="input" rows={4} placeholder="Breve resumo da obra..." value={newBook.descricao} onChange={(e) => setNewBook({ ...newBook, descricao: e.target.value })} />
          </div>
          <div>
            <label className="label">Capa do Livro</label>
            <div className="search-card" style={{ padding: '12px', borderStyle: 'dashed' }}>
               <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <button className="btn" type="button" style={{ height: '52px', fontSize: '1.1rem' }} onClick={() => createM.mutate()} disabled={createM.isPending}>
            {createM.isPending ? 'Cadastrando…' : '🚀 Publicar Livro'}
          </button>
        </div>
      </div>

      <ConfirmModal 
        isOpen={bookToDelete !== null}
        title="Remover Livro"
        message="Tem certeza que deseja remover este livro do catálogo? Esta ação não pode ser desfeita e o livro deixará de estar disponível para venda."
        confirmLabel="Sim, Remover"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={() => bookToDelete && deleteM.mutate(bookToDelete)}
        onCancel={() => setBookToDelete(null)}
      />
    </div>
  )
}
