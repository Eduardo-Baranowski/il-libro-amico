import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../../lib/api'
import type { BookEditor } from '../../lib/types'

function buildFormData(fields: {
  titulo?: string
  autor?: string
  preco?: string
  descricao?: string
  imagem?: File | null
}) {
  const fd = new FormData()
  if (fields.titulo != null) fd.set('titulo', fields.titulo)
  if (fields.autor != null) fd.set('autor', fields.autor)
  if (fields.preco != null) fd.set('preco', fields.preco)
  if (fields.descricao != null) fd.set('descricao', fields.descricao)
  if (fields.imagem) fd.set('imagem', fields.imagem)
  return fd
}

export function EditorBooksPage() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['editorBooks'],
    queryFn: () => api<BookEditor[]>('/editor/books'),
  })

  const [newBook, setNewBook] = useState({ titulo: '', autor: '', preco: '', descricao: '' })
  const [file, setFile] = useState<File | null>(null)

  const createM = useMutation({
    mutationFn: async () => {
      const fd = buildFormData({ ...newBook, imagem: file })
      return await api<{ id: number; message: string }>('/editor/books', {
        method: 'POST',
        body: fd,
      })
    },
    onSuccess: async () => {
      setNewBook({ titulo: '', autor: '', preco: '', descricao: '' })
      setFile(null)
      await qc.invalidateQueries({ queryKey: ['editorBooks'] })
    },
  })

  const deleteM = useMutation({
    mutationFn: (id: number) => api<{ message: string }>(`/editor/books/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['editorBooks'] })
    },
  })

  const books = useMemo(() => q.data ?? [], [q.data])

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: 1, minWidth: 340 }}>
        <h1 style={{ marginTop: 0 }}>Livros</h1>
        {q.isLoading ? <p>Carregando…</p> : null}
        {q.isError ? <p className="error">{(q.error as any)?.message}</p> : null}

        {books.length === 0 ? <p className="muted">Sem livros cadastrados.</p> : null}

        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {books.map((b) => (
            <div key={b.id} className="card" style={{ borderRadius: 10, padding: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="row" style={{ alignItems: 'center' }}>
                    {b.imagem_url ? (
                      <img
                        src={b.imagem_url}
                        alt={b.titulo}
                        style={{
                          width: 44,
                          height: 60,
                          objectFit: 'cover',
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 60,
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          background: '#f1f5f9',
                        }}
                      />
                    )}
                    <div>
                      <strong>{b.titulo}</strong>
                      <div className="muted">{b.autor}</div>
                    </div>
                  </div>
                </div>
                <div className="row" style={{ alignItems: 'center' }}>
                  <span className="pill">R$ {b.preco}</span>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => {
                      if (confirm('Remover este livro?')) deleteM.mutate(b.id)
                    }}
                    disabled={deleteM.isPending}
                  >
                    Remover
                  </button>
                </div>
              </div>
              {b.descricao ? (
                <p className="muted" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  {b.descricao}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ flex: 1, minWidth: 340 }}>
        <h2 style={{ marginTop: 0 }}>Cadastrar novo livro</h2>

        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label className="muted">Título</label>
            <input className="input" value={newBook.titulo} onChange={(e) => setNewBook({ ...newBook, titulo: e.target.value })} />
          </div>
          <div>
            <label className="muted">Autor</label>
            <input className="input" value={newBook.autor} onChange={(e) => setNewBook({ ...newBook, autor: e.target.value })} />
          </div>
          <div>
            <label className="muted">Preço</label>
            <input className="input" inputMode="decimal" value={newBook.preco} onChange={(e) => setNewBook({ ...newBook, preco: e.target.value })} />
          </div>
          <div>
            <label className="muted">Descrição</label>
            <textarea className="input" rows={3} value={newBook.descricao} onChange={(e) => setNewBook({ ...newBook, descricao: e.target.value })} />
          </div>
          <div>
            <label className="muted">Imagem (opcional)</label>
            <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>

          <button className="btn" type="button" onClick={() => createM.mutate()} disabled={createM.isPending}>
            {createM.isPending ? 'Cadastrando…' : 'Cadastrar'}
          </button>
          {createM.isError ? <div className="error">{(createM.error as any)?.message}</div> : null}
        </div>
      </div>
    </div>
  )
}
