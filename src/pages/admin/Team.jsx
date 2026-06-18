// src/pages/admin/Team.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Upload, ToggleLeft, ToggleRight } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useTeamMembers, upsertTeamMember, deleteTeamMember, useProfiles, logActivity } from '@/hooks/useData'
import { uploadFile, getStorageUrl, BUCKETS } from '@/lib/storage'
import { useAuth } from '@/context/AuthContext'

const BLANK = { full_name: '', title: '', bio: '', photo_url: '', instagram: '', linkedin: '', sort_order: 0, is_published: true, profile_id: '' }

function MemberForm({ initial = BLANK, onClose, onSave, profiles, profileId }) {
  const [form, setForm] = useState({ ...BLANK, ...initial })
  const [saving, setSaving] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function upload(e) {
    const file = e.target.files[0]; if (!file) return
    setImgBusy(true)
    try { const path = await uploadFile(BUCKETS.team, file, 'members'); set('photo_url', getStorageUrl(BUCKETS.team, path)) }
    catch { alert('Upload failed') }
    setImgBusy(false)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, sort_order: Number(form.sort_order), profile_id: form.profile_id || null }
      const saved = await upsertTeamMember(payload)
      await logActivity({ userId: profileId, action: initial.id ? 'updated' : 'created', resourceType: 'team_member', resourceId: saved.id, description: `${initial.id ? 'Updated' : 'Added'} team member ${saved.full_name}` })
      onSave()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  return (
    <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-[560px] bg-charcoal-mid border border-gold/15 max-h-[88vh] overflow-y-auto"
        initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
          <h2 className="font-display text-xl text-cream-soft">{initial.id ? 'Edit Member' : 'New Member'}</h2>
          <button onClick={onClose} className="text-cream-soft/30 hover:text-gold"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border border-gold/15 overflow-hidden bg-charcoal grid place-items-center shrink-0">
              {form.photo_url ? <img src={form.photo_url} className="w-full h-full object-cover" /> : <span className="text-2xl opacity-30">👤</span>}
            </div>
            <label className="btn-outline-gold cursor-pointer text-[0.6rem]"><Upload size={13} /> {imgBusy ? 'Uploading…' : 'Upload Photo'}<input type="file" accept="image/*" className="hidden" onChange={upload} disabled={imgBusy} /></label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Lbl label="Full Name"><input className="lux-input" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required /></Lbl>
            <Lbl label="Title"><input className="lux-input" value={form.title} onChange={(e) => set('title', e.target.value)} required /></Lbl>
          </div>
          <Lbl label="Bio"><textarea rows={3} className="lux-input resize-none" value={form.bio} onChange={(e) => set('bio', e.target.value)} /></Lbl>
          <div className="grid grid-cols-2 gap-4">
            <Lbl label="Instagram URL"><input className="lux-input" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} /></Lbl>
            <Lbl label="LinkedIn URL"><input className="lux-input" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} /></Lbl>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Lbl label="Sort Order"><input type="number" className="lux-input" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></Lbl>
            <Lbl label="Link to staff account (optional)">
              <select className="lux-input" value={form.profile_id || ''} onChange={(e) => set('profile_id', e.target.value)}>
                <option value="">None</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
              </select>
            </Lbl>
          </div>
          <button type="button" onClick={() => set('is_published', !form.is_published)} className="flex items-center gap-2.5">
            {form.is_published ? <ToggleRight size={22} className="text-gold" /> : <ToggleLeft size={22} className="text-cream-soft/25" />}
            <span className="font-title text-[0.6rem] tracking-[0.15em] uppercase text-cream-soft/45">Published</span>
          </button>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.65rem] tracking-[0.18em] uppercase py-3 disabled:opacity-50">{saving ? 'Saving…' : initial.id ? 'Update' : 'Create'}</button>
            <button type="button" onClick={onClose} className="px-6 border border-gold/15 text-cream-soft/40 hover:text-cream-soft/70 font-title text-[0.62rem] uppercase">Cancel</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
const Lbl = ({ label, children }) => (
  <div><label className="font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft/35 block mb-2">{label}</label>{children}</div>
)

export default function Team() {
  const [form, setForm] = useState(null)
  const { canWrite, profile, isOwner } = useAuth()
  const { data: members, loading, refresh } = useTeamMembers(false)
  const { data: profiles } = useProfiles()

  async function remove(id) {
    if (!confirm('Delete this team member?')) return
    await deleteTeamMember(id); refresh()
  }
  async function togglePublish(m) { await upsertTeamMember({ id: m.id, is_published: !m.is_published }); refresh() }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Team</h1>
          <p className="font-body text-[0.75rem] text-cream-soft/30 mt-0.5">{members.length} members</p>
        </div>
        {canWrite('team') && <button onClick={() => setForm({})} className="flex items-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.62rem] tracking-[0.18em] uppercase px-5 py-2.5"><Plus size={13} /> Add Member</button>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array(4).fill(0).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)
          : members.map((m) => (
            <div key={m.id} className="bg-charcoal border border-gold/8 group hover:border-gold/22 transition-all">
              <div className="aspect-[3/4] relative overflow-hidden bg-charcoal-mid">
                {m.photo_url ? <img src={m.photo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-3xl opacity-20">👤</div>}
                {!m.is_published && <span className="absolute top-2 right-2 bg-charcoal/80 text-cream-soft/60 font-title text-[0.45rem] uppercase px-2 py-0.5">Hidden</span>}
                {canWrite('team') && (
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setForm(m)} className="w-7 h-7 bg-charcoal/80 border border-gold/15 text-cream-soft/60 hover:text-gold grid place-items-center"><Edit2 size={11} /></button>
                    {isOwner && <button onClick={() => remove(m.id)} className="w-7 h-7 bg-charcoal/80 border border-red-500/20 text-red-500/50 hover:text-red-400 grid place-items-center"><Trash2 size={11} /></button>}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-editorial text-[0.9rem] text-cream-soft/80">{m.full_name}</h3>
                <p className="font-title text-[0.6rem] tracking-wide uppercase text-gold/70 mt-0.5">{m.title}</p>
                {canWrite('team') && (
                  <button onClick={() => togglePublish(m)} className="mt-3 flex items-center gap-1.5 font-body text-[0.62rem] text-cream-soft/35">
                    {m.is_published ? <ToggleRight size={15} className="text-green-400" /> : <ToggleLeft size={15} className="text-cream-soft/20" />} {m.is_published ? 'Visible' : 'Hidden'}
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      <AnimatePresence>{form !== null && <MemberForm initial={form} onClose={() => setForm(null)} onSave={() => { setForm(null); refresh() }} profiles={profiles} profileId={profile?.id} />}</AnimatePresence>
    </AdminLayout>
  )
}
