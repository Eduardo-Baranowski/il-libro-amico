import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../app/CartProvider'

export function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛒</div>
        <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>Seu carrinho está vazio</h2>
        <p className="muted" style={{ fontSize: '1.1rem', fontWeight: 600 }}>Que tal explorar alguns livros incríveis?</p>
        <Link to="/livros" className="btn" style={{ marginTop: '24px', display: 'inline-block', padding: '0 40px', height: '56px', lineHeight: '56px', borderRadius: '16px', fontWeight: 800 }}>Ver Catálogo</Link>
      </div>
    )
  }

  return (
    <div className="card-container">
      <h1 style={{ marginBottom: '40px', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1.5px' }}>Meu Carrinho</h1>
      
      <div className="row" style={{ alignItems: 'flex-start', gap: '32px' }}>
        <div className="stack" style={{ flex: 1, gap: '16px' }}>
          {items.map(it => (
            <div key={it.id} className="card" style={{ padding: '24px', display: 'flex', gap: '24px', alignItems: 'center', borderRadius: '24px' }}>
              <div style={{ width: '80px', height: '120px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.08)', background: 'var(--surface-2)' }}>
                {it.imagem_url ? (
                  <img src={it.imagem_url} alt={it.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="feed-book-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📖</div>
                )}
              </div>
              
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{it.titulo}</h4>
                <div className="muted" style={{ fontWeight: 700, marginTop: '4px' }}>R$ {(it.preco || 0).toFixed(2)}</div>
              </div>

              <div className="row" style={{ alignItems: 'center', gap: '24px' }}>
                <div className="row" style={{ background: 'var(--surface-2)', borderRadius: '14px', padding: '6px', alignItems: 'center' }}>
                  <button 
                    className="btn secondary" 
                    style={{ padding: 0, width: '32px', height: '32px', minHeight: 'unset', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 900 }} 
                    onClick={() => updateQuantity(it.id, -1)}
                  >-</button>
                  <span style={{ width: '40px', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem' }}>{it.quantidade}</span>
                  <button 
                    className="btn secondary" 
                    style={{ padding: 0, width: '32px', height: '32px', minHeight: 'unset', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 900 }} 
                    onClick={() => updateQuantity(it.id, 1)}
                  >+</button>
                </div>
                
                <button 
                  className="btn secondary" 
                  style={{ color: 'var(--error)', border: 'none', background: 'transparent', fontWeight: 800, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  onClick={() => removeItem(it.id)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="card" style={{ width: '360px', height: 'fit-content', position: 'sticky', top: '100px', borderRadius: '28px', padding: '32px' }}>
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Resumo</h3>
          <div className="stack" style={{ gap: '16px', marginTop: '24px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontWeight: 600 }}>Subtotal</span>
              <strong style={{ fontWeight: 800 }}>R$ {(totalPrice || 0).toFixed(2)}</strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontWeight: 600 }}>Entrega</span>
              <span className="success" style={{ fontWeight: 800 }}>Grátis</span>
            </div>
            <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }}></div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: '1.4rem' }}>
              <strong style={{ fontWeight: 900 }}>Total</strong>
              <strong style={{ color: 'var(--primary)', fontWeight: 900 }}>R$ {(totalPrice || 0).toFixed(2)}</strong>
            </div>
            <button 
              className="btn" 
              style={{ width: '100%', marginTop: '16px', height: '64px', borderRadius: '18px', fontSize: '1.2rem', fontWeight: 900 }}
              onClick={() => navigate('/checkout')}
            >
              Finalizar Compra
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
