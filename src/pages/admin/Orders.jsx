// src/pages/admin/Orders.jsx
// Orders + quote requests. Workflow:
//   new -> contacted -> awaiting payment -> paid / confirmed -> delivered | cancelled
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Eye, X, User, Phone, Mail, MapPin, MessageCircle, FileText, ShoppingBag, StickyNote, Clock, Link2, Send, Copy, Check } from 'lucide-react'
import { api } from '@/lib/api'
import AdminLayout from '@/components/admin/AdminLayout'
import { useOrders, updateOrder } from '@/hooks/useData'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'

const WORKFLOW = ['new', 'contacted', 'awaiting_payment', 'paid', 'confirmed', 'delivered', 'cancelled']
const LABEL = {
  new: 'New', contacted: 'Contacted', awaiting_payment: 'Awaiting payment', paid: 'Paid', confirmed: 'Confirmed',
  delivered: 'Delivered', cancelled: 'Cancelled', pending: 'Pending (old)', processing: 'Processing (old)', shipped: 'Shipped (old)', refunded: 'Refunded',
}
const STATUS_STYLE = {
  new:              'text-gold bg-gold/10 border-gold/30',
  contacted:        'text-blue-400 bg-blue-400/10 border-blue-400/25',
  awaiting_payment: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25',
  paid:             'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  confirmed:        'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  delivered:        'text-green-400 bg-green-400/10 border-green-400/25',
  cancelled:        'text-red-400 bg-red-400/10 border-red-400/25',
  pending:          'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  processing:       'text-gold bg-gold/10 border-gold/20',
  shipped:          'text-blue-400 bg-blue-400/10 border-blue-400/20',
  refunded:         'text-cream-soft/75 bg-cream-soft/5 border-cream-soft/10',
}
const fmt = n => '₦' + Number(n || 0).toLocaleString()
const kindOf = o => (o.kind === 'quote' ? 'quote' : 'order')
const waLink = phone => {
  let d = String(phone || '').replace(/\D/g, '')
  if (d.startsWith('0')) d = '234' + d.slice(1)
  return `https://wa.me/${d}`
}

function StatusPill({ status }) {
  return (
    <span className={cn('inline-block font-body text-[0.76rem] tracking-wider uppercase px-2 py-0.5 border whitespace-nowrap', STATUS_STYLE[status] || '')}>
      {LABEL[status] || status}
    </span>
  )
}

function KindPill({ kind }) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-body text-[0.76rem] tracking-wider uppercase px-1.5 py-0.5',
      kind === 'quote' ? 'text-purple-light bg-purple-light/10' : 'text-cream-soft/85 bg-cream-soft/5')}>
      {kind === 'quote' ? <FileText size={10} /> : <ShoppingBag size={10} />} {kind}
    </span>
  )
}

// Payment: quote amount (quotes), customer pay link (copy / email), status.
function PaymentPanel({ order, onUpdated, canWrite }) {
  const [quote, setQuote] = useState(order.kind === 'quote' && order.total ? String(order.total - Number(order.delivery_fee || 0)) : '')
  const [link, setLink] = useState(null)
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState(false)
  const { addToast } = useToast()
  const paid = order.payment_status === 'paid'

  async function getLink(send) {
    setBusy(send ? 'send' : 'link')
    try {
      const r = await api.post(`/orders/${order.id}/payment-link`, { send })
      setLink(r)
      if (send) addToast({ type: r.emailed ? 'success' : 'error', message: r.emailed ? 'Payment link emailed to the customer' : 'Email failed. Copy the link and send it by WhatsApp.' })
      if (send) onUpdated()
    } catch (e) { addToast({ type: 'error', message: e.message }) }
    setBusy('')
  }
  async function saveQuote() {
    setBusy('quote')
    try { await onUpdated({ quoted_total: Number(quote) }) } finally { setBusy('') }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link.url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { window.prompt('Copy this link:', link.url) }
  }

  return (
    <section>
      <h3 className="font-title text-[0.8rem] tracking-[0.2em] uppercase text-gold mb-2">Payment</h3>
      <div className="bg-charcoal border border-gold/15 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 font-body text-[0.92rem] text-cream-soft/85">
          <span className={cn('font-bold uppercase text-[0.84rem] tracking-wide px-2 py-1 border', paid ? 'text-green-400 border-green-400/40 bg-green-400/10' : 'text-amber-400 border-amber-400/40 bg-amber-400/10')}>{paid ? 'Paid' : 'Unpaid'}</span>
          {paid && order.payment_ref && <span className="break-all">Ref {order.payment_ref}{order.payment_method ? ` · ${order.payment_method}` : ''}</span>}
          {!paid && <span>Amount due: <strong className="text-gold">{fmt(order.total)}</strong></span>}
        </div>
        {canWrite && !paid && order.kind === 'quote' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <label htmlFor="qamt" className="sr-only">Quote amount</label>
            <input id="qamt" inputMode="numeric" value={quote} onChange={e => setQuote(e.target.value.replace(/[^\d]/g, ''))} placeholder="Quoted amount (₦)"
              className="flex-1 min-h-[44px] bg-charcoal-mid border border-gold/20 px-3 font-body text-[0.95rem] text-cream-soft focus:outline-none focus:border-gold/60" />
            <button onClick={saveQuote} disabled={!quote || busy === 'quote'} className="min-h-[44px] px-4 border border-gold/40 text-gold font-title text-[0.76rem] tracking-[0.12em] uppercase hover:bg-gold/10 disabled:opacity-40">{busy === 'quote' ? 'Saving...' : 'Set quote amount'}</button>
          </div>
        )}
        {canWrite && !paid && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => getLink(false)} disabled={!!busy} className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 border border-gold/30 text-cream-soft/90 font-title text-[0.76rem] tracking-[0.12em] uppercase hover:text-gold"><Link2 size={14} /> Get pay link</button>
            <button onClick={() => getLink(true)} disabled={!!busy || !(order.total > 0)} className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 bg-gold/15 border border-gold/40 text-gold font-title text-[0.76rem] tracking-[0.12em] uppercase hover:bg-gold/25 disabled:opacity-40"><Send size={14} /> {busy === 'send' ? 'Sending...' : 'Email pay link'}</button>
          </div>
        )}
        {link && (
          <div className="space-y-1.5">
            {!link.payments_enabled && <p className="font-body text-[0.95rem] text-amber-400">Online payments are switched off on the server (PAYMENTS_ENABLED / Squad keys). The link shows the amount but no pay button yet.</p>}
            <div className="flex flex-col sm:flex-row gap-2">
              <input readOnly value={link.url} onFocus={e => e.target.select()} aria-label="Customer pay link" className="flex-1 min-h-[44px] bg-charcoal-mid border border-gold/20 px-3 font-body text-[0.9rem] text-cream-soft" />
              <button onClick={copy} className="min-h-[44px] px-4 inline-flex items-center justify-center gap-2 border border-gold/40 text-gold font-title text-[0.76rem] tracking-[0.12em] uppercase">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function OrderDetailModal({ order: initial, onClose, onSaved, canWrite }) {
  const [order, setOrder] = useState(initial)
  const [status, setStatus] = useState(initial.status)
  const [note, setNote] = useState('')
  const [fee, setFee] = useState(initial.delivery_fee ? String(initial.delivery_fee) : '')
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  async function save(patch) {
    setSaving(true)
    try {
      const updated = await updateOrder(order.id, patch)
      setOrder(updated); setStatus(updated.status); setNote('')
      onSaved()
      addToast({ type: 'success', message: 'Saved' })
    } catch (e) {
      addToast({ type: 'error', message: e.message || 'Could not save' })
    } finally { setSaving(false) }
  }

  const contact = [
    [User, order.customer_name],
    [Phone, order.customer_phone, order.customer_phone && `tel:${order.customer_phone}`],
    [Mail, order.customer_email, `mailto:${order.customer_email}?subject=${encodeURIComponent(`Your Maxims ${kindOf(order)} ${order.order_number}`)}`],
    [MapPin, [order.delivery_address, order.city, order.state].filter(Boolean).join(', ')],
  ].filter(([, v]) => v)

  const statusChanged = status !== order.status
  const feeChanged = fee !== '' && Number(fee) !== Number(order.delivery_fee || 0)

  return (
    <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full sm:max-w-[640px] bg-charcoal-mid border border-gold/15 max-h-[92vh] overflow-y-auto"
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-charcoal-mid flex items-start justify-between px-5 sm:px-6 py-4 border-b border-gold/10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-title text-[0.95rem] tracking-[0.15em] text-gold">{order.order_number}</span>
              <KindPill kind={kindOf(order)} />
              <StatusPill status={order.status} />
            </div>
            <div className="font-body text-[0.8rem] text-cream-soft/70 mt-1">
              {new Date(order.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
              {order.source ? ` · via ${order.source}` : ''}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-cream-soft/75 hover:text-gold"><X size={18} /></button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Customer + quick actions */}
          <section>
            <h3 className="font-title text-[0.76rem] tracking-[0.25em] uppercase text-gold/85 mb-2">Customer</h3>
            <div className="bg-charcoal border border-gold/8 p-4 space-y-2">
              {contact.map(([Icon, val, href], i) => (
                <div key={i} className="flex items-center gap-2.5 min-w-0">
                  <Icon size={13} className="text-cream-soft/70 shrink-0" />
                  {href ? <a href={href} className="font-body text-[0.95rem] text-cream-soft/75 hover:text-gold truncate">{val}</a>
                        : <span className="font-body text-[0.95rem] text-cream-soft/75">{val}</span>}
                </div>
              ))}
              <div className="font-body text-[0.8rem] text-cream-soft/75 pt-1">
                Prefers: <span className="text-gold/80 capitalize">{order.preferred_contact || 'phone'}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {order.customer_phone && <a href={`tel:${order.customer_phone}`} className="flex items-center justify-center gap-1.5 border border-gold/15 py-2 font-body text-[0.8rem] text-cream-soft/70 hover:border-gold/50 hover:text-gold"><Phone size={13} /> Call</a>}
              {order.customer_phone && <a href={waLink(order.customer_phone)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 border border-gold/15 py-2 font-body text-[0.8rem] text-cream-soft/70 hover:border-gold/50 hover:text-gold"><MessageCircle size={13} /> WhatsApp</a>}
              <a href={`mailto:${order.customer_email}`} className="flex items-center justify-center gap-1.5 border border-gold/15 py-2 font-body text-[0.8rem] text-cream-soft/70 hover:border-gold/50 hover:text-gold"><Mail size={13} /> Email</a>
            </div>
          </section>

          {order.service && (
            <section>
              <h3 className="font-title text-[0.76rem] tracking-[0.25em] uppercase text-gold/85 mb-2">Service requested</h3>
              <p className="font-body text-[0.95rem] text-cream-soft/75 bg-charcoal border border-gold/8 p-4">{order.service}</p>
            </section>
          )}

          {(order.items || []).length > 0 && (
            <section>
              <h3 className="font-title text-[0.76rem] tracking-[0.25em] uppercase text-gold/85 mb-2">Items</h3>
              <div className="bg-charcoal border border-gold/8 divide-y divide-gold/5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="font-body text-[0.95rem] text-cream-soft/75 truncate">{item.name}</div>
                      <div className="font-body text-[0.76rem] text-cream-soft/70">Qty {item.qty} × {fmt(item.price)}</div>
                    </div>
                    <div className="font-title text-[0.9rem] text-gold/75 whitespace-nowrap">{fmt(item.price * item.qty)}</div>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 font-body text-[0.9rem] text-cream-soft/80"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
                <div className="flex justify-between px-4 py-2.5 font-body text-[0.9rem] text-cream-soft/80"><span>Delivery</span><span>{order.delivery_fee ? fmt(order.delivery_fee) : 'To confirm'}</span></div>
                <div className="flex justify-between px-4 py-3 bg-gold/5"><span className="font-title text-[0.76rem] tracking-wider uppercase text-gold/70">Total</span><span className="font-title text-[0.95rem] text-gold">{fmt(order.total)}</span></div>
              </div>
            </section>
          )}

          <PaymentPanel order={order} canWrite={canWrite} onUpdated={async (patch) => {
            if (patch) { await save(patch) } else { onSaved() }
          }} />

          {order.notes && (
            <section>
              <h3 className="font-title text-[0.76rem] tracking-[0.25em] uppercase text-gold/85 mb-2">Customer notes</h3>
              <p className="font-body text-[0.95rem] text-cream-soft/85 bg-charcoal border border-gold/8 p-4 whitespace-pre-wrap">{order.notes}</p>
            </section>
          )}

          {canWrite && (
            <section>
              <h3 className="font-title text-[0.76rem] tracking-[0.25em] uppercase text-gold/85 mb-2">Status</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WORKFLOW.map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={cn('px-2 py-2.5 font-title text-[0.76rem] tracking-[0.1em] uppercase border transition-all',
                      status === s ? STATUS_STYLE[s] : 'border-gold/10 text-cream-soft/75 hover:border-gold/30')}>
                    {LABEL[s]}
                  </button>
                ))}
              </div>
              {(order.items || []).length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <label htmlFor="fee" className="font-body text-[0.84rem] text-cream-soft/80 whitespace-nowrap">Delivery fee (₦)</label>
                  <input id="fee" inputMode="numeric" value={fee} onChange={e => setFee(e.target.value.replace(/[^\d]/g, ''))} placeholder="0"
                    className="flex-1 bg-charcoal border border-gold/12 px-3 py-2 font-body text-[0.95rem] text-cream-soft focus:outline-none focus:border-gold/45" />
                </div>
              )}
              <button onClick={() => save({ ...(statusChanged ? { status } : {}), ...(feeChanged ? { delivery_fee: Number(fee) } : {}) })}
                disabled={saving || (!statusChanged && !feeChanged)}
                className="w-full mt-3 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.76rem] tracking-[0.18em] uppercase py-3 disabled:opacity-40">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </section>
          )}

          <section>
            <h3 className="font-title text-[0.76rem] tracking-[0.25em] uppercase text-gold/85 mb-2">Staff notes</h3>
            <div className="space-y-2">
              {(order.staff_notes || []).length === 0 && <p className="font-body text-[0.9rem] text-cream-soft/70">No notes yet.</p>}
              {(order.staff_notes || []).map((n, i) => (
                <div key={i} className="bg-charcoal border border-gold/8 px-4 py-3">
                  <p className="font-body text-[0.95rem] text-cream-soft/75 whitespace-pre-wrap">{n.text}</p>
                  <p className="font-body text-[0.76rem] text-cream-soft/70 mt-1">{n.author_name} · {new Date(n.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              ))}
            </div>
            {canWrite && (
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="e.g. Called customer, delivery Friday, sent account details"
                  className="flex-1 bg-charcoal border border-gold/12 px-3 py-2 font-body text-[0.95rem] text-cream-soft placeholder:text-cream-soft/45 focus:outline-none focus:border-gold/45" />
                <button onClick={() => save({ note })} disabled={saving || !note.trim()}
                  className="sm:w-28 flex items-center justify-center gap-1.5 border border-gold/30 text-gold font-title text-[0.74rem] tracking-[0.15em] uppercase py-2 hover:bg-gold/10 disabled:opacity-40">
                  <StickyNote size={13} /> Add note
                </button>
              </div>
            )}
          </section>

          {(order.status_history || []).length > 0 && (
            <section>
              <h3 className="font-title text-[0.76rem] tracking-[0.25em] uppercase text-gold/85 mb-2">History</h3>
              <ul className="space-y-1.5">
                {order.status_history.slice().reverse().map((h, i) => (
                  <li key={i} className="flex items-center gap-2 font-body text-[0.84rem] text-cream-soft/80">
                    <Clock size={11} className="text-cream-soft/60" />
                    <span className="text-cream-soft/70">{LABEL[h.status] || h.status}</span>
                    <span>by {h.author_name}</span>
                    <span className="text-cream-soft/70">· {new Date(h.created_at).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const { canWrite } = useAuth()

  const { data: orders, loading, refresh } = useOrders({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    kind: kindFilter !== 'all' ? kindFilter : undefined,
    search: search || undefined,
  })

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Orders &amp; Quotes</h1>
          <p className="font-body text-[0.84rem] text-cream-soft/70 mt-0.5">{orders.length} record{orders.length !== 1 ? 's' : ''} · requests from the website (no online payment yet)</p>
        </div>
        <div className="flex border border-gold/12">
          {['all', 'order', 'quote'].map(k => (
            <button key={k} onClick={() => setKindFilter(k)}
              className={cn('px-4 py-2 font-title text-[0.76rem] tracking-[0.15em] uppercase', kindFilter === k ? 'bg-gold/15 text-gold' : 'text-cream-soft/75 hover:text-gold')}>
              {k === 'all' ? 'All' : k === 'order' ? 'Orders' : 'Quotes'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative sm:w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-soft/60" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, phone, email or ref..."
            className="w-full bg-charcoal border border-gold/10 pl-8 pr-4 py-2 font-body text-[0.9rem] text-cream-soft/70 placeholder:text-cream-soft/45 focus:outline-none focus:border-gold/35" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
          {['all', ...WORKFLOW].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 font-title text-[0.76rem] tracking-[0.12em] uppercase border whitespace-nowrap transition-all',
                statusFilter === s ? (s === 'all' ? 'bg-gold/10 border-gold/30 text-gold' : STATUS_STYLE[s]) : 'border-gold/8 text-cream-soft/70 hover:border-gold/20')}>
              {s === 'all' ? 'All' : LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading ? <p className="font-body text-[0.9rem] text-cream-soft/70 py-8 text-center">Loading...</p>
          : orders.length === 0 ? <p className="font-body text-[0.9rem] text-cream-soft/70 py-8 text-center">No requests found</p>
          : orders.map(o => (
            <button key={o.id} onClick={() => setSelected(o)} className="w-full text-left bg-charcoal border border-gold/8 p-4 active:bg-gold/5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-title text-[0.8rem] text-gold/80">{o.order_number}</span>
                <StatusPill status={o.status} />
              </div>
              <div className="font-body text-[0.95rem] text-cream-soft/80">{o.customer_name}</div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="flex items-center gap-2"><KindPill kind={kindOf(o)} /><span className="font-body text-[0.76rem] text-cream-soft/70">{new Date(o.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</span></span>
                <span className="font-title text-[0.9rem] text-cream-soft/70">{o.total ? fmt(o.total) : '—'}</span>
              </div>
            </button>
          ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-charcoal border border-gold/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-gold/8">
                {['Reference', 'Customer', 'Type', 'Items', 'Total', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left font-title text-[0.72rem] tracking-[0.2em] uppercase text-cream-soft/70">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-gold/5 animate-pulse">
                    {Array(7).fill(0).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-cream-soft/5 rounded w-20" /></td>)}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center font-body text-[0.9rem] text-cream-soft/60">No requests found</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="border-b border-gold/5 hover:bg-gold/3 transition-colors cursor-pointer" onClick={() => setSelected(o)}>
                  <td className="px-5 py-4">
                    <div className="font-title text-[0.8rem] text-gold/80">{o.order_number}</div>
                    <div className="font-body text-[0.76rem] text-cream-soft/70 mt-0.5">{new Date(o.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-body text-[0.95rem] text-cream-soft/75">{o.customer_name}</div>
                    <div className="font-body text-[0.76rem] text-cream-soft/70">{o.customer_phone || o.customer_email}</div>
                  </td>
                  <td className="px-5 py-4"><KindPill kind={kindOf(o)} /></td>
                  <td className="px-5 py-4 font-body text-[0.9rem] text-cream-soft/75">
                    {(o.items || []).length ? `${o.items.length} item${o.items.length !== 1 ? 's' : ''}` : (o.service || '—')}
                  </td>
                  <td className="px-5 py-4 font-title text-[0.9rem] text-cream-soft/75">{o.total ? fmt(o.total) : '—'}</td>
                  <td className="px-5 py-4"><StatusPill status={o.status} /></td>
                  <td className="px-5 py-4">
                    <button aria-label="Open" className="text-cream-soft/60 hover:text-gold" onClick={e => { e.stopPropagation(); setSelected(o) }}><Eye size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} onSaved={refresh} canWrite={canWrite('orders')} />}
      </AnimatePresence>
    </AdminLayout>
  )
}
