// src/pages/admin/Orders.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Eye, Edit2, MoreHorizontal, X, Package, Phone, Mail, MapPin } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useOrders, updateOrderStatus, assignOrder } from '@/hooks/useData'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const STATUSES = ['all','pending','processing','shipped','delivered','cancelled','refunded']
const STATUS_STYLE = {
  pending:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  processing: 'text-gold bg-gold/10 border-gold/20',
  shipped:    'text-blue-400 bg-blue-400/10 border-blue-400/20',
  delivered:  'text-green-400 bg-green-400/10 border-green-400/20',
  cancelled:  'text-red-400 bg-red-400/10 border-red-400/20',
  refunded:   'text-cream-soft bg-cream-soft/5 border-cream-soft/10',
}
const fmt = n => '₦' + Number(n || 0).toLocaleString()

function OrderDetailModal({ order, onClose, canWrite }) {
  const [status, setStatus] = useState(order.status)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await updateOrderStatus(order.id, status)
    setSaving(false)
    onClose()
  }

  return (
    <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="w-full max-w-[580px] bg-charcoal-mid border border-gold/15 max-h-[85vh] overflow-y-auto"
        initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
          <div>
            <div className="font-title text-[0.8rem] tracking-[0.15em] text-gold">{order.order_number}</div>
            <div className="font-body text-[0.72rem] text-cream-soft mt-0.5">
              {new Date(order.created_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}
            </div>
          </div>
          <button onClick={onClose} className="text-cream-soft hover:text-gold transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Customer */}
          <div>
            <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-3">Customer</div>
            <div className="bg-charcoal border border-gold/8 p-4 space-y-2">
              {[
                [Package, order.customer_name],
                [Mail, order.customer_email],
                [Phone, order.customer_phone],
                [MapPin, [order.delivery_address, order.city, order.state].filter(Boolean).join(', ')],
              ].filter(([, v]) => v).map(([Icon, val], i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Icon size={12} className="text-cream-soft shrink-0" />
                  <span className="font-body text-[0.82rem] text-cream-soft">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-3">Items Ordered</div>
            <div className="bg-charcoal border border-gold/8 divide-y divide-gold/5">
              {(order.items || []).map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-body text-[0.82rem] text-cream-soft">{item.name}</div>
                    <div className="font-body text-[0.68rem] text-cream-soft">Qty: {item.qty}</div>
                  </div>
                  <div className="font-title text-[0.78rem] text-gold/70">{fmt(item.price * item.qty)}</div>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3">
                <span className="font-title text-[0.65rem] tracking-wider uppercase text-cream-soft">Subtotal</span>
                <span className="font-body text-[0.82rem] text-cream-soft">{fmt(order.subtotal)}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between px-4 py-3">
                  <span className="font-title text-[0.65rem] tracking-wider uppercase text-cream-soft">Delivery</span>
                  <span className="font-body text-[0.82rem] text-cream-soft">{fmt(order.delivery_fee)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 bg-gold/4">
                <span className="font-title text-[0.65rem] tracking-wider uppercase text-gold/60">Total</span>
                <span className="font-title text-[0.9rem] text-gold">{fmt(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Status Update */}
          {canWrite && (
            <div>
              <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-3">Update Status</div>
              <div className="grid grid-cols-3 gap-2">
                {STATUSES.filter(s => s !== 'all').map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={cn('px-3 py-2 font-title text-[0.58rem] tracking-[0.12em] uppercase border transition-all',
                      status === s ? STATUS_STYLE[s] : 'border-gold/8 text-cream-soft hover:border-gold/25')}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={save} disabled={saving || status === order.status}
                className="w-full mt-3 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest dark:text-cream-soft font-title text-[0.65rem] tracking-[0.18em] uppercase py-3 hover:shadow-gold transition-all disabled:opacity-40">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {order.notes && (
            <div>
              <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-2">Notes</div>
              <p className="font-body text-[0.82rem] text-cream-soft bg-charcoal border border-gold/8 p-4">{order.notes}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const { canWrite } = useAuth()

  const { data: orders, loading } = useOrders({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: search || undefined,
  })

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Orders</h1>
          <p className="font-body text-[0.75rem] text-cream-soft mt-0.5">{orders.length} total records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-soft" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..."
            className="bg-charcoal border border-gold/10 pl-8 pr-4 py-2 font-body text-[0.8rem] text-cream-soft placeholder:text-cream-soft focus:outline-none focus:border-gold/35 w-52 transition-colors" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 font-title text-[0.55rem] tracking-[0.15em] uppercase border transition-all',
                statusFilter === s
                  ? s === 'all' ? 'bg-gold/10 border-gold/30 text-gold' : cn(STATUS_STYLE[s], 'border')
                  : 'border-gold/8 text-cream-soft hover:border-gold/20')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-charcoal border border-gold/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gold/8">
                {['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-gold/5 animate-pulse">
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-cream-soft/5 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center font-body text-[0.8rem] text-cream-soft">No orders found</td></tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="border-b border-gold/5 hover:bg-gold/3 transition-colors cursor-pointer" onClick={() => setSelected(order)}>
                    <td className="px-5 py-4">
                      <div className="font-title text-[0.7rem] text-gold/75">{order.order_number}</div>
                      <div className="font-body text-[0.65rem] text-cream-soft mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-body text-[0.82rem] text-cream-soft">{order.customer_name}</div>
                      <div className="font-body text-[0.68rem] text-cream-soft">{order.customer_email}</div>
                    </td>
                    <td className="px-5 py-4 font-body text-[0.78rem] text-cream-soft">
                      {(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-4 font-title text-[0.8rem] text-cream-soft">{fmt(order.total)}</td>
                    <td className="px-5 py-4">
                      <span className={cn('font-body text-[0.55rem] tracking-wider uppercase px-2 py-0.5',
                        order.payment_status === 'paid' ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10')}>
                        {order.payment_status || 'unpaid'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('font-body text-[0.55rem] tracking-wider uppercase px-2 py-0.5 border', STATUS_STYLE[order.status] || '')}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button className="text-cream-soft hover:text-gold transition-colors" onClick={e => { e.stopPropagation(); setSelected(order) }}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} canWrite={canWrite('orders')} />}
      </AnimatePresence>
    </AdminLayout>
  )
}
