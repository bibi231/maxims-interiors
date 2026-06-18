// src/pages/admin/Products.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Upload, ToggleLeft, ToggleRight, Search } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useProducts, upsertProduct, deleteProduct, updateProductStatus } from '@/hooks/useData'
import { uploadFile, getStorageUrl, BUCKETS } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Living Room','Bedroom','Décor','Lighting','Rugs','Wall Art','Greenery','Kitchen','Bathroom']
const BADGES     = ['New Arrival','Staff Pick','Sale','Best Seller','Limited Edition']
const fmt = n => '₦' + Number(n || 0).toLocaleString()

const BLANK = { name:'', slug:'', description:'', price:'', compare_price:'', category:'Living Room', badge:'', stock_qty:0, sku:'', status:'active', is_featured:false, images:[], cover_image:'' }

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function ProductForm({ initial = BLANK, onSave, onClose, uploading, setUploading }) {
  const [form, setForm] = useState({ ...BLANK, ...initial })
  const [saving, setSaving] = useState(false)
  const [imgLoading, setImgLoading] = useState(false)

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'name' && !initial.id) next.slug = slugify(v)
      return next
    })
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setImgLoading(true)
    try {
      const path = await uploadFile(BUCKETS.products, file, 'items')
      const url  = getStorageUrl(BUCKETS.products, path)
      setForm(f => ({ ...f, images: [...f.images, url], cover_image: f.cover_image || url }))
    } catch (err) { alert('Upload failed: ' + err.message) }
    setImgLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await upsertProduct({ ...form, price: Number(form.price), compare_price: form.compare_price ? Number(form.compare_price) : null })
      onSave()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  const Field = ({ label, children, half }) => (
    <div className={half ? '' : 'col-span-2 md:col-span-1'}>
      <label className="font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft/35 block mb-2">{label}</label>
      {children}
    </div>
  )

  const inputCls = "w-full bg-charcoal border border-gold/10 px-3 py-2.5 font-body text-[0.85rem] text-cream-soft/80 placeholder:text-cream-soft/15 focus:outline-none focus:border-gold/40 transition-colors"

  return (
    <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-[680px] bg-charcoal-mid border border-gold/15 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
          <h2 className="font-display text-xl text-cream-soft">{initial.id ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose} className="text-cream-soft/30 hover:text-gold"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Product Name"><input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Elara Accent Chair" required /></Field>
            <Field label="URL Slug"><input className={inputCls} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="elara-accent-chair" required /></Field>
            <Field label="Price (₦)"><input className={inputCls} type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="185000" required /></Field>
            <Field label="Compare Price (₦) — for Sale badge"><input className={inputCls} type="number" value={form.compare_price} onChange={e => set('compare_price', e.target.value)} placeholder="220000" /></Field>
            <Field label="Category">
              <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Badge (optional)">
              <select className={inputCls} value={form.badge} onChange={e => set('badge', e.target.value)}>
                <option value="">None</option>
                {BADGES.map(b => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="SKU"><input className={inputCls} value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="MAX-CHR-001" /></Field>
            <Field label="Stock Quantity"><input className={inputCls} type="number" value={form.stock_qty} onChange={e => set('stock_qty', Number(e.target.value))} /></Field>
            <div className="col-span-2">
              <label className="font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft/35 block mb-2">Description</label>
              <textarea className={inputCls + ' resize-none'} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Product description..." />
            </div>
          </div>

          {/* Images */}
          <div className="mb-5">
            <div className="font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft/35 mb-3">Product Images</div>
            <div className="flex flex-wrap gap-3 mb-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 border border-gold/15 overflow-hidden group">
                  <img src={img} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i), cover_image: f.cover_image === img ? f.images[0] || '' : f.cover_image }))}
                    className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} className="text-white" />
                  </button>
                  {form.cover_image === img && <div className="absolute bottom-0 left-0 right-0 bg-gold/80 text-purple-darkest text-center font-title text-[0.4rem] tracking-wide py-0.5">COVER</div>}
                </div>
              ))}
              <label className={cn('w-20 h-20 border border-dashed border-gold/20 flex flex-col items-center justify-center cursor-pointer hover:border-gold/50 transition-colors', imgLoading && 'opacity-50 pointer-events-none')}>
                <Upload size={16} className="text-cream-soft/25 mb-1" />
                <span className="font-title text-[0.45rem] tracking-wider uppercase text-cream-soft/25">Upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={imgLoading} />
              </label>
            </div>
            {form.images.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {form.images.map((img, i) => (
                  <button key={i} type="button" onClick={() => set('cover_image', img)}
                    className={cn('font-title text-[0.52rem] tracking-wider uppercase px-2.5 py-1 border transition-all',
                      form.cover_image === img ? 'border-gold text-gold bg-gold/8' : 'border-gold/12 text-cream-soft/30 hover:border-gold/30')}>
                    Set as Cover {i+1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex gap-6 mb-6">
            {[['Active', 'status', 'active', 'draft'], ['Featured', 'is_featured', true, false]].map(([label, key, on, off]) => (
              <button key={key} type="button" onClick={() => set(key, form[key] === on ? off : on)}
                className="flex items-center gap-2.5 group">
                {form[key] === on ? <ToggleRight size={22} className="text-gold" /> : <ToggleLeft size={22} className="text-cream-soft/25" />}
                <span className="font-title text-[0.6rem] tracking-[0.15em] uppercase text-cream-soft/45 group-hover:text-cream-soft/70">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex-1 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.65rem] tracking-[0.18em] uppercase py-3 disabled:opacity-50 hover:shadow-gold transition-all">
              {saving ? 'Saving...' : initial.id ? 'Update Product' : 'Create Product'}
            </button>
            <button type="button" onClick={onClose} className="px-6 border border-gold/15 text-cream-soft/40 hover:border-gold/35 hover:text-cream-soft/70 font-title text-[0.62rem] tracking-wider uppercase transition-all">
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default function Products() {
  const [search, setSearch]   = useState('')
  const [cat,    setCat]      = useState('all')
  const [form,   setForm]     = useState(null)   // null=closed, {}=new, {...}=edit
  const [deleting, setDeleting] = useState(null)
  const { canWrite } = useAuth()

  const { data: products, loading, refresh } = useProducts({
    category: cat !== 'all' ? cat : undefined,
  })

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setDeleting(id)
    await deleteProduct(id)
    refresh()
    setDeleting(null)
  }

  async function toggleStatus(product) {
    await updateProductStatus(product.id, product.status === 'active' ? 'archived' : 'active')
    refresh()
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Products</h1>
          <p className="font-body text-[0.75rem] text-cream-soft/30 mt-0.5">{filtered.length} products</p>
        </div>
        {canWrite('products') && (
          <button onClick={() => setForm({})}
            className="flex items-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.62rem] tracking-[0.18em] uppercase px-5 py-2.5 hover:shadow-gold transition-all">
            <Plus size={13} /> Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-soft/25" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="bg-charcoal border border-gold/10 pl-8 pr-4 py-2 font-body text-[0.8rem] text-cream-soft/70 placeholder:text-cream-soft/20 focus:outline-none focus:border-gold/35 w-52 transition-colors" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={cn('px-3 py-1.5 font-title text-[0.55rem] tracking-[0.15em] uppercase border transition-all capitalize',
                cat === c ? 'bg-gold/10 border-gold/30 text-gold' : 'border-gold/8 text-cream-soft/28 hover:border-gold/20')}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-charcoal border border-gold/8 animate-pulse">
              <div className="aspect-square bg-cream-soft/5" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-cream-soft/5 w-3/4" />
                <div className="h-3 bg-cream-soft/5 w-1/2" />
              </div>
            </div>
          ))
        ) : filtered.map(p => (
          <motion.div key={p.id} className="bg-charcoal border border-gold/8 group hover:border-gold/22 transition-all"
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="aspect-square bg-gradient-to-br from-purple-rich/20 to-purple-darkest/40 relative overflow-hidden">
              {p.cover_image
                ? <img src={p.cover_image} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><span className="text-4xl opacity-20">📦</span></div>
              }
              {p.badge && <div className="absolute top-2 left-2 bg-gold text-purple-darkest font-body font-black text-[0.48rem] tracking-widest uppercase px-2 py-0.5">{p.badge}</div>}
              {p.stock_qty <= 3 && p.stock_qty > 0 && <div className="absolute top-2 right-2 bg-yellow-500/90 text-white font-body font-black text-[0.45rem] tracking-wider uppercase px-2 py-0.5">Low Stock</div>}
              {p.stock_qty === 0 && <div className="absolute top-2 right-2 bg-red-600/90 text-white font-body font-black text-[0.45rem] tracking-wider uppercase px-2 py-0.5">Out of Stock</div>}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-editorial text-[0.88rem] text-cream-soft/80 leading-snug flex-1">{p.name}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {canWrite('products') && <>
                    <button onClick={() => setForm(p)} className="w-7 h-7 border border-gold/15 text-cream-soft/30 hover:text-gold hover:border-gold flex items-center justify-center transition-all"><Edit2 size={11} /></button>
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="w-7 h-7 border border-red-500/20 text-red-500/40 hover:text-red-400 hover:border-red-400 flex items-center justify-center transition-all"><Trash2 size={11} /></button>
                  </>}
                </div>
              </div>
              <div className="font-title text-[0.72rem] text-cream-soft/35 mb-3">{p.category}</div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-title text-[0.88rem] text-gold font-semibold">{fmt(p.price)}</span>
                  {p.compare_price > p.price && <span className="font-body text-[0.7rem] text-cream-soft/25 line-through ml-2">{fmt(p.compare_price)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-body text-[0.65rem] text-cream-soft/30">Stock: {p.stock_qty}</span>
                  {canWrite('products') && (
                    <button onClick={() => toggleStatus(p)} className="transition-colors">
                      {p.status === 'active'
                        ? <ToggleRight size={18} className="text-green-400" />
                        : <ToggleLeft size={18} className="text-cream-soft/20" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {form !== null && (
          <ProductForm initial={form} onClose={() => setForm(null)} onSave={() => { setForm(null); refresh() }} />
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
