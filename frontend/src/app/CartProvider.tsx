import { createContext, useContext, useEffect, useState, useMemo } from 'react'

import { useAuth } from './AuthProvider'

export interface CartItem {
  id: number
  titulo: string
  preco: number
  imagem_url: string | null
  quantidade: number
}

interface CartContextValue {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: number) => void
  updateQuantity: (id: number, delta: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth()

  // Carregamento inicial com higienização
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart')
    if (!saved) return []
    try {
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) return []
      
      return parsed.map((it: any) => {
        const rawPreco = String(it.preco || '0')
        return {
          ...it,
          preco: parseFloat(rawPreco.replace(',', '.')),
          quantidade: Number(it.quantidade) || 1
        }
      })
    } catch {
      return []
    }
  })

  // Sincroniza com localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  // Carrinho é exclusivo do perfil leitor
  useEffect(() => {
    if (auth.role && auth.role !== 'leitor') {
      setItems([])
    }
  }, [auth.role])

  // Cálculos de totais
  const totalItems = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.quantidade || 0), 0)
  }, [items])

  const totalPrice = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.preco * it.quantidade), 0)
  }, [items])

  // Ações do carrinho
  const value = useMemo<CartContextValue>(() => ({
    items,
    totalItems,
    totalPrice,
    addItem: (item) => {
      const rawPreco = String(item.preco || '0')
      const cleanPrice = parseFloat(rawPreco.replace(',', '.'))
      const newItem = { ...item, preco: cleanPrice || 0 }

      setItems(prev => {
        const existing = prev.find(i => i.id === newItem.id)
        if (existing) {
          return prev.map(i => i.id === newItem.id ? { ...i, quantidade: i.quantidade + newItem.quantidade } : i)
        }
        return [...prev, newItem]
      })
    },
    removeItem: (id) => {
      setItems(prev => prev.filter(i => i.id !== id))
    },
    updateQuantity: (id, delta) => {
      setItems(prev => prev.map(i => {
        if (i.id === id) {
          const newQty = Math.max(1, i.quantidade + delta)
          return { ...i, quantidade: newQty }
        }
        return i
      }))
    },
    clearCart: () => setItems([])
  }), [items, totalItems, totalPrice])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider')
  return ctx
}
