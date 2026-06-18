// src/pages/admin/Newsletter.jsx
import { useState, useMemo } from 'react'
import { Download, Mail, Search } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useNewsletter, updateSubscriberStatus } from '@/hooks/useData'
import { cn, formatDate } from '@/lib/utils'

const STATUSES = ['all', 'subscribed', 'unsubscribed', 'bounced']
const STYLE = {
  subscribed:   'text-green-400 bg-green-400/10 border-green-400/20',
  unsubscribed: 'text-cream-soft/40 bg-cream-soft/5 border-cream-soft/10',
  bounced:      'text-red-400 bg-red-400/10 border-red-400/20',
}

export default function Newsletter() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const { data: rows, loading, refresh } = useNewsletter({ status: filter !== 'all' ? filter : undefined })

  const visible = useMemo(
    () => rows.filter((r) => !search || r.email.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  )

  function exportCsv() {
    const header = 'email,status,source,subscribed_at\n'
    const body = visible.map((r) => `${r.email},${r.status},${r.source || ''},${r.created_at}`).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `maxims-newsletter-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  async function toggle(r) {
    await updateSubscriberStatus(r.id, r.status === 'subscribed' ? 'unsubscribed' : 'subscribed')
    refresh()
  }

  const subscribed = rows.filter((r) => r.status === 'subscribed').length

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Newsletter</h1>
          <p className="font-body text-[0.75rem] text-cream-soft/30 mt-0.5">{subscribed} active subscribers · {rows.length} total</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 border border-gold/25 text-gold font-title text-[0.62rem] tracking-[0.18em] uppercase px-5 py-2.5 hover:bg-gold/10 transition-colors">
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-soft/25" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email…"
            className="bg-charcoal border border-gold/10 pl-8 pr-4 py-2 font-body text-[0.8rem] text-cream-soft/70 placeholder:text-cream-soft/20 focus:outline-none focus:border-gold/35 w-52" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('px-3 py-1.5 font-title text-[0.55rem] tracking-[0.15em] uppercase border transition-all',
                filter === s ? (s === 'all' ? 'bg-gold/10 border-gold/30 text-gold' : cn(STYLE[s], 'border')) : 'border-gold/8 text-cream-soft/30 hover:border-gold/20')}>{s}</button>
          ))}
        </div>
      </div>

      <div className="bg-charcoal border border-gold/8 overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead><tr className="border-b border-gold/8">{['Email', 'Source', 'Status', 'Joined', ''].map((h) => (
            <th key={h} className="px-5 py-3.5 text-left font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft/22">{h}</th>))}</tr></thead>
          <tbody>
            {loading ? Array(6).fill(0).map((_, i) => <tr key={i} className="border-b border-gold/5 animate-pulse">{Array(5).fill(0).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-cream-soft/5 w-24" /></td>)}</tr>)
              : visible.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center font-body text-[0.8rem] text-cream-soft/20">No subscribers yet</td></tr>
              : visible.map((r) => (
                <tr key={r.id} className="border-b border-gold/5 hover:bg-gold/[0.03]">
                  <td className="px-5 py-4"><div className="flex items-center gap-2"><Mail size={12} className="text-gold/40" /><span className="font-body text-[0.82rem] text-cream-soft/70">{r.email}</span></div></td>
                  <td className="px-5 py-4 font-body text-[0.75rem] text-cream-soft/40 capitalize">{r.source || '—'}</td>
                  <td className="px-5 py-4"><span className={cn('font-body text-[0.55rem] tracking-wider uppercase px-2 py-0.5 border', STYLE[r.status])}>{r.status}</span></td>
                  <td className="px-5 py-4 font-body text-[0.72rem] text-cream-soft/35">{formatDate(r.created_at)}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => toggle(r)} className="font-title text-[0.55rem] tracking-wider uppercase text-cream-soft/40 hover:text-gold transition-colors">
                      {r.status === 'subscribed' ? 'Unsubscribe' : 'Resubscribe'}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
