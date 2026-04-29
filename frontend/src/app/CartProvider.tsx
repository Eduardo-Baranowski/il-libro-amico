import { createContext, useContext, useEffect, useState, useMemo } from 'react'

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
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  const totalItems = useMemo(() => items.reduce((acc, it) => acc + (it.quantidade || 0), 0), [items])
  const totalPrice = useMemo(() => items.reduce((acc, it) => acc + (Number(it.preco) || 0) * (it.quantidade || 0), 0), [items])

  const value = useMemo<CartContextValue>(() => ({
    items,
    addItem: (item) => {
      setItems(prev => {
        const existing = prev.find(i => i.id === item.id)
        if (existing) {
          return prev.map(i => i.id === item.id ? { ...i, quantidade: i.quantidade + item.quantidade } : i)
        }
        return [...prev, item]
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
  }), [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider')
  return ctx
}
