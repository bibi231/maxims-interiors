// src/components/admin/StaffAccounts.jsx
// Owner: invite team members (name, email, role), see who is pending/active,
// resend or cancel invites, deactivate/reactivate, change roles.
// Invites are emailed through the site's own SMTP server. If the email fails
// the account is still created and the owner gets a link to copy and send.
import { useState } from 'react'
import { UserPlus, RefreshCw, Copy, Check, AlertTriangle, MailCheck, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useProfiles, updateProfileRole, inviteStaff } from '@/hooks/useData'
import { useAuth, ROLE_PERMISSIONS } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const ROLE_OPTS = ['owner', 'senior_designer', 'project_manager', 'shop_manager', 'content_editor']
const labelCls = 'font-title text-[0.76rem] tracking-[0.16em] uppercase text-cream-soft/75 block mb-1.5'
const inputCls = 'w-full min-h-[44px] bg-charcoal border border-gold/20 px-3 py-2.5 font-body text-[0.95rem] text-cream-soft placeholder:text-cream-soft/40 focus:outline-none focus:border-gold/60 transition-colors'
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

function statusOf(p) {
  if (!p.is_active) return { key: 'inactive', label: 'Deactivated', cls: 'text-red-400 bg-red-400/10 border-red-400/30' }
  if (p.invite_pending) return { key: 'pending', label: 'Invite pending', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/30' }
  return { key: 'active', label: 'Active', cls: 'text-green-400 bg-green-400/10 border-green-400/30' }
}

// Result of an invite / resend: success, or "created but email failed" + link.
export function InviteResult({ result, onClose }) {
  const [copied, setCopied] = useState(false)
  if (!result) return null
  const ok = result.invite_sent
  async function copy() {
    try { await navigator.clipboard.writeText(result.setup_url); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch {
      window.prompt('Copy this set-up link:', result.setup_url)
    }
  }
  return (
    <div role="status" className={cn('border p-4 mb-5', ok ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/40')}>
      <div className="flex items-start gap-3">
        {ok ? <MailCheck size={20} className="text-green-400 shrink-0 mt-0.5" /> : <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <p className={cn('font-body text-[0.95rem] font-semibold', ok ? 'text-green-400' : 'text-amber-400')}>
            {ok ? `Invite emailed to ${result.user.email}` : 'Invite created, but the email failed. Copy the link below and send it yourself.'}
          </p>
          <p className="font-body text-[0.88rem] text-cream-soft/80 mt-1">
            {ok
              ? `${result.user.full_name} will get a link to choose a password (valid 72 hours, single use). You can also copy the link and send it by WhatsApp.`
              : `${result.user.full_name}'s account exists and is waiting for them. Send this link by WhatsApp or text. It is valid for 72 hours and works once.`}
          </p>
          {!ok && result.email_error && <p className="font-body text-[0.9rem] text-cream-soft/85 mt-1 break-words">Mail server said: {result.email_error}</p>}
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <input readOnly value={result.setup_url} onFocus={(e) => e.target.select()} className={cn(inputCls, 'text-[0.9rem] flex-1')} aria-label="Set-up link" />
            <button type="button" onClick={copy} className="min-h-[44px] inline-flex items-center justify-center gap-2 border border-gold/40 text-gold font-title text-[0.8rem] tracking-[0.14em] uppercase px-4 hover:bg-gold/10">
              {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Dismiss" className="w-11 h-11 -mr-2 -mt-2 grid place-items-center text-cream-soft/85 hover:text-gold"><X size={18} /></button>
      </div>
    </div>
  )
}

function InviteForm({ onDone, onCancel }) {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'content_editor', title: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await inviteStaff({ email: form.email.trim(), full_name: form.full_name.trim(), role: form.role, title: form.title.trim() || undefined })
      onDone(res)
    } catch (err) {
      setError(err.message || 'Could not create the invite.')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="bg-charcoal border border-gold/20 p-4 sm:p-5 mb-5">
      <h3 className="font-title text-[0.9rem] tracking-[0.16em] uppercase text-gold mb-1">Invite a team member</h3>
      <p className="font-body text-[0.88rem] text-cream-soft/75 mb-4">They get an email with a link to choose their own password. No password is set by you.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="inv-name">Full name</label>
          <input id="inv-name" className={inputCls} value={form.full_name} onChange={set('full_name')} placeholder="Chidera Nwosu" required autoComplete="off" />
        </div>
        <div>
          <label className={labelCls} htmlFor="inv-email">Email address</label>
          <input id="inv-email" type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="chidera@maximsinterior.com.ng" required autoComplete="off" />
        </div>
        <div>
          <label className={labelCls} htmlFor="inv-role">Role</label>
          <select id="inv-role" className={inputCls} value={form.role} onChange={set('role')}>
            {ROLE_OPTS.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{ROLE_PERMISSIONS[r].label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="inv-title">Job title (optional)</label>
          <input id="inv-title" className={inputCls} value={form.title} onChange={set('title')} placeholder="Interior Designer" />
        </div>
      </div>
      {error && <p className="font-body text-[0.88rem] text-amber-400 mt-3">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-3 mt-5">
        <button type="submit" disabled={busy} className="min-h-[44px] inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.8rem] font-bold tracking-[0.16em] uppercase px-6 disabled:opacity-50">
          <UserPlus size={15} />{busy ? 'Sending invite...' : 'Send invite'}
        </button>
        <button type="button" onClick={onCancel} className="min-h-[44px] px-6 border border-gold/25 text-cream-soft/80 font-title text-[0.8rem] tracking-[0.14em] uppercase hover:text-gold">Cancel</button>
      </div>
    </form>
  )
}

export default function StaffAccounts({ startOpen = false }) {
  const { profile, isOwner } = useAuth()
  const { data: profiles, loading, refresh } = useProfiles()
  const [showInvite, setShowInvite] = useState(startOpen)
  const [result, setResult] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  async function act(p, fn) {
    setBusyId(p.id); setError('')
    try { await fn() } catch (err) { setError(err.message) }
    setBusyId(null)
    refresh()
  }
  const resend = (p) => act(p, async () => { setResult(await api.post(`/profiles/${p.id}/resend-invite`)) })
  const remove = (p) => {
    const pending = p.invite_pending && !p.last_seen
    const msg = pending
      ? `Cancel the invite for ${p.full_name}? Their set-up link will stop working.`
      : `Deactivate ${p.full_name}? They will be signed out and cannot sign in until reactivated.`
    if (!window.confirm(msg)) return
    act(p, () => api.del(`/profiles/${p.id}`))
  }
  const reactivate = (p) => act(p, () => api.patch(`/profiles/${p.id}`, { is_active: true }))
  const changeRole = (p, role) => act(p, () => updateProfileRole(p.id, role))

  const sorted = [...profiles].sort((a, b) => Number(b.is_active) - Number(a.is_active))
  const pendingCount = profiles.filter((p) => p.is_active && p.invite_pending).length

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-title text-[0.95rem] tracking-[0.16em] uppercase text-cream-soft">Team members ({profiles.filter((p) => p.is_active).length})</h2>
          {pendingCount > 0 && <p className="font-body text-[0.95rem] text-amber-400 mt-0.5">{pendingCount} invite{pendingCount > 1 ? 's' : ''} waiting to be accepted</p>}
        </div>
        {isOwner && !showInvite && (
          <button onClick={() => { setShowInvite(true); setResult(null) }}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.8rem] font-bold tracking-[0.16em] uppercase px-5">
            <UserPlus size={15} /> Invite team member
          </button>
        )}
      </div>

      {showInvite && <InviteForm onCancel={() => setShowInvite(false)} onDone={(res) => { setShowInvite(false); setResult(res); refresh() }} />}
      <InviteResult result={result} onClose={() => setResult(null)} />
      {error && <p className="font-body text-[0.9rem] text-amber-400 mb-3">{error}</p>}

      <ul className="bg-charcoal border border-gold/15 divide-y divide-gold/10">
        {loading && <li className="p-5 font-body text-cream-soft/70">Loading team...</li>}
        {sorted.map((p) => {
          const st = statusOf(p)
          const self = p.id === profile?.id
          const canManage = isOwner && !self
          return (
            <li key={p.id} className={cn('p-4 flex flex-col md:flex-row md:items-center gap-3', !p.is_active && 'opacity-70')}>
              <div className="flex items-center gap-3 min-w-0 md:w-[34%]">
                <div className="w-10 h-10 rounded-full bg-purple-rich border border-gold/30 flex items-center justify-center shrink-0">
                  <span className="font-title text-sm text-gold">{p.full_name?.[0]}</span>
                </div>
                <div className="min-w-0">
                  <div className="font-body text-[0.95rem] font-semibold text-cream-soft truncate">
                    {p.full_name} {self && <span className="font-title text-[0.74rem] tracking-wider uppercase text-gold bg-gold/10 px-1.5 py-0.5 ml-1">you</span>}
                  </div>
                  <div className="font-body text-[0.95rem] text-cream-soft/70 truncate">{p.email}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:w-[36%]">
                {canManage && p.is_active ? (
                  <select aria-label={`Role for ${p.full_name}`} value={p.role} disabled={busyId === p.id} onChange={(e) => changeRole(p, e.target.value)}
                    className="min-h-[44px] bg-charcoal-mid border border-gold/20 px-2 font-body text-[0.95rem] text-cream-soft focus:outline-none focus:border-gold/60">
                    {ROLE_OPTS.map((r) => <option key={r} value={r}>{ROLE_PERMISSIONS[r].label}</option>)}
                  </select>
                ) : (
                  <span className="font-body text-[0.95rem] text-cream-soft/85">{ROLE_PERMISSIONS[p.role]?.label}</span>
                )}
                <span className={cn('font-body text-[0.84rem] font-bold tracking-wide uppercase border px-2 py-1', st.cls)}>{st.label}</span>
                <span className="font-body text-[0.9rem] text-cream-soft/85">
                  {st.key === 'pending' ? `Invited ${fmtDate(p.invited_at || p.created_at)}` : p.last_seen ? `Last seen ${fmtDate(p.last_seen)}` : 'Never signed in'}
                </span>
              </div>

              {canManage && (
                <div className="flex flex-wrap gap-2 md:ml-auto">
                  {st.key === 'pending' && (
                    <button onClick={() => resend(p)} disabled={busyId === p.id} className="min-h-[44px] inline-flex items-center gap-2 border border-gold/35 text-gold font-title text-[0.76rem] tracking-[0.12em] uppercase px-3 hover:bg-gold/10 disabled:opacity-50">
                      <RefreshCw size={13} className={busyId === p.id ? 'animate-spin' : ''} /> Resend invite
                    </button>
                  )}
                  {st.key === 'inactive' ? (
                    <button onClick={() => reactivate(p)} disabled={busyId === p.id} className="min-h-[44px] border border-green-400/40 text-green-400 font-title text-[0.76rem] tracking-[0.12em] uppercase px-3 hover:bg-green-400/10">Reactivate</button>
                  ) : p.role !== 'owner' && (
                    <button onClick={() => remove(p)} disabled={busyId === p.id} className="min-h-[44px] border border-red-400/35 text-red-400 font-title text-[0.76rem] tracking-[0.12em] uppercase px-3 hover:bg-red-400/10">
                      {st.key === 'pending' && !p.last_seen ? 'Cancel invite' : 'Remove'}
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="font-body text-[0.95rem] text-cream-soft/85 mt-3">
        Remove deactivates an account (history is kept; you can reactivate it). Cancelling a pending invite deletes it.
        Invite emails are sent from the Maxims mail server; use Settings &gt; Email to send yourself a test.
      </p>
    </div>
  )
}
