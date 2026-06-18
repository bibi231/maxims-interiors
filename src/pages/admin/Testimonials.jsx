// src/pages/admin/Testimonials.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Star, ToggleLeft, ToggleRight } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useTestimonials, upsertTestimonial, deleteTestimonial, logActivity } from '@/hooks/useData'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const BLANK = { client_name: '', client_role: '', quote: '', rating: 5, project_type: '', avatar_url: '', is_published: true, is_featured: false, sort_order: 0 }

function TestiForm({ initial = BLANK, onClose, onSave, profileId }) {
  const [form, setForm] = useState({ ...BLANK, ...initial })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = await upsertTestimonial({ ...form, rating: Number(form.rating), sort_order: Number(form.sort_order) })
      await logActivity({ userId: profileId, action: initial.id ? 'updated' : 'created', resourceType: 'testimonial', resourceId: saved.id, description: `${initial.id ? 'Updated' : 'Created'} testimonial from ${saved.client_name}` })
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
          <h2 className="font-display text-xl text-cream-soft">{initial.id ? 'Edit Testimonial' : 'New Testimonial'}</h2>
          <button onClick={onClose} className="text-cream-soft/30 hover:text-gold"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Lbl label="Client Name"><input className="lux-input" value={form.client_name} onChange={(e) => set('client_name', e.target.value)} required /></Lbl>
            <Lbl label="Role / Location"><input className="lux-input" value={form.client_role} onChange={(e) => set('client_role', e.target.value)} placeholder="Homeowner · Lekki" /></Lbl>
          </div>
          <Lbl label="Quote"><textarea rows={4} className="lux-input resize-none" value={form.quote} onChange={(e) => set('quote', e.target.value)} required /></Lbl>
          <div className="grid grid-cols-2 gap-4">
            <Lbl label="Project Type"><input className="lux-input" value={form.project_type} onChange={(e) => set('project_type', e.target.value)} /></Lbl>
            <Lbl label="Sort Order"><input type="number" className="lux-input" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></Lbl>
          </div>
          <Lbl label="Rating">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => set('rating', n)}><Star size={22} className={n <= form.rating ? 'fill-gold text-gold' : 'text-gold/25'} /></button>
              ))}
            </div>
          </Lbl>
          <div className="flex gap-6">
            {[['Published', 'is_published'], ['Featured', 'is_featured']].map(([label, key]) => (
              <button key={key} type="button" onClick={() => set(key, !form[key])} className="flex items-center gap-2.5">
                {form[key] ? <ToggleRight size={22} className="text-gold" /> : <ToggleLeft size={22} className="text-cream-soft/25" />}
                <span className="font-title text-[0.6rem] tracking-[0.15em] uppercase text-cream-soft/45">{label}</span>
              </button>
            ))}
          </div>
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

export default function Testimonials() {
  const [form, setForm] = useState(null)
  const { canWrite, profile, isOwner } = useAuth()
  const { data: rows, loading, refresh } = useTestimonials({})

  async function remove(id) { if (confirm('Delete this testimonial?')) { await deleteTestimonial(id); refresh() } }
  async function toggle(t, key) { await upsertTestimonial({ id: t.id, [key]: !t[key] }); refresh() }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Testimonials</h1>
          <p className="font-body text-[0.75rem] text-cream-soft/30 mt-0.5">{rows.length} total</p>
        </div>
        {canWrite('testimonials') && <button onClick={() => setForm({})} className="flex items-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.62rem] tracking-[0.18em] uppercase px-5 py-2.5"><Plus size={13} /> Add</button>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-44" />)
          : rows.map((t) => (
            <div key={t.id} className="bg-charcoal border border-gold/8 p-5 group hover:border-gold/22 transition-all flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < t.rating ? 'fill-gold text-gold' : 'text-gold/20'} />)}</div>
                {canWrite('testimonials') && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setForm(t)} className="w-6 h-6 border border-gold/15 text-cream-soft/30 hover:text-gold hover:border-gold grid place-items-center"><Edit2 size={10} /></button>
                    {isOwner && <button onClick={() => remove(t.id)} className="w-6 h-6 border border-red-500/20 text-red-500/40 hover:text-red-400 grid place-items-center"><Trash2 size={10} /></button>}
                  </div>
                )}
              </div>
              <p className="font-editorial italic text-[0.85rem] text-cream-soft/70 leading-relaxed flex-1">“{t.quote}”</p>
              <div className="mt-4 pt-3 border-t border-gold/10">
                <div className="font-title text-[0.7rem] text-gold">{t.client_name}</div>
                <div className="font-body text-[0.65rem] text-cream-soft/40">{t.client_role}</div>
                {canWrite('testimonials') && (
                  <div className="flex gap-4 mt-3">
                    <button onClick={() => toggle(t, 'is_published')} className="flex items-center gap-1.5 font-body text-[0.6rem] text-cream-soft/40">{t.is_published ? <ToggleRight size={15} className="text-green-400" /> : <ToggleLeft size={15} className="text-cream-soft/20" />} Published</button>
                    <button onClick={() => toggle(t, 'is_featured')} className="flex items-center gap-1.5 font-body text-[0.6rem] text-cream-soft/40">{t.is_featured ? <ToggleRight size={15} className="text-gold" /> : <ToggleLeft size={15} className="text-cream-soft/20" />} Featured</button>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      <AnimatePresence>{form !== null && <TestiForm initial={form} onClose={() => setForm(null)} onSave={() => { setForm(null); refresh() }} profileId={profile?.id} />}</AnimatePresence>
    </AdminLayout>
  )
}
