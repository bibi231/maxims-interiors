// src/pages/admin/Blog.jsx
// Journal (blog) editor: list of posts + full editor with WYSIWYG content,
// cover image upload (Cloudinary via /api/upload), excerpt, tags,
// draft/published, publish date, SEO title/description.
import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { Plus, ArrowLeft, Save, Eye, Trash2, Upload, X, Search, ExternalLink } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { api } from '@/lib/api'
import { uploadFile, BUCKETS } from '@/lib/storage'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'

const RichTextEditor = lazy(() => import('@/components/admin/RichTextEditor'))

const labelCls = 'font-title text-[0.76rem] tracking-[0.16em] uppercase text-cream-soft/75 block mb-1.5'
const inputCls = 'w-full min-h-[44px] bg-charcoal border border-gold/20 px-3 py-2.5 font-body text-[0.95rem] text-cream-soft placeholder:text-cream-soft/40 focus:outline-none focus:border-gold/60 transition-colors'
const BLANK = { title: '', slug: '', excerpt: '', content: '', cover_image: '', tags: [], status: 'draft', published_at: '', seo_title: '', seo_description: '' }
const toLocalInput = (d) => { if (!d) return ''; const x = new Date(d); const off = x.getTimezoneOffset(); return new Date(x - off * 60000).toISOString().slice(0, 16) }
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

function statusOf(p) {
  if (p.status !== 'published') return { label: 'Draft', cls: 'text-cream-soft/80 border-cream-soft/30 bg-cream-soft/5' }
  if (p.published_at && new Date(p.published_at) > new Date()) return { label: 'Scheduled', cls: 'text-blue-400 border-blue-400/40 bg-blue-400/10' }
  return { label: 'Published', cls: 'text-green-400 border-green-400/40 bg-green-400/10' }
}

function Editor({ initial, onBack, onSaved }) {
  const [form, setForm] = useState({ ...BLANK, ...initial, tagsText: (initial.tags || []).join(', '), published_at: toLocalInput(initial.published_at) })
  const [saving, setSaving] = useState(false)
  const [coverBusy, setCoverBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const { addToast } = useToast()
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true) }

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function uploadCover(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setCoverBusy(true)
    try { set('cover_image', await uploadFile(BUCKETS.blog, file, 'covers')) } catch (err) { addToast({ type: 'error', message: err.message || 'Upload failed' }) }
    setCoverBusy(false)
  }

  async function save(statusOverride) {
    if (!form.title.trim()) { addToast({ type: 'error', message: 'Please add a title.' }); return }
    setSaving(true)
    const body = {
      title: form.title, content: form.content, excerpt: form.excerpt, cover_image: form.cover_image || '',
      tags: form.tagsText, status: statusOverride || form.status,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      seo_title: form.seo_title, seo_description: form.seo_description,
      ...(form.slug !== initial.slug ? { slug: form.slug } : {}),
    }
    try {
      const saved = form.id ? await api.put(`/blog/${form.id}`, body) : await api.post('/blog', body)
      setForm((f) => ({ ...f, ...saved, tagsText: (saved.tags || []).join(', '), published_at: toLocalInput(saved.published_at) }))
      setDirty(false)
      addToast({ type: 'success', message: saved.status === 'published' ? 'Published' : 'Draft saved' })
      onSaved(saved)
    } catch (err) { addToast({ type: 'error', message: err.message || 'Could not save' }) }
    setSaving(false)
  }

  const seoTitle = form.seo_title || form.title
  const seoDesc = form.seo_description || form.excerpt

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <button onClick={() => { if (!dirty || window.confirm('Leave without saving your changes?')) onBack() }} className="min-h-[44px] inline-flex items-center gap-2 font-body text-[0.95rem] text-cream-soft/85 hover:text-gold self-start">
          <ArrowLeft size={16} /> All posts
        </button>
        <div className="flex flex-wrap gap-2">
          {form.id && form.slug && (
            <a href={`/blog/${form.slug}`} target="_blank" rel="noreferrer" className="min-h-[44px] inline-flex items-center gap-2 border border-gold/30 text-cream-soft/90 font-title text-[0.76rem] tracking-[0.12em] uppercase px-4 hover:text-gold">
              <Eye size={14} /> {form.status === 'published' ? 'View' : 'Preview'}
            </a>
          )}
          <button onClick={() => save('draft')} disabled={saving} className="min-h-[44px] inline-flex items-center gap-2 border border-gold/40 text-gold font-title text-[0.76rem] tracking-[0.12em] uppercase px-4 hover:bg-gold/10 disabled:opacity-50">
            <Save size={14} /> {form.status === 'published' ? 'Unpublish (draft)' : 'Save draft'}
          </button>
          <button onClick={() => save('published')} disabled={saving} className="min-h-[44px] inline-flex items-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.8rem] font-bold tracking-[0.14em] uppercase px-5 disabled:opacity-50">
            {saving ? 'Saving...' : form.status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <div className="space-y-4 min-w-0">
          <div>
            <label className={labelCls} htmlFor="b-title">Title</label>
            <input id="b-title" className={cn(inputCls, 'text-lg font-semibold')} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Five ways to warm up a neutral living room" />
          </div>
          <div>
            <span className={labelCls}>Content</span>
            <Suspense fallback={<div className="min-h-[360px] border border-gold/20 grid place-items-center font-body text-cream-soft/70">Loading editor...</div>}>
              <RichTextEditor value={form.content} onChange={(html) => set('content', html)} />
            </Suspense>
          </div>
          <div>
            <label className={labelCls} htmlFor="b-excerpt">Excerpt (shown on the Journal page)</label>
            <textarea id="b-excerpt" rows={3} className={cn(inputCls, 'resize-y')} value={form.excerpt || ''} onChange={(e) => set('excerpt', e.target.value)} placeholder="Leave blank to use the start of the post" maxLength={600} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-charcoal border border-gold/15 p-4 space-y-3">
            <h3 className="font-title text-[0.8rem] tracking-[0.16em] uppercase text-gold">Publishing</h3>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Status">
              {['draft', 'published'].map((s) => (
                <button key={s} type="button" role="radio" aria-checked={form.status === s} onClick={() => set('status', s)}
                  className={cn('min-h-[44px] border font-title text-[0.76rem] tracking-[0.12em] uppercase', form.status === s ? 'border-gold bg-gold/15 text-gold' : 'border-gold/20 text-cream-soft/75')}>{s}</button>
              ))}
            </div>
            <div>
              <label className={labelCls} htmlFor="b-date">Publish date</label>
              <input id="b-date" type="datetime-local" className={inputCls} value={form.published_at || ''} onChange={(e) => set('published_at', e.target.value)} />
              <p className="font-body text-[0.9rem] text-cream-soft/85 mt-1">Blank = now. A future date schedules the post.</p>
            </div>
            <div>
              <label className={labelCls} htmlFor="b-slug">Web address</label>
              <div className="flex items-center gap-1 font-body text-[0.95rem] text-cream-soft/85"><span className="shrink-0">/blog/</span>
                <input id="b-slug" className={inputCls} value={form.slug || ''} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="made from the title" />
              </div>
            </div>
          </div>

          <div className="bg-charcoal border border-gold/15 p-4 space-y-3">
            <h3 className="font-title text-[0.8rem] tracking-[0.16em] uppercase text-gold">Cover image</h3>
            {form.cover_image
              ? <div className="relative"><img src={form.cover_image} alt="" className="w-full aspect-[16/9] object-cover border border-gold/20" /><button onClick={() => set('cover_image', '')} aria-label="Remove cover image" className="absolute top-1 right-1 w-11 h-11 grid place-items-center bg-charcoal/85 text-cream-soft hover:text-red-400"><X size={16} /></button></div>
              : <div className="aspect-[16/9] border border-dashed border-gold/30 grid place-items-center font-body text-[0.95rem] text-cream-soft/85">No cover image</div>}
            <label className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 border border-gold/35 text-gold font-title text-[0.76rem] tracking-[0.12em] uppercase cursor-pointer hover:bg-gold/10">
              <Upload size={14} /> {coverBusy ? 'Uploading...' : form.cover_image ? 'Replace image' : 'Upload image'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={uploadCover} disabled={coverBusy} />
            </label>
          </div>

          <div className="bg-charcoal border border-gold/15 p-4">
            <label className={labelCls} htmlFor="b-tags">Tags (comma separated)</label>
            <input id="b-tags" className={inputCls} value={form.tagsText} onChange={(e) => set('tagsText', e.target.value)} placeholder="Living Room, Styling Tips" />
          </div>

          <div className="bg-charcoal border border-gold/15 p-4 space-y-3">
            <h3 className="font-title text-[0.8rem] tracking-[0.16em] uppercase text-gold">Search engines (SEO)</h3>
            <div>
              <label className={labelCls} htmlFor="b-seot">SEO title <span className="normal-case tracking-normal text-cream-soft/80">({seoTitle.length}/60)</span></label>
              <input id="b-seot" className={inputCls} value={form.seo_title || ''} onChange={(e) => set('seo_title', e.target.value)} placeholder={form.title || 'Defaults to the title'} maxLength={255} />
            </div>
            <div>
              <label className={labelCls} htmlFor="b-seod">SEO description <span className="normal-case tracking-normal text-cream-soft/80">({(seoDesc || '').length}/160)</span></label>
              <textarea id="b-seod" rows={3} className={cn(inputCls, 'resize-y')} value={form.seo_description || ''} onChange={(e) => set('seo_description', e.target.value)} placeholder="Defaults to the excerpt" maxLength={500} />
            </div>
            <div className="bg-white p-3 rounded-sm">
              <div className="text-[#1a0dab] text-[1.05rem] leading-snug truncate">{seoTitle || 'Post title'} — Maxims Interiors</div>
              <div className="text-[#006621] text-[0.9rem] truncate">maximsinterior.com.ng/blog/{form.slug || '...'}</div>
              <div className="text-[#545454] text-[0.95rem] line-clamp-2">{seoDesc || 'Description shown in Google results.'}</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function Blog() {
  const { canWrite, isOwner } = useAuth()
  const { addToast } = useToast()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    try { setPosts(await api.get('/blog?all=1')) } catch (e) { addToast({ type: 'error', message: e.message }) }
    setLoading(false)
  }, [addToast])
  useEffect(() => { load() }, [load])

  async function open(p) {
    try { setEditing(p ? await api.get(`/blog/id/${p.id}`) : { ...BLANK }) } catch (e) { addToast({ type: 'error', message: e.message }) }
  }
  async function remove(p) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    try { await api.del(`/blog/${p.id}`); addToast({ type: 'success', message: 'Deleted' }); load() } catch (e) { addToast({ type: 'error', message: e.message }) }
  }

  const shown = useMemo(() => posts.filter((p) => {
    const st = statusOf(p).label.toLowerCase()
    if (filter !== 'all' && st !== filter) return false
    return !q || `${p.title} ${(p.tags || []).join(' ')}`.toLowerCase().includes(q.toLowerCase())
  }), [posts, q, filter])

  if (editing) {
    return <AdminLayout><Editor initial={editing} onBack={() => { setEditing(null); load() }} onSaved={(s) => setEditing((e) => ({ ...e, ...s }))} /></AdminLayout>
  }

  const writable = canWrite('blog')
  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Journal</h1>
          <p className="font-body text-[0.9rem] text-cream-soft/70 mt-0.5">Blog posts shown at <a href="/blog" target="_blank" rel="noreferrer" className="text-gold hover:underline inline-flex items-center gap-1">/blog <ExternalLink size={12} /></a></p>
        </div>
        {writable && <button onClick={() => open(null)} className="min-h-[44px] inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.8rem] font-bold tracking-[0.14em] uppercase px-5"><Plus size={15} /> New post</button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-soft/80" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts" aria-label="Search posts" className={cn(inputCls, 'pl-9')} />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {['all', 'published', 'scheduled', 'draft'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn('min-h-[44px] px-3 border font-title text-[0.76rem] tracking-[0.12em] uppercase shrink-0', filter === f ? 'border-gold text-gold bg-gold/10' : 'border-gold/20 text-cream-soft/75')}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? <p className="font-body text-cream-soft/70">Loading...</p> : shown.length === 0 ? (
        <div className="border border-dashed border-gold/25 p-8 text-center font-body text-cream-soft/75">
          {posts.length ? 'No posts match.' : 'No posts yet. Write the first one with “New post”.'}
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((p) => {
            const st = statusOf(p)
            return (
              <li key={p.id} className="bg-charcoal border border-gold/15 flex flex-col">
                <button onClick={() => open(p)} className="text-left">
                  {p.cover_image ? <img src={p.cover_image} alt="" className="w-full aspect-[16/9] object-cover" loading="lazy" /> : <div className="w-full aspect-[16/9] bg-charcoal-mid grid place-items-center font-title text-gold/85 tracking-[0.3em]">MAXIMS</div>}
                </button>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={cn('font-body text-[0.8rem] font-bold uppercase tracking-wide border px-2 py-0.5', st.cls)}>{st.label}</span>
                    <span className="font-body text-[0.9rem] text-cream-soft/85">{st.label === 'Draft' ? `Edited ${fmt(p.updated_at)}` : fmt(p.published_at)}</span>
                  </div>
                  <button onClick={() => open(p)} className="text-left font-display text-xl font-semibold text-cream-soft hover:text-gold leading-snug">{p.title}</button>
                  {p.excerpt && <p className="font-body text-[0.88rem] text-cream-soft/75 mt-1 line-clamp-2">{p.excerpt}</p>}
                  <div className="mt-auto pt-3 flex gap-2">
                    <button onClick={() => open(p)} className="min-h-[44px] flex-1 border border-gold/30 text-gold font-title text-[0.76rem] tracking-[0.12em] uppercase hover:bg-gold/10">{writable ? 'Edit' : 'Open'}</button>
                    {writable && (isOwner || p.status !== 'published') && <button onClick={() => remove(p)} aria-label={`Delete ${p.title}`} className="min-h-[44px] min-w-[44px] grid place-items-center border border-red-400/30 text-red-400 hover:bg-red-400/10"><Trash2 size={15} /></button>}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </AdminLayout>
  )
}
