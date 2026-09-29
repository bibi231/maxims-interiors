// src/pages/admin/Activity.jsx
import { useState, useMemo } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useActivityLog } from '@/hooks/useData'
import { cn, timeAgo } from '@/lib/utils'

const ACTION_STYLE = {
  created:        'text-green-400 bg-green-400/10',
  updated:        'text-gold bg-gold/10',
  deleted:        'text-red-400 bg-red-400/10',
  status_changed: 'text-blue-400 bg-blue-400/10',
}

export default function Activity() {
  const { data: logs, loading } = useActivityLog(100)
  const [type, setType] = useState('all')

  const types = useMemo(() => ['all', ...Array.from(new Set(logs.map((l) => l.resource_type)))], [logs])
  const visible = type === 'all' ? logs : logs.filter((l) => l.resource_type === type)

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-title text-xl text-cream-soft tracking-wide">Activity Log</h1>
        <p className="font-body text-[0.84rem] text-cream-soft/70 mt-0.5">Last {logs.length} actions · read-only audit trail</p>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-5">
        {types.map((t) => (
          <button key={t} onClick={() => setType(t)}
            className={cn('px-3 py-1.5 font-title text-[0.76rem] tracking-[0.15em] uppercase border transition-all capitalize',
              type === t ? 'bg-gold/10 border-gold/30 text-gold' : 'border-gold/8 text-cream-soft/70 hover:border-gold/20')}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-charcoal border border-gold/8 divide-y divide-gold/5">
        {loading ? Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-14" />)
          : visible.length === 0 ? <p className="px-5 py-12 text-center font-body text-[0.9rem] text-cream-soft/60">No activity recorded yet</p>
          : visible.map((l) => (
            <div key={l.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="grid place-items-center w-8 h-8 rounded-full bg-purple-rich border border-gold/15 shrink-0">
                <span className="font-title text-[0.74rem] text-gold">{l.profile?.full_name?.[0] ?? '?'}</span>
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-body text-[0.95rem] text-cream-soft/70 truncate">{l.description}</p>
                <p className="font-body text-[0.74rem] text-cream-soft/70">{l.profile?.full_name ?? 'System'} · {timeAgo(l.created_at)}</p>
              </div>
              <span className={cn('font-body text-[0.76rem] tracking-wider uppercase px-2 py-0.5 shrink-0', ACTION_STYLE[l.action] ?? 'text-cream-soft/75 bg-cream-soft/5')}>
                {String(l.action).replace('_', ' ')}
              </span>
            </div>
          ))}
      </div>
    </AdminLayout>
  )
}
