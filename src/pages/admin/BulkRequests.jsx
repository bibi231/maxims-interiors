// src/pages/admin/BulkRequests.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Building2, Mail, Phone, User } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useBulkRequests, updateBulkRequest, logActivity } from '@/hooks/useData'
import { useAuth } from '@/context/AuthContext'
import { cn, formatNaira, formatDate } from '@/lib/utils'

const STATUSES = ['all', 'new', 'reviewing', 'quoted', 'accepted', 'declined', 'completed']
const STYLE = {
  new:       'text-gold bg-gold/10 border-gold/20',
  reviewing: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  quoted:    'text-purple-light bg-purple-light/10 border-purple-light/20',
  accepted:  'text-green-400 bg-green-400/10 border-green-400/20',
  declined:  'text-red-400 bg-red-400/10 border-red-400/20',
  completed: 'text-cream-soft/40 bg-cream-soft/5 border-cream-soft/10',
}

function DetailModal({ row, onClose, canWrite, profileId }) {
  const [status, setStatus] = useState(row.status)
  const [notes, setNotes] = useState(row.internal_notes || '')
  const [quote, setQuote] = useState(row.quote_amount || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await updateBulkRequest(row.id, {
      status,
      internal_notes: notes,
      quote_amount: quote ? Number(quote) : undefined,
    })
    setSaving(false); onClose()
  }

  return (
    <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-[580px] bg-charcoal-mid border border-gold/15 max-h-[85vh] overflow-y-auto"
        initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
          <div>
            <div className="font-title text-[0.8rem] tracking-[0.15em] text-gold">{row.company_name}</div>
            <div className="font-body text-[0.72rem] text-cream-soft/30 mt-0.5">{formatDate(row.created_at, { dateStyle: 'long' })}</div>
          </div>
          <button onClick={onClose} className="text-cream-soft/30 hover:text-gold"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-3">Contact</div>
            <div className="bg-charcoal border border-gold/8 p-4 space-y-2">
              {[[User, row.contact_name], [Mail, row.email], [Phone, row.phone]].filter(([, v]) => v).map(([Icon, v], i) => (
                <div key={i} className="flex items-center gap-2.5"><Icon size={12} className="text-cream-soft/25" /><span className="font-body text-[0.82rem] text-cream-soft/60">{v}</span></div>
              ))}
            </div>
          </div>
          <div>
            <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-3">Project</div>
            <div className="bg-charcoal border border-gold/8 p-4 grid grid-cols-2 gap-3 font-body text-[0.8rem] text-cream-soft/60">
              <div><span className="text-cream-soft/30 block text-[0.65rem] uppercase tracking-wide">Type</span>{row.project_type || '—'}</div>
              <div><span className="text-cream-soft/30 block text-[0.65rem] uppercase tracking-wide">Category</span>{row.product_category || '—'}</div>
              <div><span className="text-cream-soft/30 block text-[0.65rem] uppercase tracking-wide">Quantity</span>{row.quantity || '—'}</div>
              <div><span className="text-cream-soft/30 block text-[0.65rem] uppercase tracking-wide">Budget</span>{row.budget_range || '—'}</div>
            </div>
            {row.message && <p className="font-body text-[0.82rem] text-cream-soft/50 bg-charcoal border border-gold/8 p-4 mt-3">{row.message}</p>}
          </div>

          {canWrite && (
            <>
              <div>
                <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-3">Update Status</div>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.filter((s) => s !== 'all').map((s) => (
                    <button key={s} onClick={() => setStatus(s)}
                      className={cn('px-3 py-2 font-title text-[0.58rem] tracking-[0.12em] uppercase border transition-all', status === s ? STYLE[s] : 'border-gold/8 text-cream-soft/30 hover:border-gold/25')}>{s}</button>
                  ))}
                </div>
              </div>
              {status === 'quoted' && (
                <div>
                  <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-2">Quote Amount (₦)</div>
                  <input type="number" value={quote} onChange={(e) => setQuote(e.target.value)} className="lux-input" placeholder="0" />
                </div>
              )}
              <div>
                <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-2">Internal Notes (staff only)</div>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="lux-input resize-none" />
              </div>
              <button onClick={save} disabled={saving} className="w-full bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.65rem] tracking-[0.18em] uppercase py-3 disabled:opacity-40">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function BulkRequests() {
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const { canWrite, profile } = useAuth()
  const { data: rows, loading } = useBulkRequests({ status: filter !== 'all' ? filter : undefined })
  const newCount = rows.filter((r) => r.status === 'new').length

  return (
    <AdminLayout badgeCounts={{ bulk: newCount, total: newCount }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Bulk Requests</h1>
          <p className="font-body text-[0.75rem] text-cream-soft/30 mt-0.5">{rows.length} total · {newCount} new</p>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-5">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('px-3 py-1.5 font-title text-[0.55rem] tracking-[0.15em] uppercase border transition-all',
              filter === s ? (s === 'all' ? 'bg-gold/10 border-gold/30 text-gold' : cn(STYLE[s], 'border')) : 'border-gold/8 text-cream-soft/30 hover:border-gold/20')}>{s}</button>
        ))}
      </div>

      <div className="bg-charcoal border border-gold/8 overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead><tr className="border-b border-gold/8">{['Company', 'Contact', 'Project', 'Budget', 'Status'].map((h) => (
            <th key={h} className="px-5 py-3.5 text-left font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft/22">{h}</th>))}</tr></thead>
          <tbody>
            {loading ? Array(5).fill(0).map((_, i) => (
              <tr key={i} className="border-b border-gold/5 animate-pulse">{Array(5).fill(0).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-cream-soft/5 w-20" /></td>)}</tr>
            )) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center font-body text-[0.8rem] text-cream-soft/20">No requests found</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-b border-gold/5 hover:bg-gold/[0.03] cursor-pointer" onClick={() => setSelected(r)}>
                <td className="px-5 py-4"><div className="flex items-center gap-2"><Building2 size={13} className="text-gold/50" /><span className="font-body text-[0.82rem] text-cream-soft/70">{r.company_name}</span></div></td>
                <td className="px-5 py-4"><div className="font-body text-[0.8rem] text-cream-soft/60">{r.contact_name}</div><div className="font-body text-[0.66rem] text-cream-soft/28">{r.email}</div></td>
                <td className="px-5 py-4 font-body text-[0.78rem] text-cream-soft/45">{r.project_type || '—'}</td>
                <td className="px-5 py-4 font-body text-[0.78rem] text-cream-soft/45">{r.quote_amount ? formatNaira(r.quote_amount) : (r.budget_range || '—')}</td>
                <td className="px-5 py-4"><span className={cn('font-body text-[0.55rem] tracking-wider uppercase px-2 py-0.5 border', STYLE[r.status])}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>{selected && <DetailModal row={selected} onClose={() => setSelected(null)} canWrite={canWrite('bulk_requests')} profileId={profile?.id} />}</AnimatePresence>
    </AdminLayout>
  )
}
