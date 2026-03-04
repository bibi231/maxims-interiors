// src/pages/admin/BulkRequests.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, X, Package, Phone, Mail, Building2 } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useBulkRequests, updateBulkStatus } from '@/hooks/useData'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const STATUSES = ['all', 'new', 'reviewed', 'quoted', 'accepted', 'rejected']
const STATUS_STYLE = {
    new: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    reviewed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    quoted: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    accepted: 'text-green-400 bg-green-400/10 border-green-400/20',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
}

function RequestDetailModal({ req, onClose, canWrite }) {
    const [status, setStatus] = useState(req.status)
    const [notes, setNotes] = useState(req.internal_notes || '')
    const [saving, setSaving] = useState(false)

    async function save() {
        setSaving(true)
        await updateBulkStatus(req.id, status, notes)
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
                <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
                    <div>
                        <div className="font-title text-[0.8rem] tracking-[0.15em] text-gold">Req #{req.id.slice(0, 8)}</div>
                        <div className="font-body text-[0.72rem] text-cream-soft mt-0.5">
                            {new Date(req.created_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-cream-soft hover:text-gold transition-colors"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-3">Client</div>
                        <div className="bg-charcoal border border-gold/8 p-4 space-y-2">
                            <div className="flex items-center gap-2.5">
                                <Package size={12} className="text-cream-soft shrink-0" />
                                <span className="font-body text-[0.82rem] text-cream-soft">{req.name}</span>
                            </div>
                            {req.company && (
                                <div className="flex items-center gap-2.5">
                                    <Building2 size={12} className="text-cream-soft shrink-0" />
                                    <span className="font-body text-[0.82rem] text-cream-soft">{req.company}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2.5">
                                <Mail size={12} className="text-cream-soft shrink-0" />
                                <span className="font-body text-[0.82rem] text-cream-soft">{req.email}</span>
                            </div>
                            {req.phone && (
                                <div className="flex items-center gap-2.5">
                                    <Phone size={12} className="text-cream-soft shrink-0" />
                                    <span className="font-body text-[0.82rem] text-cream-soft">{req.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-3">Requirements</div>
                        <p className="font-body text-[0.82rem] text-cream-soft bg-charcoal border border-gold/8 p-4 whitespace-pre-wrap">
                            {req.requirements}
                        </p>
                    </div>

                    {canWrite && (
                        <div>
                            <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-3">Manage</div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {STATUSES.filter(s => s !== 'all').map(s => (
                                    <button key={s} onClick={() => setStatus(s)}
                                        className={cn('px-3 py-2 font-title text-[0.58rem] tracking-[0.12em] uppercase border transition-all',
                                            status === s ? STATUS_STYLE[s] : 'border-gold/8 text-cream-soft hover:border-gold/25')}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <textarea placeholder="Internal Notes..." value={notes} onChange={e => setNotes(e.target.value)}
                                className="w-full bg-charcoal border border-gold/10 p-3 font-body text-[0.82rem] text-cream-soft placeholder:text-cream-soft focus:outline-none focus:border-gold/35 mb-3 resize-none" rows={3} />

                            <button onClick={save} disabled={saving || (status === req.status && notes === (req.internal_notes || ''))}
                                className="w-full bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest dark:text-cream-soft font-title text-[0.65rem] tracking-[0.18em] uppercase py-3 hover:shadow-gold transition-all disabled:opacity-40">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}

export default function BulkRequests() {
    const [statusFilter, setStatusFilter] = useState('all')
    const [selected, setSelected] = useState(null)
    const { canWrite } = useAuth()

    const { data: requests, loading } = useBulkRequests({
        status: statusFilter !== 'all' ? statusFilter : undefined
    })

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-title text-xl text-cream-soft tracking-wide">Bulk Requests</h1>
                    <p className="font-body text-[0.75rem] text-cream-soft mt-0.5">{requests.length} total records</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5">
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

            <div className="bg-charcoal border border-gold/8 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-gold/8">
                                {['Date', 'Client', 'Company', 'Status', ''].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-left font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="border-b border-gold/5 animate-pulse">
                                        {Array(5).fill(0).map((_, j) => (
                                            <td key={j} className="px-5 py-4"><div className="h-4 bg-cream-soft/5 rounded w-20" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-12 text-center font-body text-[0.8rem] text-cream-soft">No requests found</td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id} className="border-b border-gold/5 hover:bg-gold/3 transition-colors cursor-pointer" onClick={() => setSelected(req)}>
                                        <td className="px-5 py-4">
                                            <div className="font-title text-[0.7rem] text-gold/75">{new Date(req.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-body text-[0.82rem] text-cream-soft">{req.name}</div>
                                            <div className="font-body text-[0.68rem] text-cream-soft">{req.email}</div>
                                        </td>
                                        <td className="px-5 py-4 font-body text-[0.78rem] text-cream-soft">
                                            {req.company || '-'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={cn('font-body text-[0.55rem] tracking-wider uppercase px-2 py-0.5 border', STATUS_STYLE[req.status] || '')}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <button className="text-cream-soft hover:text-gold transition-colors" onClick={e => { e.stopPropagation(); setSelected(req) }}>
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
                {selected && <RequestDetailModal req={selected} onClose={() => setSelected(null)} canWrite={canWrite('bulk_requests')} />}
            </AnimatePresence>
        </AdminLayout>
    )
}
