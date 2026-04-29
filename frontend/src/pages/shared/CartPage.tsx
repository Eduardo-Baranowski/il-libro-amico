import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../app/CartProvider'

export function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛒</div>
        <h2>Seu carrinho está vazio</h2>
        <p className="muted">Que tal explorar alguns livros incríveis?</p>
        <Link to="/livros" className="btn" style={{ marginTop: '24px', display: 'inline-block' }}>Ver Catálogo</Link>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '32px' }}>Meu Carrinho</h1>
      
      <div className="settings-grid" style={{ gridTemplateColumns: '1fr 340px' }}>
        <div className="stack" style={{ gap: '16px' }}>
          {items.map(it => (
            <div key={it.id} className="settings-card" style={{ padding: '16px', display: 'flex', gap: '20px', alignItems: 'center', marginBottom: 0 }}>
              <img src={it.imagem_url || ''} alt={it.titulo} style={{ width: '60px', height: '90px', borderRadius: '8px', objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0 }}>{it.titulo}</h4>
                <div className="muted" style={{ fontWeight: 700, marginTop: '4px' }}>R$ {(it.preco || 0).toFixed(2)}</div>
              </div>
              <div className="row" style={{ alignItems: 'center', gap: '12px' }}>
                <div className="row" style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '4px' }}>
                  <button className="btn secondary" style={{ padding: '4px 10px', minHeight: 'unset' }} onClick={() => updateQuantity(it.id, -1)}>-</button>
                  <span style={{ width: '30px', textAlign: 'center', fontWeight: 700 }}>{it.quantidade}</span>
                  <button className="btn secondary" style={{ padding: '4px 10px', minHeight: 'unset' }} onClick={() => updateQuantity(it.id, 1)}>+</button>
                </div>
                <button 
                  className="btn secondary" 
                  style={{ color: 'var(--error)', border: 'none' }}
                  onClick={() => removeItem(it.id)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="settings-card" style={{ height: 'fit-content', position: 'sticky', top: '100px' }}>
          <h3>Resumo</h3>
          <div className="stack" style={{ gap: '12px', marginTop: '20px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Subtotal</span>
              <strong>R$ {(totalPrice || 0).toFixed(2)}</strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Entrega</span>
              <span className="success">Grátis</span>
            </div>
            <div className="dropdown-divider"></div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: '1.2rem' }}>
              <strong>Total</strong>
              <strong style={{ color: 'var(--primary)' }}>R$ {(totalPrice || 0).toFixed(2)}</strong>
            </div>
            <button 
              className="btn" 
              style={{ width: '100%', marginTop: '12px', padding: '16px' }}
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
