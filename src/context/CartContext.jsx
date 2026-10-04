import { createContext, useContext } from 'react'

export const cartContext = createContext(null)

export function useCart() {
  const ctx = useContext(cartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
