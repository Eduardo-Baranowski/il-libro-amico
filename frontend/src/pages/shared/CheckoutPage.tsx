import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useCart } from '../../app/CartProvider'
import { api } from '../../lib/api'

export function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  
  const [address, setAddress] = useState({
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: ''
  })

  const orderM = useMutation({
    mutationFn: () => api('/reader/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map(it => ({ livro_id: it.id, quantidade: it.quantidade })),
        ...address,
        metodo_pagamento: 'Cartão de Crédito (Simulado)'
      })
    }),
    onSuccess: () => {
      clearCart()
      setStep(3)
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao processar pedido.')
  })

  const handleNext = () => {
    if (step === 1) {
      if (!address.rua || !address.numero || !address.cep) {
        return toast.error('Por favor, preencha os campos obrigatórios de endereço.')
      }
      setStep(2)
    }
  }

  if (items.length === 0 && step !== 3) {
    navigate('/carrinho')
    return null
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      {/* Stepper */}
      <div className="row" style={{ justifyContent: 'center', gap: '40px', marginBottom: '40px' }}>
        <div style={{ textAlign: 'center', opacity: step >= 1 ? 1 : 0.4 }}>
          <div className="avatar-circle" style={{ margin: '0 auto 8px', background: step >= 1 ? 'var(--primary)' : 'var(--surface-2)', color: step >= 1 ? '#fff' : 'inherit' }}>1</div>
          <small style={{ fontWeight: 700 }}>Endereço</small>
        </div>
        <div style={{ textAlign: 'center', opacity: step >= 2 ? 1 : 0.4 }}>
          <div className="avatar-circle" style={{ margin: '0 auto 8px', background: step >= 2 ? 'var(--primary)' : 'var(--surface-2)', color: step >= 2 ? '#fff' : 'inherit' }}>2</div>
          <small style={{ fontWeight: 700 }}>Pagamento</small>
        </div>
        <div style={{ textAlign: 'center', opacity: step >= 3 ? 1 : 0.4 }}>
          <div className="avatar-circle" style={{ margin: '0 auto 8px', background: step >= 3 ? 'var(--primary)' : 'var(--surface-2)', color: step >= 3 ? '#fff' : 'inherit' }}>3</div>
          <small style={{ fontWeight: 700 }}>Sucesso</small>
        </div>
      </div>

      <div className="settings-card" style={{ padding: '40px' }}>
        {step === 1 && (
          <div className="stack" style={{ gap: '20px' }}>
            <h2>Endereço de Entrega</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '20px' }}>
               <div>
                 <label className="label">Rua / Logradouro</label>
                 <input className="input" value={address.rua} onChange={e => setAddress({...address, rua: e.target.value})} placeholder="Ex: Av. Paulista" />
               </div>
               <div>
                 <label className="label">Número</label>
                 <input className="input" value={address.numero} onChange={e => setAddress({...address, numero: e.target.value})} placeholder="123" />
               </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
               <div>
                 <label className="label">Bairro</label>
                 <input className="input" value={address.bairro} onChange={e => setAddress({...address, bairro: e.target.value})} placeholder="Centro" />
               </div>
               <div>
                 <label className="label">CEP</label>
                 <input className="input" value={address.cep} onChange={e => setAddress({...address, cep: e.target.value})} placeholder="00000-000" />
               </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '20px' }}>
               <div>
                 <label className="label">Cidade</label>
                 <input className="input" value={address.cidade} onChange={e => setAddress({...address, cidade: e.target.value})} placeholder="São Paulo" />
               </div>
               <div>
                 <label className="label">Estado</label>
                 <input className="input" value={address.estado} onChange={e => setAddress({...address, estado: e.target.value})} placeholder="SP" maxLength={2} />
               </div>
            </div>
            <button className="btn" style={{ marginTop: '20px' }} onClick={handleNext}>Próximo Passo</button>
          </div>
        )}

        {step === 2 && (
          <div className="stack" style={{ gap: '24px' }}>
            <h2>Revisão e Pagamento</h2>
            <div className="settings-card" style={{ background: 'var(--surface-2)', border: 'none' }}>
               <div style={{ marginBottom: '16px' }}>
                 <h4 style={{ marginBottom: '8px' }}>Itens do Pedido:</h4>
                 {items.map(it => (
                   <div key={it.id} className="row" style={{ justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                     <span>{it.quantidade}x {it.titulo}</span>
                     <span>R$ {(it.preco * it.quantidade).toFixed(2)}</span>
                   </div>
                 ))}
               </div>
               <div className="dropdown-divider"></div>
               <div style={{ marginTop: '12px' }}>
                 <strong>Total a pagar: R$ {(totalPrice || 0).toFixed(2)}</strong>
               </div>
               <p className="muted" style={{ fontSize: '13px', marginTop: '12px' }}>
                 O pagamento está em modo de simulação. Ao clicar em finalizar, o pedido será processado.
               </p>
            </div>
            <div className="row" style={{ gap: '12px' }}>
               <button className="btn secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>Voltar</button>
               <button className="btn" style={{ flex: 2 }} onClick={() => orderM.mutate()} disabled={orderM.isPending}>
                 {orderM.isPending ? 'Processando...' : 'Finalizar Pedido'}
               </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack" style={{ textAlign: 'center', gap: '20px' }}>
             <div style={{ fontSize: '64px' }}>🎉</div>
             <h2>Pedido Confirmado!</h2>
             <p className="muted">Seu pedido foi registrado com sucesso e está sendo processado.</p>
             <button className="btn" onClick={() => navigate('/')}>Voltar para a Home</button>
          </div>
        )}
      </div>
    </div>
  )
}
