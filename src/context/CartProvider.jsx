// src/context/CartContext.jsx
// Site-wide cart (persisted in localStorage) + the order/quote request modal.
// Payments are off until the gateway keys are live, so the cart ends in a
// "Request order / quote" form. When the server reports payments_enabled,
// the cart also offers "Pay now" (existing Squad/Paystack path).
import { useEffect, useMemo, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { cartContext as CartContext } from './CartContext'

const KEY = 'maxims_cart_v1'

function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // request = null | { kind: 'order'|'quote', source, product?, service? }
  const [request, setRequest] = useState(null)
  const [paymentsEnabled, setPaymentsEnabled] = useState(false)

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* ignore */ } }, [items])
  useEffect(() => {
    api.get('/config').then((c) => setPaymentsEnabled(Boolean(c?.payments_enabled))).catch(() => setPaymentsEnabled(false))
  }, [])

  const add = useCallback((p, qty = 1) => {
    setItems((cur) => {
      const found = cur.find((i) => i.id === p.id)
      if (found) return cur.map((i) => (i.id === p.id ? { ...i, qty: Math.min(i.qty + qty, 999) } : i))
      return [...cur, { id: p.id, name: p.name, slug: p.slug, price: Number(p.price) || 0, cover_image: p.cover_image, qty }]
    })
  }, [])
  const setQty = useCallback((id, qty) => setItems((cur) => (qty <= 0 ? cur.filter((i) => i.id !== id) : cur.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, 999) } : i)))), [])
  const remove = useCallback((id) => setItems((cur) => cur.filter((i) => i.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])

  const value = useMemo(() => ({
    items, add, setQty, remove, clear,
    count: items.reduce((s, i) => s + i.qty, 0),
    subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
    drawerOpen, openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false),
    request, openRequest: (r) => { setDrawerOpen(false); setRequest(r) }, closeRequest: () => setRequest(null),
    paymentsEnabled,
  }), [items, add, setQty, remove, clear, drawerOpen, request, paymentsEnabled])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
