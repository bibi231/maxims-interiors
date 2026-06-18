// src/pages/admin/Messages.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Phone, Send, Archive, Check } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useContactMessages, markMessageRead, replyToMessage, archiveMessage, logActivity } from '@/hooks/useData'
import { useAuth } from '@/context/AuthContext'
import { cn, formatDate, truncate } from '@/lib/utils'

const STATUSES = ['all', 'unread', 'read', 'replied', 'archived']
const STYLE = {
  unread:   'text-gold bg-gold/10 border-gold/20',
  read:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
  replied:  'text-green-400 bg-green-400/10 border-green-400/20',
  archived: 'text-cream-soft/40 bg-cream-soft/5 border-cream-soft/10',
}

function MessageModal({ msg, onClose, canWrite, profileId }) {
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  async function doReply() {
    if (!reply.trim()) return
    setBusy(true)
    await replyToMessage(msg.id, reply, profileId)
    await logActivity({ userId: profileId, action: 'updated', resourceType: 'contact_message', resourceId: msg.id, description: `Replied to ${msg.full_name}` })
    setBusy(false); onClose()
  }
  async function archive() {
    setBusy(true)
    await archiveMessage(msg.id)
    setBusy(false); onClose()
  }

  return (
    <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-[560px] bg-charcoal-mid border border-gold/15 max-h-[85vh] overflow-y-auto"
        initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
          <div>
            <div className="font-title text-[0.8rem] tracking-[0.15em] text-gold">{msg.full_name}</div>
            <div className="font-body text-[0.72rem] text-cream-soft/30 mt-0.5">{formatDate(msg.created_at, { dateStyle: 'long' })}</div>
          </div>
          <button onClick={onClose} className="text-cream-soft/30 hover:text-gold"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex flex-wrap gap-4 font-body text-[0.78rem] text-cream-soft/55">
            <a href={`mailto:${msg.email}`} className="flex items-center gap-1.5 hover:text-gold"><Mail size={12} /> {msg.email}</a>
            {msg.phone && <a href={`tel:${msg.phone}`} className="flex items-center gap-1.5 hover:text-gold"><Phone size={12} /> {msg.phone}</a>}
            {msg.service && <span className="text-cream-soft/30">· {msg.service}</span>}
          </div>
          <p className="font-body text-[0.9rem] text-cream-soft/75 leading-relaxed bg-charcoal border border-gold/8 p-4 whitespace-pre-wrap">{msg.message}</p>

          {msg.reply_text && (
            <div>
              <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-green-400/60 mb-2">Your Reply</div>
              <p className="font-body text-[0.82rem] text-cream-soft/55 bg-green-400/5 border border-green-400/15 p-4 whitespace-pre-wrap">{msg.reply_text}</p>
            </div>
          )}

          {canWrite && msg.status !== 'replied' && (
            <div>
              <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-2">Reply</div>
              <textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} className="lux-input resize-none" placeholder="Type your reply… (sent via email)" />
              <div className="flex gap-2 mt-3">
                <button onClick={doReply} disabled={busy || !reply.trim()} className="flex-1 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.65rem] tracking-[0.18em] uppercase py-3 disabled:opacity-40 flex items-center justify-center gap-2">
                  <Send size={13} /> {busy ? 'Sending…' : 'Send Reply'}
                </button>
                <button onClick={archive} disabled={busy} className="px-4 border border-gold/15 text-cream-soft/40 hover:text-gold hover:border-gold/40 transition-colors"><Archive size={15} /></button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Messages() {
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const { canWrite, profile } = useAuth()
  const { data: rows, loading } = useContactMessages({ status: filter !== 'all' ? filter : undefined })
  const unread = rows.filter((m) => m.status === 'unread').length

  async function open(msg) {
    setSelected(msg)
    if (msg.status === 'unread') await markMessageRead(msg.id)
  }

  return (
    <AdminLayout badgeCounts={{ messages: unread, total: unread }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Messages</h1>
          <p className="font-body text-[0.75rem] text-cream-soft/30 mt-0.5">{rows.length} total · {unread} unread</p>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-5">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('px-3 py-1.5 font-title text-[0.55rem] tracking-[0.15em] uppercase border transition-all',
              filter === s ? (s === 'all' ? 'bg-gold/10 border-gold/30 text-gold' : cn(STYLE[s], 'border')) : 'border-gold/8 text-cream-soft/30 hover:border-gold/20')}>{s}</button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-20" />)
          : rows.length === 0 ? <p className="text-center font-body text-[0.8rem] text-cream-soft/20 py-12">No messages</p>
          : rows.map((m) => (
            <button key={m.id} onClick={() => open(m)}
              className={cn('w-full text-left bg-charcoal border border-gold/8 hover:border-gold/25 transition-colors p-4 flex items-start gap-4',
                m.status === 'unread' && 'border-l-2 border-l-gold')}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-body text-[0.85rem] text-cream-soft/75">{m.full_name}</span>
                  {m.service && <span className="font-body text-[0.62rem] text-cream-soft/30">· {m.service}</span>}
                </div>
                <p className="font-body text-[0.78rem] text-cream-soft/40 mt-1 truncate">{truncate(m.message, 80)}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={cn('font-body text-[0.5rem] tracking-wider uppercase px-2 py-0.5 border', STYLE[m.status])}>{m.status}</span>
                <div className="font-body text-[0.6rem] text-cream-soft/25 mt-1.5">{formatDate(m.created_at, { month: 'short', day: 'numeric' })}</div>
              </div>
            </button>
          ))}
      </div>

      <AnimatePresence>{selected && <MessageModal msg={selected} onClose={() => setSelected(null)} canWrite={canWrite('messages')} profileId={profile?.id} />}</AnimatePresence>
    </AdminLayout>
  )
}
