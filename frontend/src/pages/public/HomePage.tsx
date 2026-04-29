import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { api } from '../../lib/api'
import type { FeedItem, PaginatedResponse } from '../../lib/types'
import { StarRating } from '../../app/components/StarRating'
import { Pagination } from '../../app/components/Pagination'

const statusLabels: Record<string, string> = {
  quero_ler: 'Quero ler',
  lendo: 'Lendo',
  lido: 'Lido'
}

export function HomePage() {
  const [page, setPage] = useState(1)

  const q = useQuery({
    queryKey: ['feed', page],
    queryFn: () => api<PaginatedResponse<FeedItem>>(`/reader/feed?page=${page}&per_page=15`),
  })

  return (
    <div className="feed-container">
      <div className="feed-main-card card">
        <div className="feed-header">
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--primary)' }}>Comunidade Lumina</h1>
          <p className="muted" style={{ fontSize: '1.1rem', marginTop: '4px' }}>Descubra o que outros leitores estão explorando agora.</p>
        </div>

        {q.isLoading ? <p style={{ marginTop: 24, textAlign: 'center' }} className="muted">Sincronizando feed…</p> : null}
        {q.isError ? (
          <p className="error" style={{ marginTop: 24 }}>
            {(q.error as any)?.message ?? 'Erro ao carregar feed'}
          </p>
        ) : null}

        {q.data && q.data.items.length === 0 ? (
          <p style={{ marginTop: 24 }} className="muted">
            Ainda não há leituras no feed. Seja o primeiro a registrar!
          </p>
        ) : null}

        <div className="feed-list">
          {q.data?.items.map((it) => (
            <article key={it.id} className="feed-item card" style={{ border: '1px solid var(--border)', borderRadius: '20px' }}>
              <div className="feed-item-top">
                <div className="feed-item-user" style={{ gap: '12px' }}>
                  <span className="pill primary" style={{ fontWeight: 800, fontSize: '11px' }}>{it.leitor.nome}</span>
                  <span className="pill secondary" style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.8 }}>{statusLabels[it.status] || it.status}</span>
                </div>
                <div className="feed-item-date muted" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {it.criado_em ? new Date(it.criado_em).toLocaleDateString() : ''}
                </div>
              </div>

              <div className="feed-item-content">
                <div className="feed-item-media">
                  <Link to={`/livro/${it.livro.id}`} className="hover-scale">
                    {it.livro.imagem_url ? (
                      <img src={it.livro.imagem_url} alt={it.livro.titulo} className="feed-book-cover" style={{ borderRadius: '14px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
                    ) : (
                      <div className="feed-book-placeholder">📖</div>
                    )}
                  </Link>
                  {it.nota ? (
                    <div className="feed-item-rating">
                      <StarRating rating={it.nota} size={14} />
                    </div>
                  ) : null}
                </div>

                <div className="feed-item-info">
                  <Link to={`/livro/${it.livro.id}`} className="feed-book-title-link">
                    <strong className="link-hover" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{it.livro.titulo}</strong>
                  </Link>
                  <div className="muted" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>{it.livro.autor}</div>
                  {it.comentario ? (
                    <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '16px', fontSize: '14px', lineHeight: '1.6' }}>
                      {it.comentario}
                    </div>
                  ) : (
                    <p className="muted small italic">Nenhuma reflexão compartilhada ainda.</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <Pagination 
          currentPage={page} 
          totalPages={q.data?.pages ?? 1} 
          onPageChange={setPage} 
          isLoading={q.isFetching}
        />
      </div>

      <aside className="feed-sidebar">
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, #1a365d 100%)', 
          border: 'none', 
          padding: '32px',
          color: '#fff',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,32,69,0.2)'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-1px', color: '#fff' }}>Explore a Biblioteca</h2>
          <div className="stack" style={{ marginTop: 24, gap: '20px' }}>
            <div>
              <p style={{ fontSize: '14px', lineHeight: '1.6', opacity: 0.9, margin: 0 }}>
                Navegue pelo catálogo completo de obras na guia de <strong>Livros</strong>. 
              </p>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <div className="stack" style={{ gap: '12px' }}>
              <div className="row" style={{ gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '18px' }}>📖</span>
                <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>Leitores: Gerencie sua coleção.</span>
              </div>
              <div className="row" style={{ gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '18px' }}>🏢</span>
                <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>Editoras: Controle seu acervo.</span>
              </div>
            </div>
            <Link to="/livros" className="btn" style={{ 
              marginTop: '12px', 
              background: '#fff', 
              color: 'var(--primary)', 
              fontWeight: 800, 
              textAlign: 'center',
              borderRadius: '14px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              Ver Catálogo
            </Link>
          </div>
        </div>
        
        <div className="card" style={{ marginTop: '24px', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Dica da Comunidade</h3>
          <p className="muted" style={{ fontSize: '13px', lineHeight: '1.6', marginTop: '12px' }}>
            Compartilhe suas reflexões sobre as leituras! Isso ajuda outros leitores a descobrirem novas obras.
          </p>
        </div>
      </aside>
    </div>
  )
}
