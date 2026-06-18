// src/pages/admin/Transactions.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Copy, Check, Link2, TrendingUp, Wallet, Clock, RefreshCw } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useTransactions, usePaymentStats } from '@/hooks/useData'
import { createPaymentLink, verifyPayment } from '@/hooks/usePayment'
import { useAuth } from '@/context/AuthContext'
import { cn, formatNaira, formatDate } from '@/lib/utils'

const STATUSES = ['all', 'pending', 'success', 'failed', 'abandoned', 'refunded']
const STYLE = {
  pending:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  success:   'text-green-400 bg-green-400/10 border-green-400/20',
  failed:    'text-red-400 bg-red-400/10 border-red-400/20',
  abandoned: 'text-cream-soft/40 bg-cream-soft/5 border-cream-soft/10',
  refunded:  'text-purple-light bg-purple-light/10 border-purple-light/20',
}
const DEFAULT_PROVIDER = import.meta.env.VITE_PAYMENT_PROVIDER || 'squad'

function PaymentLinkModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', amount: '', description: '', provider: DEFAULT_PROVIDER })
  const [link, setLink] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function generate(e) {
    e.preventDefault()
    setErr('')
    if (!form.email || !form.amount) { setErr('Email and amount are required.'); return }
    setBusy(true)
    try {
      const res = await createPaymentLink({
        amount: Number(form.amount), email: form.email, name: form.name, phone: form.phone,
        provider: form.provider, description: form.description, metadata: { type: 'admin_link' },
      })
      setLink(res.checkout_url)
    } catch (e2) { setErr(e2.message || 'Could not create link. Check your payment keys are set.') }
    setBusy(false)
  }

  function copy() {
    navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-[480px] bg-charcoal-mid border border-gold/15"
        initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
          <h2 className="font-display text-xl text-cream-soft flex items-center gap-2"><Link2 size={18} className="text-gold" /> Create Payment Link</h2>
          <button onClick={onClose} className="text-cream-soft/30 hover:text-gold"><X size={18} /></button>
        </div>

        {link ? (
          <div className="p-6">
            <div className="notice-success mb-4 flex items-center gap-2"><Check size={16} /> Link created — share it with your customer.</div>
            <div className="flex items-stretch border border-gold/20">
              <input readOnly value={link} className="flex-1 bg-charcoal px-3 py-3 font-body text-[0.75rem] text-cream-soft/70 outline-none" />
              <button onClick={copy} className="px-4 bg-gold/10 text-gold hover:bg-gold/20 transition-colors">{copied ? <Check size={16} /> : <Copy size={16} />}</button>
            </div>
            <div className="flex gap-2 mt-4">
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn-outline-gold flex-1 justify-center">Open Link</a>
              <button onClick={onClose} className="btn-gold-solid flex-1 justify-center">Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={generate} className="p-6 space-y-4">
            {err && <div className="notice-error">{err}</div>}
            <div className="grid grid-cols-2 gap-4">
              <input className="lux-input" placeholder="Customer name" value={form.name} onChange={set('name')} />
              <input className="lux-input" placeholder="Phone" value={form.phone} onChange={set('phone')} />
            </div>
            <input type="email" className="lux-input" placeholder="Customer email *" value={form.email} onChange={set('email')} />
            <input type="number" className="lux-input" placeholder="Amount (₦) *" value={form.amount} onChange={set('amount')} />
            <input className="lux-input" placeholder="Description (e.g. Sofa deposit)" value={form.description} onChange={set('description')} />
            <select className="lux-input" value={form.provider} onChange={set('provider')}>
              <option value="squad">Squad (GTCO)</option>
              <option value="paystack">Paystack</option>
            </select>
            <button type="submit" disabled={busy} className="btn-gold-solid w-full justify-center disabled:opacity-60">{busy ? 'Generating…' : 'Generate Link'}</button>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}

function StatCard({ icon: Icon, label, value, tone = 'gold' }) {
  return (
    <div className="bg-charcoal border border-gold/8 p-5">
      <div className="flex items-center justify-between">
        <span className={cn('grid place-items-center w-9 h-9', tone === 'green' ? 'text-green-400 bg-green-400/10' : tone === 'yellow' ? 'text-yellow-400 bg-yellow-400/10' : 'text-gold bg-gold/10')}><Icon size={16} /></span>
      </div>
      <div className="font-title text-2xl text-cream-soft mt-3">{value}</div>
      <div className="font-body text-[0.65rem] tracking-[0.12em] uppercase text-cream-soft/35 mt-1">{label}</div>
    </div>
  )
}

export default function Transactions() {
  const [filter, setFilter] = useState('all')
  const [showLink, setShowLink] = useState(false)
  const [verifying, setVerifying] = useState(null)
  const { canWrite } = useAuth()
  const { data: rows, loading, refresh } = useTransactions({ status: filter !== 'all' ? filter : undefined })
  const { stats } = usePaymentStats()

  async function recheck(ref) {
    setVerifying(ref)
    try { await verifyPayment(ref); refresh() } catch { /* ignore */ }
    setVerifying(null)
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Transactions</h1>
          <p className="font-body text-[0.75rem] text-cream-soft/30 mt-0.5">{rows.length} records · verified server-side</p>
        </div>
        {canWrite('transactions') && (
          <button onClick={() => setShowLink(true)} className="flex items-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.62rem] tracking-[0.18em] uppercase px-5 py-2.5">
            <Plus size={13} /> Payment Link
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Wallet} label="Total Revenue" value={formatNaira(stats?.revenue ?? 0)} tone="green" />
        <StatCard icon={TrendingUp} label="This Month" value={formatNaira(stats?.revenueThisMonth ?? 0)} />
        <StatCard icon={Check} label="Successful" value={stats?.paidCount ?? 0} tone="green" />
        <StatCard icon={Clock} label="Pending" value={stats?.pending ?? 0} tone="yellow" />
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('px-3 py-1.5 font-title text-[0.55rem] tracking-[0.15em] uppercase border transition-all',
              filter === s ? (s === 'all' ? 'bg-gold/10 border-gold/30 text-gold' : cn(STYLE[s], 'border')) : 'border-gold/8 text-cream-soft/30 hover:border-gold/20')}>{s}</button>
        ))}
      </div>

      <div className="bg-charcoal border border-gold/8 overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead><tr className="border-b border-gold/8">{['Reference', 'Customer', 'Amount', 'Provider', 'Status', 'Date', ''].map((h) => (
            <th key={h} className="px-5 py-3.5 text-left font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft/22">{h}</th>))}</tr></thead>
          <tbody>
            {loading ? Array(6).fill(0).map((_, i) => <tr key={i} className="border-b border-gold/5 animate-pulse">{Array(7).fill(0).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-cream-soft/5 w-20" /></td>)}</tr>)
              : rows.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center font-body text-[0.8rem] text-cream-soft/20">No transactions yet</td></tr>
              : rows.map((t) => (
                <tr key={t.id} className="border-b border-gold/5 hover:bg-gold/[0.03]">
                  <td className="px-5 py-4 font-title text-[0.7rem] text-gold/75">{t.reference}{t.description && <div className="font-body text-[0.62rem] text-cream-soft/30 mt-0.5">{t.description}</div>}</td>
                  <td className="px-5 py-4"><div className="font-body text-[0.8rem] text-cream-soft/65">{t.customer_name || '—'}</div><div className="font-body text-[0.66rem] text-cream-soft/28">{t.customer_email}</div></td>
                  <td className="px-5 py-4 font-title text-[0.82rem] text-cream-soft/75">{formatNaira(t.amount)}</td>
                  <td className="px-5 py-4 font-body text-[0.72rem] text-cream-soft/45 capitalize">{t.provider}</td>
                  <td className="px-5 py-4"><span className={cn('font-body text-[0.55rem] tracking-wider uppercase px-2 py-0.5 border', STYLE[t.status])}>{t.status}</span></td>
                  <td className="px-5 py-4 font-body text-[0.7rem] text-cream-soft/35">{formatDate(t.created_at)}</td>
                  <td className="px-5 py-4">
                    {t.status === 'pending' && (
                      <button onClick={() => recheck(t.reference)} disabled={verifying === t.reference} className="text-cream-soft/30 hover:text-gold transition-colors" title="Re-verify with gateway">
                        <RefreshCw size={13} className={verifying === t.reference ? 'animate-spin' : ''} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>{showLink && <PaymentLinkModal onClose={() => { setShowLink(false); refresh() }} />}</AnimatePresence>
    </AdminLayout>
  )
}
