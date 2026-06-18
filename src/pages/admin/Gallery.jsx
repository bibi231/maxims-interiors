// src/pages/admin/Gallery.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Upload, ToggleLeft, ToggleRight, Star } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useGallery, upsertGalleryProject, deleteGalleryProject, logActivity } from '@/hooks/useData'
import { uploadFile, getStorageUrl, BUCKETS } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { cn, slugify } from '@/lib/utils'

const CATEGORIES = ['Living Room', 'Bedroom', 'Commercial', 'Kitchen', 'Bathroom', 'Outdoor', 'Office']
const SIZES = ['small', 'medium', 'large']
const BLANK = { title: '', slug: '', category: 'Living Room', location: '', year: new Date().getFullYear(), grid_size: 'small', description: '', sqft: '', duration: '', client_name: '', images: [], cover_image: '', is_published: true, is_featured: false }

function ProjectForm({ initial = BLANK, onClose, onSave, profileId }) {
  const [form, setForm] = useState({ ...BLANK, ...initial })
  const [saving, setSaving] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v, ...(k === 'title' && !initial.id ? { slug: slugify(v) } : {}) }))

  async function upload(e) {
    const files = Array.from(e.target.files)
    setImgBusy(true)
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { alert('Max 5MB per image'); continue }
      try {
        const path = await uploadFile(BUCKETS.gallery, file, 'projects')
        const url = getStorageUrl(BUCKETS.gallery, path)
        setForm((f) => ({ ...f, images: [...f.images, url], cover_image: f.cover_image || url }))
      } catch { alert('Upload failed') }
    }
    setImgBusy(false)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = await upsertGalleryProject({ ...form, year: form.year ? Number(form.year) : null })
      await logActivity({ userId: profileId, action: initial.id ? 'updated' : 'created', resourceType: 'gallery_project', resourceId: saved.id, description: `${initial.id ? 'Updated' : 'Created'} project "${saved.title}"` })
      onSave()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  return (
    <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-[680px] bg-charcoal-mid border border-gold/15 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
          <h2 className="font-display text-xl text-cream-soft">{initial.id ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="text-cream-soft/30 hover:text-gold"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 grid grid-cols-2 gap-4">
          <L label="Title"><input className="lux-input" value={form.title} onChange={(e) => set('title', e.target.value)} required /></L>
          <L label="Slug"><input className="lux-input" value={form.slug} onChange={(e) => set('slug', e.target.value)} required /></L>
          <L label="Category"><select className="lux-input" value={form.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></L>
          <L label="Location"><input className="lux-input" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Maitama, Abuja" /></L>
          <L label="Year"><input type="number" className="lux-input" value={form.year} onChange={(e) => set('year', e.target.value)} /></L>
          <L label="Grid Size"><select className="lux-input" value={form.grid_size} onChange={(e) => set('grid_size', e.target.value)}>{SIZES.map((s) => <option key={s}>{s}</option>)}</select></L>
          <L label="Area (sqft)"><input className="lux-input" value={form.sqft} onChange={(e) => set('sqft', e.target.value)} placeholder="3,200 sqft" /></L>
          <L label="Duration"><input className="lux-input" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="4 months" /></L>
          <L label="Client Name" full><input className="lux-input" value={form.client_name} onChange={(e) => set('client_name', e.target.value)} /></L>
          <L label="Description" full><textarea rows={3} className="lux-input resize-none" value={form.description} onChange={(e) => set('description', e.target.value)} /></L>

          <div className="col-span-2">
            <div className="font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft/35 mb-3">Images (first = cover)</div>
            <div className="flex flex-wrap gap-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 border border-gold/15 overflow-hidden group">
                  <img src={img} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i), cover_image: f.cover_image === img ? (f.images.filter((_, j) => j !== i)[0] || '') : f.cover_image }))}
                    className="absolute inset-0 bg-red-500/80 grid place-items-center opacity-0 group-hover:opacity-100"><Trash2 size={14} className="text-white" /></button>
                  {form.cover_image === img
                    ? <div className="absolute bottom-0 inset-x-0 bg-gold/80 text-purple-darkest text-center font-title text-[0.4rem] py-0.5">COVER</div>
                    : <button type="button" onClick={() => set('cover_image', img)} className="absolute bottom-0 inset-x-0 bg-charcoal/80 text-cream-soft/70 text-center font-title text-[0.4rem] py-0.5 opacity-0 group-hover:opacity-100">SET COVER</button>}
                </div>
              ))}
              <label className={cn('w-20 h-20 border border-dashed border-gold/20 flex flex-col items-center justify-center cursor-pointer hover:border-gold/50', imgBusy && 'opacity-50 pointer-events-none')}>
                <Upload size={16} className="text-cream-soft/25 mb-1" />
                <span className="font-title text-[0.45rem] uppercase text-cream-soft/25">Upload</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={upload} disabled={imgBusy} />
              </label>
            </div>
          </div>

          <div className="col-span-2 flex gap-6">
            {[['Published', 'is_published'], ['Featured', 'is_featured']].map(([label, key]) => (
              <button key={key} type="button" onClick={() => set(key, !form[key])} className="flex items-center gap-2.5">
                {form[key] ? <ToggleRight size={22} className="text-gold" /> : <ToggleLeft size={22} className="text-cream-soft/25" />}
                <span className="font-title text-[0.6rem] tracking-[0.15em] uppercase text-cream-soft/45">{label}</span>
              </button>
            ))}
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.65rem] tracking-[0.18em] uppercase py-3 disabled:opacity-50">{saving ? 'Saving…' : initial.id ? 'Update Project' : 'Create Project'}</button>
            <button type="button" onClick={onClose} className="px-6 border border-gold/15 text-cream-soft/40 hover:text-cream-soft/70 font-title text-[0.62rem] uppercase">Cancel</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
const L = ({ label, children, full }) => (
  <div className={full ? 'col-span-2' : ''}>
    <label className="font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft/35 block mb-2">{label}</label>{children}
  </div>
)

export default function Gallery() {
  const [form, setForm] = useState(null)
  const { canWrite, profile, isOwner } = useAuth()
  const { data: projects, loading, refresh } = useGallery({})

  async function remove(id) {
    if (!confirm('Delete this project?')) return
    await deleteGalleryProject(id); refresh()
  }
  async function togglePublish(p) {
    await upsertGalleryProject({ id: p.id, is_published: !p.is_published }); refresh()
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Gallery</h1>
          <p className="font-body text-[0.75rem] text-cream-soft/30 mt-0.5">{projects.length} projects</p>
        </div>
        {canWrite('gallery') && <button onClick={() => setForm({})} className="flex items-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.62rem] tracking-[0.18em] uppercase px-5 py-2.5"><Plus size={13} /> Add Project</button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? Array(8).fill(0).map((_, i) => <div key={i} className="skeleton aspect-[4/3]" />)
          : projects.map((p) => (
            <div key={p.id} className="bg-charcoal border border-gold/8 group hover:border-gold/22 transition-all">
              <div className="aspect-[4/3] relative overflow-hidden bg-charcoal-mid">
                {p.cover_image ? <img src={p.cover_image} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-3xl opacity-20">🏛</div>}
                {p.is_featured && <span className="absolute top-2 left-2 bg-gold text-purple-darkest p-1"><Star size={11} /></span>}
                {!p.is_published && <span className="absolute top-2 right-2 bg-charcoal/80 text-cream-soft/60 font-title text-[0.45rem] uppercase px-2 py-0.5">Draft</span>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-editorial text-[0.88rem] text-cream-soft/80 truncate">{p.title}</h3>
                    <p className="font-title text-[0.62rem] text-cream-soft/35 mt-0.5">{p.category} · {p.location || '—'}</p>
                  </div>
                  {canWrite('gallery') && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => setForm(p)} className="w-7 h-7 border border-gold/15 text-cream-soft/30 hover:text-gold hover:border-gold grid place-items-center"><Edit2 size={11} /></button>
                      {isOwner && <button onClick={() => remove(p.id)} className="w-7 h-7 border border-red-500/20 text-red-500/40 hover:text-red-400 hover:border-red-400 grid place-items-center"><Trash2 size={11} /></button>}
                    </div>
                  )}
                </div>
                {canWrite('gallery') && (
                  <button onClick={() => togglePublish(p)} className="mt-3 flex items-center gap-2">
                    {p.is_published ? <ToggleRight size={18} className="text-green-400" /> : <ToggleLeft size={18} className="text-cream-soft/20" />}
                    <span className="font-body text-[0.62rem] text-cream-soft/35">{p.is_published ? 'Published' : 'Hidden'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      <AnimatePresence>{form !== null && <ProjectForm initial={form} onClose={() => setForm(null)} onSave={() => { setForm(null); refresh() }} profileId={profile?.id} />}</AnimatePresence>
    </AdminLayout>
  )
}
