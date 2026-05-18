import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { api } from '../../lib/api'
import type { BookEditor, PaginatedResponse } from '../../lib/types'
import { ConfirmModal } from '../../app/components/ConfirmModal'
import { Pagination } from '../../app/components/Pagination'

const GENRES = [
  'Romance',
  'Mistério',
  'Ficção Científica',
  'Fantasia',
  'Terror',
  'História',
  'Biografia',
  'Autoajuda',
  'Técnico',
  'Infantil'
]

function buildFormData(fields: {
  titulo?: string
  autor?: string
  genero?: string
  preco?: string
  estoque?: string
  descricao?: string
  imagem?: File | null
}) {
  const fd = new FormData()
  if (fields.titulo != null) fd.set('titulo', fields.titulo)
  if (fields.autor != null) fd.set('autor', fields.autor)
  if (fields.genero != null) fd.set('genero', fields.genero)
  if (fields.preco != null) fd.set('preco', fields.preco)
  if (fields.estoque != null) fd.set('estoque', fields.estoque)
  if (fields.descricao != null) fd.set('descricao', fields.descricao)
  if (fields.imagem) fd.set('imagem', fields.imagem)
  return fd
}

export function EditorBooksPage() {
  const qc = useQueryClient()
  const [bookToArchive, setBookToArchive] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editingBookId, setEditingBookId] = useState<number | null>(null)
  
  const q = useQuery({
    queryKey: ['editorBooks', page, search],
    queryFn: () => api<PaginatedResponse<BookEditor>>(`/editor/books?page=${page}&per_page=8&q=${search}`),
  })

  const [formBook, setFormBook] = useState({ titulo: '', autor: '', genero: 'Romance', preco: '', estoque: '0', descricao: '' })
  const [file, setFile] = useState<File | null>(null)
  const [stockDraft, setStockDraft] = useState<Record<number, string>>({})

  const submitM = useMutation({
    mutationFn: async () => {
      const fd = buildFormData({ ...formBook, imagem: file })
      if (editingBookId) {
        return await api(`/editor/books/${editingBookId}`, {
          method: 'PUT',
          body: fd,
        })
      } else {
        return await api<{ id: number; message: string }>('/editor/books', {
          method: 'POST',
          body: fd,
        })
      }
    },
    onSuccess: async () => {
      handleCancelEdit()
      toast.success(editingBookId ? 'Livro atualizado com sucesso!' : 'Livro publicado com sucesso!')
      await qc.invalidateQueries({ queryKey: ['editorBooks'] })
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao processar')
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

  const archiveM = useMutation({
    mutationFn: (id: number) => {
      const fd = new FormData()
      fd.set('estoque', '0')
      return api<{ message: string }>(`/editor/books/${id}`, { method: 'PUT', body: fd })
    },
    onSuccess: async () => {
      toast.success('Livro removido do catálogo de vendas')
      setBookToArchive(null)
      await qc.invalidateQueries({ queryKey: ['editorBooks'] })
    },
  })

  const handleEdit = (b: BookEditor) => {
    setEditingBookId(b.id)
    setFormBook({
      titulo: b.titulo,
      autor: b.autor,
      genero: b.genero || 'Romance',
      preco: b.preco,
      estoque: String(b.estoque),
      descricao: b.descricao || ''
    })
    setFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingBookId(null)
    setFormBook({ titulo: '', autor: '', genero: 'Romance', preco: '', estoque: '0', descricao: '' })
    setFile(null)
  }

  const books = useMemo(() => q.data?.items ?? [], [q.data])

  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: '32px' }}>
      <div className="stack" style={{ flex: 2, minWidth: 400, gap: '24px' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--primary)' }}>Gestão do Catálogo</h1>
          <div className="pill primary" style={{ fontWeight: 800 }}>{q.data?.total ?? 0} Obras</div>
        </div>

        <div className="card" style={{ padding: '8px', borderRadius: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <input 
            className="input" 
            placeholder="Pesquisar por título ou autor..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            style={{ background: 'transparent', border: 'none', height: '48px', fontSize: '1rem', padding: '0 16px' }}
          />
        </div>
        
        {q.isLoading ? <p className="muted">Sincronizando acervo…</p> : null}
        {q.isError ? <p className="error">{(q.error as any)?.message}</p> : null}

        <div className="stack" style={{ gap: '20px' }}>
          {books.map((b) => (
            <div key={b.id} className="card" style={{ 
              borderRadius: '24px', 
              padding: '24px', 
              border: editingBookId === b.id ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: editingBookId === b.id ? 'rgba(var(--primary-rgb), 0.02)' : 'var(--surface)'
            }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: '32px' }}>
                <div className="row" style={{ alignItems: 'flex-start', gap: '24px', flex: 1 }}>
                  <div style={{ width: 100, height: 140, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    {b.imagem_url ? (
                      <img src={b.imagem_url} alt={b.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className="feed-book-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📖</div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="row" style={{ gap: '12px', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{b.titulo}</h3>
                      <button 
                        className="btn secondary mini-pill" 
                        style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}
                        onClick={() => handleEdit(b)}
                      >
                        ✏️ Editar
                      </button>
                    </div>
                    <div className="muted" style={{ fontWeight: 600, fontSize: '15px' }}>{b.autor}</div>
                    
                    <div className="row" style={{ marginTop: '20px', gap: '12px', alignItems: 'center' }}>
                       <div className="pill secondary" style={{ fontWeight: 800, fontSize: '13px', padding: '6px 12px' }}>R$ {b.preco}</div>
                       {b.genero && <span className="pill secondary mini-pill" style={{ fontSize: '10px', fontWeight: 700 }}>{b.genero}</span>}
                       <div className={`pill ${b.estoque > 0 ? 'success' : 'error'} mini-pill`} style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '10px' }}>
                          {b.estoque > 0 ? `${b.estoque} em estoque` : 'Esgotado'}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="stack" style={{ gap: '16px', width: '220px' }}>
                  <div className="stack" style={{ gap: '8px' }}>
                    <label className="label" style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.6 }}>Atualizar Estoque</label>
                    <div className="row" style={{ gap: '8px' }}>
                      <input
                        className="input"
                        style={{ height: '44px', flex: 1, textAlign: 'center', borderRadius: '12px', fontWeight: 800 }}
                        inputMode="numeric"
                        value={stockDraft[b.id] ?? String(b.estoque)}
                        onChange={(e) => setStockDraft((d) => ({ ...d, [b.id]: e.target.value }))}
                      />
                      <button
                        className="btn secondary"
                        type="button"
                        style={{ height: '44px', borderRadius: '12px', padding: '0 16px', fontWeight: 800, background: 'var(--primary)', color: '#fff', border: 'none' }}
                        onClick={() => updateStockM.mutate({ id: b.id, estoque: Number(stockDraft[b.id] ?? b.estoque) })}
                        disabled={updateStockM.isPending}
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                  
                  <button
                    className="btn secondary"
                    type="button"
                    style={{ 
                      height: '40px', 
                      borderRadius: '12px', 
                      width: '100%', 
                      color: 'var(--error)', 
                      borderColor: 'rgba(239, 68, 68, 0.1)',
                      background: 'rgba(239, 68, 68, 0.05)',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}
                    onClick={() => setBookToArchive(b.id)}
                    disabled={archiveM.isPending}
                  >
                    Remover do Catálogo
                  </button>
                </div>
              </div>
            </div>
          ))}
          {books.length === 0 && !q.isLoading && (
            <div className="card" style={{ padding: '60px', textAlign: 'center', borderRadius: '24px', border: '2px dashed var(--border)' }}>
               <p className="muted" style={{ fontWeight: 600 }}>Nenhum livro encontrado para sua pesquisa.</p>
            </div>
          )}

          <Pagination 
            currentPage={page} 
            totalPages={q.data?.pages ?? 1} 
            onPageChange={setPage} 
            isLoading={q.isFetching} 
          />
        </div>
      </div>

      {/* Cadastro/Edição Sidebar */}
      <div className="card" style={{ 
        flex: 1, 
        minWidth: 360, 
        height: 'fit-content', 
        position: 'sticky', 
        top: '100px', 
        borderRadius: '28px',
        padding: '32px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
        border: editingBookId ? '2px solid var(--primary)' : '1px solid var(--border)'
      }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
            {editingBookId ? '✏️ Editar Obra' : '✨ Publicar Obra'}
          </h2>
          {editingBookId && (
            <button className="btn secondary mini-pill" onClick={handleCancelEdit}>Cancelar</button>
          )}
        </div>
        <p className="muted small" style={{ marginBottom: '24px' }}>
          {editingBookId ? 'Atualize as informações da obra no catálogo.' : 'Insira os detalhes para disponibilizar o livro no catálogo global.'}
        </p>

        <div className="stack" style={{ gap: '20px' }}>
          <div>
            <label className="label">Título da Obra</label>
            <input className="input" placeholder="ex: O Alquimista" value={formBook.titulo} onChange={(e) => setFormBook({ ...formBook, titulo: e.target.value })} style={{ borderRadius: '12px' }} />
          </div>
          <div>
            <label className="label">Autor / Escritor</label>
            <input className="input" placeholder="Nome do autor" value={formBook.autor} onChange={(e) => setFormBook({ ...formBook, autor: e.target.value })} style={{ borderRadius: '12px' }} />
          </div>
          <div>
            <label className="label">Gênero Literário</label>
            <select className="input" value={formBook.genero} onChange={(e) => setFormBook({ ...formBook, genero: e.target.value })} style={{ borderRadius: '12px', height: '48px', fontWeight: 700 }}>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="row" style={{ gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Preço (R$)</label>
              <input className="input" placeholder="0.00" inputMode="decimal" value={formBook.preco} onChange={(e) => setFormBook({ ...formBook, preco: e.target.value })} style={{ borderRadius: '12px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Estoque Atual</label>
              <input className="input" placeholder="0" inputMode="numeric" value={formBook.estoque} onChange={(e) => setFormBook({ ...formBook, estoque: e.target.value })} style={{ borderRadius: '12px' }} />
            </div>
          </div>
          <div>
            <label className="label">Sinopse / Descrição</label>
            <textarea className="input" rows={6} placeholder="Breve resumo da obra..." value={formBook.descricao} onChange={(e) => setFormBook({ ...formBook, descricao: e.target.value })} style={{ borderRadius: '12px', resize: 'none' }} />
          </div>
          <div>
            <label className="label">Capa do Livro {editingBookId && '(Opcional se não mudar)'}</label>
            <div className="search-card" style={{ padding: '16px', borderStyle: 'dashed', borderRadius: '16px', textAlign: 'center' }}>
               <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: '12px' }} />
            </div>
          </div>

          <button className="btn" type="button" style={{ height: '56px', fontSize: '1.1rem', fontWeight: 900, borderRadius: '16px', marginTop: '12px' }} onClick={() => submitM.mutate()} disabled={submitM.isPending}>
            {submitM.isPending ? 'Processando…' : editingBookId ? 'Salvar Alterações' : '🚀 Publicar no Catálogo'}
          </button>
        </div>
      </div>

      <ConfirmModal 
        isOpen={bookToArchive !== null}
        title="Remover do Catálogo"
        message="Deseja remover este livro das vendas? Ele continuará no sistema para preservar o histórico dos leitores, mas ficará com estoque zerado."
        confirmLabel="Sim, Remover"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={() => bookToArchive && archiveM.mutate(bookToArchive)}
        onCancel={() => setBookToArchive(null)}
      />
    </div>
  )
}
