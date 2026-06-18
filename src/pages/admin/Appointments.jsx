// src/pages/admin/Appointments.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Clock, MapPin, Phone, Mail, Calendar, User } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAppointments, updateAppointmentStatus } from '@/hooks/useData'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const STATUS_STYLE = {
  pending:      'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  confirmed:    'text-green-400 bg-green-400/10 border-green-400/20',
  completed:    'text-blue-400 bg-blue-400/10 border-blue-400/20',
  cancelled:    'text-red-400 bg-red-400/10 border-red-400/20',
  rescheduled:  'text-cream-soft/40 bg-cream-soft/5 border-cream-soft/10',
}

const TYPE_LABELS = {
  design_consultation: 'Design Consult',
  virtual_design:      'Virtual Design',
  showroom_visit:      'Showroom Visit',
  project_review:      'Project Review',
  bulk_inquiry:        'Bulk Inquiry',
}

export default function Appointments() {
  const [filter,   setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)
  const { canWrite } = useAuth()
  const { data: appts, loading, refresh } = useAppointments({
    status: filter !== 'all' ? filter : undefined,
  })

  async function changeStatus(id, status) {
    await updateAppointmentStatus(id, status)
    refresh()
    setSelected(null)
  }

  // Group by date
  const grouped = appts.reduce((acc, a) => {
    const d = a.preferred_date
    if (!acc[d]) acc[d] = []
    acc[d].push(a)
    return acc
  }, {})

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Appointments</h1>
          <p className="font-body text-[0.75rem] text-cream-soft/30 mt-0.5">{appts.length} total</p>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-5">
        {['all','pending','confirmed','completed','cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('px-3 py-1.5 font-title text-[0.55rem] tracking-[0.15em] uppercase border transition-all',
              filter === s
                ? s === 'all' ? 'bg-gold/10 border-gold/30 text-gold' : cn(STATUS_STYLE[s],'border')
                : 'border-gold/8 text-cream-soft/30 hover:border-gold/20')}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-charcoal border border-gold/8 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b)).map(([date, dayAppts]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="font-title text-[0.62rem] tracking-[0.2em] uppercase text-gold/60">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div className="flex-1 h-px bg-gold/8" />
                <div className="font-title text-[0.55rem] tracking-wider text-cream-soft/20">{dayAppts.length} appt{dayAppts.length !== 1 ? 's':''}</div>
              </div>
              <div className="space-y-2">
                {dayAppts.map(appt => (
                  <motion.div key={appt.id}
                    className="bg-charcoal border border-gold/8 hover:border-gold/22 transition-all cursor-pointer"
                    onClick={() => setSelected(appt)} whileHover={{ x: 2 }}>
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="text-center shrink-0 w-14">
                        <div className="font-title text-base text-gold font-semibold leading-none">{appt.preferred_time?.slice(0,5)}</div>
                        <div className="font-body text-[0.58rem] text-cream-soft/25 mt-0.5">{appt.duration_mins}min</div>
                      </div>
                      <div className="w-px h-10 bg-gold/12 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-body text-[0.88rem] text-cream-soft/75">{appt.client_name}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="font-title text-[0.58rem] tracking-[0.12em] uppercase text-gold/50">{TYPE_LABELS[appt.type] || appt.type}</span>
                          <span className="font-body text-[0.65rem] text-cream-soft/25">📍 {appt.location}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={cn('font-body text-[0.55rem] tracking-wide uppercase px-2 py-0.5 border', STATUS_STYLE[appt.status])}>
                          {appt.status}
                        </span>
                        {canWrite('appointments') && appt.status === 'pending' && (
                          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                            <button onClick={() => changeStatus(appt.id,'confirmed')} className="w-7 h-7 bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/30 flex items-center justify-center transition-all">
                              <Check size={12} />
                            </button>
                            <button onClick={() => changeStatus(appt.id,'cancelled')} className="w-7 h-7 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-all">
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-16 font-body text-cream-soft/20">No appointments found</div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <motion.div className="w-full max-w-[480px] bg-charcoal-mid border border-gold/15"
              initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
                <div className="font-title text-[0.72rem] tracking-[0.2em] uppercase text-gold">{TYPE_LABELS[selected.type]}</div>
                <button onClick={() => setSelected(null)} className="text-cream-soft/30 hover:text-gold"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4">
                {[[User, selected.client_name],[Mail, selected.client_email],[Phone, selected.client_phone],[Calendar, `${selected.preferred_date} at ${selected.preferred_time?.slice(0,5)}`],[MapPin, selected.location],[Clock, `${selected.duration_mins} minutes`]].filter(([,v])=>v).map(([Icon,val],i)=>(
                  <div key={i} className="flex items-center gap-3">
                    <Icon size={13} className="text-gold/40 shrink-0"/>
                    <span className="font-body text-[0.85rem] text-cream-soft/60">{val}</span>
                  </div>
                ))}
                {selected.notes && <p className="font-body text-[0.82rem] text-cream-soft/45 bg-charcoal border border-gold/8 p-4 mt-2">{selected.notes}</p>}
                {canWrite('appointments') && selected.status === 'pending' && (
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => changeStatus(selected.id,'confirmed')} className="flex-1 bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25 font-title text-[0.62rem] tracking-[0.15em] uppercase py-2.5 transition-all">✓ Confirm</button>
                    <button onClick={() => changeStatus(selected.id,'cancelled')} className="flex-1 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-title text-[0.62rem] tracking-[0.15em] uppercase py-2.5 transition-all">✕ Cancel</button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
