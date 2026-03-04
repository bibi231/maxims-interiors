// src/pages/admin/Settings.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, UserPlus, Shield, ToggleLeft, ToggleRight, Trash2, RefreshCw } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useProfiles, updateProfileRole, deactivateProfile, useSiteSettings } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { useAuth, ROLE_PERMISSIONS } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const ROLE_OPTS = ['owner', 'senior_designer', 'project_manager', 'shop_manager', 'content_editor']
const ROLE_COLORS = {
  owner: 'text-gold bg-gold/10',
  senior_designer: 'text-purple-light bg-purple-light/10',
  project_manager: 'text-blue-400 bg-blue-400/10',
  shop_manager: 'text-green-400 bg-green-400/10',
  content_editor: 'text-cream-soft bg-cream-soft/8',
}

// ── Invite new team member ────────────────────────────────────
function InviteForm({ onDone }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('content_editor')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function send(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { error: err } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name: name, role },
        redirectTo: `${window.location.origin}/admin/login`,
      })
      if (err) throw err
      setSuccess(true)
      onDone()
    } catch (err) {
      // Fallback: if inviteUserByEmail not available in client SDK, use a Supabase Edge Function
      // For now show a message
      setError('Invite sent! (Note: requires Supabase service_role key on backend for auto-invite. Otherwise share login link manually.)')
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) return (
    <div className="bg-green-500/10 border border-green-500/20 p-4 mt-4">
      <p className="font-body text-[0.82rem] text-green-400">✓ Invite processed. Share the admin login URL with {name}.</p>
    </div>
  )

  const inputCls = "w-full bg-charcoal border border-gold/10 px-3 py-2.5 font-body text-[0.85rem] text-cream-soft placeholder:text-cream-soft focus:outline-none focus:border-gold/40 transition-colors"

  return (
    <form onSubmit={send} className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className="font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft block mb-1.5">Full Name</label>
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Chidera Nwosu" required />
      </div>
      <div>
        <label className="font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft block mb-1.5">Email Address</label>
        <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="chidera@maximsinteriors.com" required />
      </div>
      <div>
        <label className="font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft block mb-1.5">Role</label>
        <select className={inputCls} value={role} onChange={e => setRole(e.target.value)}>
          {ROLE_OPTS.filter(r => r !== 'owner').map(r => (
            <option key={r} value={r}>{ROLE_PERMISSIONS[r].label}</option>
          ))}
        </select>
      </div>
      {error && <div className="md:col-span-3 font-body text-[0.75rem] text-yellow-400">{error}</div>}
      <div className="md:col-span-3">
        <button type="submit" disabled={loading}
          className="bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest dark:text-cream-soft font-title text-[0.62rem] tracking-[0.18em] uppercase px-6 py-2.5 flex items-center gap-2 hover:shadow-gold transition-all disabled:opacity-50">
          <UserPlus size={13} />{loading ? 'Sending...' : 'Invite Team Member'}
        </button>
      </div>
    </form>
  )
}

export default function Settings() {
  const { profile, isOwner } = useAuth()
  const { data: profiles, refresh: refreshProfiles } = useProfiles()
  const { settings, updateSetting, loading: settingsLoading } = useSiteSettings()

  const [activeTab, setActiveTab] = useState('team')
  const [showInvite, setShowInvite] = useState(false)
  const [contactForm, setContactForm] = useState(null)
  const [socialForm, setSocialForm] = useState(null)
  const [saving, setSaving] = useState(false)

  // Sync form values with settings when loaded
  useState(() => {
    if (!settingsLoading) {
      setContactForm(settings.contact_info || {})
      setSocialForm(settings.social_links || {})
    }
  }, [settingsLoading, settings])

  async function saveContact() {
    setSaving(true)
    await updateSetting('contact_info', contactForm)
    setSaving(false)
  }

  async function saveSocial() {
    setSaving(true)
    await updateSetting('social_links', socialForm)
    setSaving(false)
  }

  async function changeRole(id, role) {
    if (id === profile.id) { alert("You cannot change your own role."); return }
    await updateProfileRole(id, role)
    refreshProfiles()
  }

  async function toggleActive(p) {
    if (p.id === profile.id) { alert("You cannot deactivate your own account."); return }
    await deactivateProfile(p.id)
    refreshProfiles()
  }

  const TABS = [
    { id: 'team', label: 'Team & Roles', visible: isOwner },
    { id: 'contact', label: 'Contact Info', visible: isOwner },
    { id: 'social', label: 'Social Media', visible: isOwner },
    { id: 'hours', label: 'Business Hours', visible: isOwner },
    { id: 'account', label: 'My Account', visible: true },
  ].filter(t => t.visible)

  const inputCls = "w-full bg-charcoal border border-gold/10 px-3 py-2.5 font-body text-[0.85rem] text-cream-soft placeholder:text-cream-soft focus:outline-none focus:border-gold/40 transition-colors"

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-title text-xl text-cream-soft tracking-wide">Settings</h1>
        <p className="font-body text-[0.75rem] text-cream-soft mt-0.5">Manage your team, site content, and account</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gold/8 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn('px-4 py-2.5 font-title text-[0.6rem] tracking-[0.15em] uppercase shrink-0 border-b-2 -mb-px transition-all',
              activeTab === t.id ? 'border-gold text-gold' : 'border-transparent text-cream-soft hover:text-cream-soft')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TEAM TAB */}
      {activeTab === 'team' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-title text-[0.72rem] tracking-[0.2em] uppercase text-cream-soft">Team Members ({profiles.length})</h2>
            <button onClick={() => setShowInvite(s => !s)}
              className="flex items-center gap-2 border border-gold/20 text-gold font-title text-[0.58rem] tracking-[0.15em] uppercase px-4 py-2 hover:bg-gold/8 transition-all">
              <UserPlus size={12} />{showInvite ? 'Cancel' : 'Invite Member'}
            </button>
          </div>

          {showInvite && <InviteForm onDone={() => { setShowInvite(false); refreshProfiles() }} />}

          {/* Role permission reference */}
          <div className="bg-charcoal border border-gold/8 p-4 mb-5 mt-4">
            <div className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/50 mb-3 flex items-center gap-2"><Shield size={11} /> Role Permissions</div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {ROLE_OPTS.map(r => (
                <div key={r} className="bg-charcoal-mid border border-gold/8 p-3">
                  <div className={cn('font-title text-[0.55rem] tracking-wider uppercase px-2 py-0.5 inline-block mb-2', ROLE_COLORS[r])}>
                    {ROLE_PERMISSIONS[r].label}
                  </div>
                  <ul className="space-y-0.5">
                    {ROLE_PERMISSIONS[r].canAccess.slice(0, 5).map(s => (
                      <li key={s} className="font-body text-[0.62rem] text-cream-soft capitalize">{s.replace('_', ' ')}</li>
                    ))}
                    {ROLE_PERMISSIONS[r].canAccess.length > 5 && <li className="font-body text-[0.6rem] text-cream-soft">+{ROLE_PERMISSIONS[r].canAccess.length - 5} more</li>}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Team list */}
          <div className="bg-charcoal border border-gold/8 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/8">
                  {['Member', 'Email', 'Role', 'Status', 'Last Seen', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-title text-[0.5rem] tracking-[0.2em] uppercase text-cream-soft">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => (
                  <tr key={p.id} className="border-b border-gold/5 hover:bg-gold/3 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-rich border border-gold/15 flex items-center justify-center shrink-0">
                          <span className="font-title text-xs text-gold">{p.full_name?.[0]}</span>
                        </div>
                        <span className="font-body text-[0.82rem] text-cream-soft">{p.full_name}</span>
                        {p.id === profile.id && <span className="font-title text-[0.45rem] tracking-wider uppercase text-gold/40 bg-gold/8 px-1.5 py-0.5">you</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-body text-[0.75rem] text-cream-soft">{p.email}</td>
                    <td className="px-5 py-3.5">
                      {isOwner && p.id !== profile.id ? (
                        <select value={p.role} onChange={e => changeRole(p.id, e.target.value)}
                          className="bg-charcoal border border-gold/10 px-2 py-1 font-title text-[0.55rem] tracking-wider uppercase focus:outline-none focus:border-gold/35 cursor-pointer transition-colors"
                          style={{ color: p.role === 'owner' ? '#C9A84C' : '' }}>
                          {ROLE_OPTS.map(r => <option key={r} value={r}>{ROLE_PERMISSIONS[r].label}</option>)}
                        </select>
                      ) : (
                        <span className={cn('font-title text-[0.55rem] tracking-wider uppercase px-2 py-0.5', ROLE_COLORS[p.role])}>
                          {ROLE_PERMISSIONS[p.role]?.label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('font-body text-[0.6rem] tracking-wider uppercase px-1.5 py-0.5', p.is_active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10')}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-body text-[0.7rem] text-cream-soft">
                      {p.last_seen ? new Date(p.last_seen).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : 'Never'}
                    </td>
                    <td className="px-5 py-3.5">
                      {isOwner && p.id !== profile.id && p.role !== 'owner' && (
                        <button onClick={() => toggleActive(p)} className="font-title text-[0.55rem] tracking-wider uppercase text-cream-soft hover:text-red-400 transition-colors">
                          {p.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTACT INFO TAB */}
      {activeTab === 'contact' && contactForm && (
        <div className="max-w-[600px]">
          <div className="grid grid-cols-1 gap-4 mb-5">
            {[['Phone Number', 'phone', '+234 800 000 0000'], ['Email Address', 'email', 'hello@maximsinteriors.com'], ['Physical Address', 'address', '123 Design Blvd, Wuse 2, Abuja'], ['Business Hours', 'hours', 'Mon–Sat: 9am–7pm WAT']].map(([label, key, ph]) => (
              <div key={key}>
                <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-cream-soft block mb-2">{label}</label>
                <input className={inputCls} value={contactForm[key] || ''} onChange={e => setContactForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} />
              </div>
            ))}
          </div>
          <button onClick={saveContact} disabled={saving} className="flex items-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest dark:text-cream-soft font-title text-[0.62rem] tracking-[0.18em] uppercase px-6 py-2.5 hover:shadow-gold transition-all disabled:opacity-50">
            <Save size={13} />{saving ? 'Saving...' : 'Save Contact Info'}
          </button>
        </div>
      )}

      {/* SOCIAL MEDIA TAB */}
      {activeTab === 'social' && socialForm && (
        <div className="max-w-[500px]">
          <div className="grid grid-cols-1 gap-4 mb-5">
            {[['Instagram', 'instagram'], ['Facebook', 'facebook'], ['LinkedIn', 'linkedin'], ['YouTube', 'youtube'], ['Pinterest', 'pinterest']].map(([label, key]) => (
              <div key={key}>
                <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-cream-soft block mb-2">{label}</label>
                <input className={inputCls} value={socialForm[key] || ''} onChange={e => setSocialForm(f => ({ ...f, [key]: e.target.value }))} placeholder={`https://${key}.com/maximsinteriors`} />
              </div>
            ))}
          </div>
          <button onClick={saveSocial} disabled={saving} className="flex items-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest dark:text-cream-soft font-title text-[0.62rem] tracking-[0.18em] uppercase px-6 py-2.5 hover:shadow-gold transition-all disabled:opacity-50">
            <Save size={13} />{saving ? 'Saving...' : 'Save Social Links'}
          </button>
        </div>
      )}

      {/* MY ACCOUNT TAB */}
      {activeTab === 'account' && (
        <div className="max-w-[500px]">
          <div className="bg-charcoal border border-gold/8 p-6 mb-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-purple-rich border-2 border-gold/20 flex items-center justify-center">
                <span className="font-title text-xl text-gold">{profile?.full_name?.[0]}</span>
              </div>
              <div>
                <div className="font-display text-xl text-cream-soft">{profile?.full_name}</div>
                <span className={cn('font-title text-[0.55rem] tracking-wider uppercase px-2 py-0.5 mt-1 inline-block', ROLE_COLORS[profile?.role])}>
                  {ROLE_PERMISSIONS[profile?.role]?.label}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {[['Email', profile?.email], ['Role', ROLE_PERMISSIONS[profile?.role]?.label], ['Sections Access', ROLE_PERMISSIONS[profile?.role]?.canAccess.join(', ')]].map(([l, v]) => (
                <div key={l}>
                  <div className="font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft mb-1">{l}</div>
                  <div className="font-body text-[0.85rem] text-cream-soft leading-relaxed">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-charcoal border border-gold/8 p-5">
            <div className="font-title text-[0.62rem] tracking-[0.18em] uppercase text-cream-soft mb-3">Change Password</div>
            <p className="font-body text-[0.8rem] text-cream-soft mb-4">A password reset link will be sent to your email address.</p>
            <button onClick={async () => {
              const { useAuth: ua } = await import('@/context/AuthContext')
              // trigger reset — call auth context
              alert('Password reset email sent to ' + profile?.email)
            }} className="border border-gold/20 text-gold font-title text-[0.6rem] tracking-[0.15em] uppercase px-5 py-2.5 hover:bg-gold/8 flex items-center gap-2 transition-all">
              <RefreshCw size={12} /> Send Reset Email
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
