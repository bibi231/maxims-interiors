// src/components/CartDrawer.jsx
// Floating cart button + slide-over cart. Ends in "Request order / quote"
// (no payment). "Pay now" only appears when the server has payments enabled.
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, X, Minus, Plus, Trash2, Send, FileText } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { getStorageUrl, BUCKETS } from '@/lib/storage'
import { formatNaira } from '@/lib/utils'

export default function CartDrawer() {
  const { items, count, subtotal, setQty, remove, drawerOpen, openDrawer, closeDrawer, openRequest } = useCart()
  const { pathname } = useLocation()
  if (pathname.startsWith('/admin')) return null

  return (
    <>
      <AnimatePresence>
        {count > 0 && !drawerOpen && (
          <motion.button
            key="cart-fab"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            onClick={openDrawer}
            aria-label="Open cart"
            className="fixed bottom-5 left-5 z-[150] flex items-center gap-3 bg-purple-rich text-cream-soft border border-gold/30 shadow-2xl px-4 py-3 hover:border-gold transition-colors"
          >
            <span className="relative">
              <ShoppingBag size={18} className="text-gold" />
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-gold text-purple-darkest rounded-full text-[0.74rem] font-black flex items-center justify-center">{count}</span>
            </span>
            <span className="font-title text-[0.74rem] tracking-[0.18em] uppercase">Cart</span>
            <span className="font-body text-sm font-semibold text-gold-light">{formatNaira(subtotal)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/60 z-[300]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDrawer} />
            <motion.aside
              role="dialog" aria-label="Your cart"
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-cream-soft dark:bg-charcoal z-[301] flex flex-col shadow-2xl"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.28 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gold/20">
                <div>
                  <p className="eyebrow text-[0.76rem]">Your selection</p>
                  <h2 className="font-display text-2xl text-purple-rich dark:text-gold-light">Cart</h2>
                </div>
                <button onClick={closeDrawer} aria-label="Close cart" className="p-2 text-charcoal-muted hover:text-gold"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {items.length === 0 ? (
                  <p className="font-body text-sm text-charcoal-muted text-center py-16">Your cart is empty.</p>
                ) : items.map((i) => (
                  <div key={i.id} className="flex gap-3 bg-card border border-gold/10 p-3">
                    <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-cream to-cream-dark overflow-hidden flex items-center justify-center">
                      {i.cover_image
                        ? <img src={getStorageUrl(BUCKETS.products, i.cover_image)} alt="" className="w-full h-full object-cover" />
                        : <ShoppingBag size={18} className="text-gold/85" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-editorial text-[0.9rem] text-charcoal dark:text-cream-soft truncate">{i.name}</p>
                      <p className="font-title text-[0.84rem] text-purple-rich dark:text-gold-light mt-0.5">{formatNaira(i.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Decrease quantity" className="w-7 h-7 border border-gold/25 flex items-center justify-center hover:border-gold"><Minus size={12} /></button>
                        <span className="font-body text-sm w-6 text-center">{i.qty}</span>
                        <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Increase quantity" className="w-7 h-7 border border-gold/25 flex items-center justify-center hover:border-gold"><Plus size={12} /></button>
                        <button onClick={() => remove(i.id)} aria-label="Remove item" className="ml-auto p-1.5 text-charcoal-muted hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {items.length > 0 && (
                <div className="border-t border-gold/20 px-5 py-4 space-y-3 bg-card">
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-charcoal-muted">Subtotal</span>
                    <span className="font-title text-purple-rich dark:text-gold-light font-semibold">{formatNaira(subtotal)}</span>
                  </div>
                  <p className="font-body text-[0.8rem] text-charcoal-muted leading-relaxed">
                    Delivery is confirmed by our team. No payment is taken now: send your request and we will contact you to confirm availability, delivery and payment.
                  </p>
                  <button onClick={() => openRequest({ kind: 'order', source: 'cart' })} className="btn-maxims btn-gold-solid w-full justify-center">
                    <Send size={14} /> Request order
                  </button>
                  <button onClick={() => openRequest({ kind: 'quote', source: 'cart' })} className="btn-maxims btn-outline-gold w-full justify-center">
                    <FileText size={14} /> Request a quote instead
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
