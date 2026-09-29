// src/pages/admin/Settings.jsx
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Save, Shield, RefreshCw, Send, CheckCircle2, AlertTriangle } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import StaffAccounts from '@/components/admin/StaffAccounts'
import { api } from '@/lib/api'
import { useSiteSettings } from '@/hooks/useData'
import { useAuth, ROLE_PERMISSIONS } from '@/context/AuthContext'
import { DEFAULT_CONTACT } from '@/lib/siteDefaults'
import { cn } from '@/lib/utils'

const ROLE_OPTS = ['owner', 'senior_designer', 'project_manager', 'shop_manager', 'content_editor']
const ROLE_COLORS = {
  owner:            'text-gold bg-gold/10',
  senior_designer:  'text-purple-light bg-purple-light/10',
  project_manager:  'text-blue-400 bg-blue-400/10',
  shop_manager:     'text-green-400 bg-green-400/10',
  content_editor:   'text-cream-soft/80 bg-cream-soft/10',
}

const labelCls = 'font-title text-[0.76rem] tracking-[0.16em] uppercase text-cream-soft/75 block mb-2'
const inputCls = 'w-full min-h-[44px] bg-charcoal border border-gold/20 px-3 py-2.5 font-body text-[0.95rem] text-cream-soft placeholder:text-cream-soft/40 focus:outline-none focus:border-gold/60 transition-colors'
const saveBtn = 'min-h-[44px] inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.8rem] font-bold tracking-[0.16em] uppercase px-6 hover:shadow-gold transition-all disabled:opacity-50'

// ── Change own password ───────────────────────────────────────
function ChangePasswordForm() {
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    if (pwd.length < 8) return setMsg({ ok: false, text: 'Password must be at least 8 characters.' })
    if (pwd !== confirm) return setMsg({ ok: false, text: 'The two passwords do not match.' })
    setBusy(true)
    try {
      await api.put('/auth/me', { password: pwd })
      setPwd(''); setConfirm('')
      setMsg({ ok: true, text: 'Password updated.' })
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not update password.' })
    }
    setBusy(false)
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="password" className={inputCls} value={pwd} onChange={e => setPwd(e.target.value)} placeholder="New password (min. 8 characters)" autoComplete="new-password" aria-label="New password" />
      <input type="password" className={inputCls} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" aria-label="Confirm new password" />
      {msg && <p className={`font-body text-[0.88rem] ${msg.ok ? 'text-green-400' : 'text-amber-400'}`}>{msg.text}</p>}
      <button disabled={busy} className="min-h-[44px] inline-flex items-center gap-2 border border-gold/40 text-gold font-title text-[0.8rem] tracking-[0.14em] uppercase px-5 hover:bg-gold/10 disabled:opacity-40">
        <RefreshCw size={13} /> {busy ? 'Saving...' : 'Update password'}
      </button>
    </form>
  )
}

// ── Email (SMTP) check ────────────────────────────────────────
function EmailTab() {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  async function test() {
    setBusy(true); setState(null)
    try { const r = await api.post('/settings/test-email'); setState({ ok: true, text: `Test email sent to ${r.to} via ${r.host}. Check that inbox (and spam).` }) }
    catch (err) { setState({ ok: false, text: err.message }) }
    setBusy(false)
  }
  return (
    <div className="max-w-[640px]">
      <div className="bg-charcoal border border-gold/15 p-5">
        <h2 className="font-title text-[0.9rem] tracking-[0.16em] uppercase text-gold mb-2">Site email</h2>
        <p className="font-body text-[0.92rem] text-cream-soft/85 leading-relaxed mb-4">
          Invites, password resets, order confirmations and staff alerts are sent through the Maxims mail server
          (mail.maximsinterior.com.ng) using the mailbox set on the server. Send yourself a test to confirm it works.
        </p>
        <button onClick={test} disabled={busy} className={saveBtn}><Send size={14} />{busy ? 'Sending...' : 'Send me a test email'}</button>
        {state && (
          <div className={cn('mt-4 flex items-start gap-2 border p-3', state.ok ? 'border-green-500/30 bg-green-500/10' : 'border-amber-500/40 bg-amber-500/10')}>
            {state.ok ? <CheckCircle2 size={17} className="text-green-400 shrink-0 mt-0.5" /> : <AlertTriangle size={17} className="text-amber-400 shrink-0 mt-0.5" />}
            <p className={cn('font-body text-[0.88rem] break-words', state.ok ? 'text-green-400' : 'text-amber-400')}>{state.text}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const { profile, isOwner } = useAuth()
  const { settings, updateSetting, loading: settingsLoading } = useSiteSettings()
  const [params] = useSearchParams()

  const [activeTab,   setActiveTab]   = useState(() => params.get('tab') || (isOwner ? 'team' : 'account'))
  const [contactForm, setContactForm] = useState(null)
  const [socialForm,  setSocialForm]  = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [savedMsg,    setSavedMsg]    = useState('')

  useEffect(() => {
    if (!settingsLoading) {
      setContactForm({ ...DEFAULT_CONTACT, ...(settings.contact_info || {}) })
      setSocialForm(settings.social_links || {})
    }
  }, [settingsLoading, settings])

  async function save(key, value) {
    setSaving(true); setSavedMsg('')
    try { await updateSetting(key, value); setSavedMsg('Saved. The website now shows the new details.') }
    catch (err) { setSavedMsg(err.message || 'Could not save.') }
    setSaving(false)
  }

  const TABS = [
    { id: 'team',     label: 'Team & Roles',    visible: isOwner },
    { id: 'contact',  label: 'Contact & Address', visible: isOwner },
    { id: 'social',   label: 'Social Media',    visible: isOwner },
    { id: 'email',    label: 'Email',           visible: isOwner },
    { id: 'account',  label: 'My Account',      visible: true },
  ].filter(t => t.visible)

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-title text-xl text-cream-soft tracking-wide">Settings</h1>
        <p className="font-body text-[0.9rem] text-cream-soft/70 mt-0.5">Manage your team, site details, and account</p>
      </div>

      <div className="flex gap-1 border-b border-gold/15 mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={activeTab === t.id} onClick={() => { setActiveTab(t.id); setSavedMsg('') }}
            className={cn('min-h-[44px] px-4 font-title text-[0.8rem] tracking-[0.14em] uppercase shrink-0 border-b-2 -mb-px transition-all',
              activeTab === t.id ? 'border-gold text-gold' : 'border-transparent text-cream-soft/70 hover:text-cream-soft')}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'team' && (
        <div>
          <StaffAccounts startOpen={params.get('invite') === '1'} />

          <div className="bg-charcoal border border-gold/15 p-4 mt-6">
            <div className="font-title text-[0.8rem] tracking-[0.16em] uppercase text-gold mb-3 flex items-center gap-2"><Shield size={13} /> What each role can see</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {ROLE_OPTS.map(r => (
                <div key={r} className="bg-charcoal-mid border border-gold/10 p-3">
                  <div className={cn('font-title text-[0.76rem] tracking-wider uppercase px-2 py-0.5 inline-block mb-2', ROLE_COLORS[r])}>
                    {ROLE_PERMISSIONS[r].label}
                  </div>
                  <p className="font-body text-[0.95rem] text-cream-soft/75 capitalize leading-relaxed">
                    {ROLE_PERMISSIONS[r].canAccess.map(s => s.replace('_', ' ')).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contact' && contactForm && (
        <div className="max-w-[640px]">
          <p className="font-body text-[0.9rem] text-cream-soft/75 mb-5">These details appear in the website footer, the Contact page, search-engine business data, and appointment emails.</p>
          <div className="grid grid-cols-1 gap-4 mb-5">
            {[['Phone Number', 'phone', '+234 ...'], ['WhatsApp Number (optional)', 'whatsapp', '+234 ...'], ['Email Address', 'email', 'info@maximsinterior.com.ng'], ['Physical Address', 'address', DEFAULT_CONTACT.address], ['Business Hours', 'hours', 'Mon–Sat: 9am–6pm WAT'], ['Google Maps link (optional)', 'map_url', 'https://maps.google.com/?q=...']].map(([label, key, ph]) => (
              <div key={key}>
                <label className={labelCls} htmlFor={`ci-${key}`}>{label}</label>
                <input id={`ci-${key}`} className={inputCls} value={contactForm[key] || ''} onChange={e => setContactForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} />
              </div>
            ))}
          </div>
          <button onClick={() => save('contact_info', contactForm)} disabled={saving} className={saveBtn}>
            <Save size={14} />{saving ? 'Saving...' : 'Save contact details'}
          </button>
          {savedMsg && <p className="font-body text-[0.88rem] text-green-400 mt-3">{savedMsg}</p>}
        </div>
      )}

      {activeTab === 'social' && socialForm && (
        <div className="max-w-[560px]">
          <div className="grid grid-cols-1 gap-4 mb-5">
            {[['Instagram', 'instagram'], ['Facebook', 'facebook'], ['LinkedIn', 'linkedin'], ['YouTube', 'youtube'], ['Pinterest', 'pinterest']].map(([label, key]) => (
              <div key={key}>
                <label className={labelCls} htmlFor={`so-${key}`}>{label}</label>
                <input id={`so-${key}`} className={inputCls} value={socialForm[key] || ''} onChange={e => setSocialForm(f => ({ ...f, [key]: e.target.value }))} placeholder={`https://${key}.com/maximsinteriors`} />
              </div>
            ))}
          </div>
          <button onClick={() => save('social_links', socialForm)} disabled={saving} className={saveBtn}>
            <Save size={14} />{saving ? 'Saving...' : 'Save social links'}
          </button>
          {savedMsg && <p className="font-body text-[0.88rem] text-green-400 mt-3">{savedMsg}</p>}
        </div>
      )}

      {activeTab === 'email' && <EmailTab />}

      {activeTab === 'account' && (
        <div className="max-w-[560px]">
          <div className="bg-charcoal border border-gold/15 p-5 sm:p-6 mb-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-purple-rich border-2 border-gold/30 flex items-center justify-center shrink-0">
                <span className="font-title text-xl text-gold">{profile?.full_name?.[0]}</span>
              </div>
              <div className="min-w-0">
                <div className="font-display text-2xl font-semibold text-cream-soft truncate">{profile?.full_name}</div>
                <span className={cn('font-title text-[0.76rem] tracking-wider uppercase px-2 py-0.5 mt-1 inline-block', ROLE_COLORS[profile?.role])}>
                  {ROLE_PERMISSIONS[profile?.role]?.label}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {[['Email', profile?.email], ['Role', ROLE_PERMISSIONS[profile?.role]?.label], ['Sections you can open', ROLE_PERMISSIONS[profile?.role]?.canAccess.map(s => s.replace('_', ' ')).join(', ')]].map(([l, v]) => (
                <div key={l}>
                  <div className="font-title text-[0.76rem] tracking-[0.16em] uppercase text-cream-soft/85 mb-1">{l}</div>
                  <div className="font-body text-[0.95rem] text-cream-soft/90 leading-relaxed break-words">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-charcoal border border-gold/15 p-5">
            <div className="font-title text-[0.8rem] tracking-[0.16em] uppercase text-cream-soft/85 mb-3">Change Password</div>
            <ChangePasswordForm />
            <p className="font-body text-[0.95rem] text-cream-soft/85 mt-3">
              Forgotten passwords can be reset from the sign-in page with “Forgot your password?”.
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
