// src/pages/admin/Pricing.jsx
// Owner: edit every price shown on the public site outside the product
// catalogue: consultation fee, design packages, services ("from" prices),
// bulk/trade thresholds, and the default delivery fee. Saved to site
// settings (key "pricing"); the public pages read it from the API.
import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import AdminLayout from '@/components/admin/AdminLayout'
import { useSiteSettings } from '@/hooks/useData'
import { DEFAULT_PRICING } from '@/lib/siteDefaults'
import { formatNaira, cn } from '@/lib/utils'

const labelCls = 'font-title text-[0.76rem] tracking-[0.16em] uppercase text-cream-soft/75 block mb-1.5'
const inputCls = 'w-full min-h-[44px] bg-charcoal border border-gold/20 px-3 py-2.5 font-body text-[0.95rem] text-cream-soft placeholder:text-cream-soft/40 focus:outline-none focus:border-gold/60 transition-colors'
const card = 'bg-charcoal border border-gold/15 p-4 sm:p-5'
const smallBtn = 'min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 border border-gold/25 text-cream-soft/80 hover:text-gold hover:border-gold/60 px-2 font-body text-[0.95rem]'

// Money input: shows digits, stores a number (or null when empty).
function MoneyInput({ value, onChange, placeholder = 'e.g. 150000', id }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold font-body">₦</span>
      <input id={id} inputMode="numeric" className={cn(inputCls, 'pl-8')} placeholder={placeholder}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => { const d = e.target.value.replace(/[^\d]/g, ''); onChange(d === '' ? null : Number(d)) }} />
    </div>
  )
}

const move = (list, i, d) => { const a = [...list]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a }

export default function Pricing() {
  const { settings, loading, updateSetting } = useSiteSettings()
  const [p, setP] = useState(null)
  const [deliveryFee, setDeliveryFee] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (loading || p) return
    const src = settings.pricing || DEFAULT_PRICING
    setP({
      ...DEFAULT_PRICING, ...src,
      consultation: { ...DEFAULT_PRICING.consultation, ...(src.consultation || {}) },
      bulk: { ...DEFAULT_PRICING.bulk, ...(src.bulk || {}) },
      packages: (src.packages || []).map((x) => ({ ...x, featuresText: (x.features || []).join('\n') })),
      services: [...(src.services || [])],
    })
    setDeliveryFee(typeof settings.delivery_fee === 'number' ? settings.delivery_fee : null)
  }, [loading, settings, p])

  if (!p) return <AdminLayout><p className="font-body text-cream-soft/70">Loading pricing...</p></AdminLayout>

  const setC = (k, v) => setP((s) => ({ ...s, consultation: { ...s.consultation, [k]: v } }))
  const setPkg = (i, k, v) => setP((s) => ({ ...s, packages: s.packages.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }))
  const setSvc = (i, k, v) => setP((s) => ({ ...s, services: s.services.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }))

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const value = {
        consultation: p.consultation,
        bulk: p.bulk,
        packages: p.packages.map(({ featuresText, ...x }) => ({ ...x, features: String(featuresText || '').split('\n').map((f) => f.trim()).filter(Boolean) })),
        services: p.services,
      }
      await updateSetting('pricing', value)
      if (deliveryFee !== (settings.delivery_fee ?? null)) await updateSetting('delivery_fee', deliveryFee ?? 0)
      setMsg({ ok: true, text: 'Saved. The website shows the new prices now.' })
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not save.' })
    }
    setSaving(false)
  }

  const SaveBar = () => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <button onClick={save} disabled={saving} className="min-h-[44px] inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.8rem] font-bold tracking-[0.16em] uppercase px-6 disabled:opacity-50">
        <Save size={14} /> {saving ? 'Saving...' : 'Save all prices'}
      </button>
      {msg && <span className={cn('font-body text-[0.9rem]', msg.ok ? 'text-green-400' : 'text-amber-400')}>{msg.text}</span>}
    </div>
  )

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-title text-xl text-cream-soft tracking-wide">Pricing & Services</h1>
          <p className="font-body text-[0.92rem] text-cream-soft/75 mt-1 max-w-[640px]">
            Every price on the website outside the shop catalogue. Product prices are edited in Products; per-order delivery fees in Orders.
          </p>
        </div>
        <SaveBar />
      </div>

      <div className="space-y-6">
        {/* Consultation */}
        <section className={card}>
          <h2 className="font-title text-[0.9rem] tracking-[0.16em] uppercase text-gold mb-4">Design consultation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className={labelCls} htmlFor="c-title">Name</label><input id="c-title" className={inputCls} value={p.consultation.title} onChange={(e) => setC('title', e.target.value)} /></div>
            <div><label className={labelCls} htmlFor="c-fee">Fee (0 = complimentary)</label><MoneyInput id="c-fee" value={p.consultation.fee} onChange={(v) => setC('fee', v ?? 0)} placeholder="0" /></div>
            <div><label className={labelCls} htmlFor="c-dur">Duration</label><input id="c-dur" className={inputCls} value={p.consultation.duration} onChange={(e) => setC('duration', e.target.value)} placeholder="60 minutes" /></div>
            <div className="md:col-span-3"><label className={labelCls} htmlFor="c-desc">Short description</label><input id="c-desc" className={inputCls} value={p.consultation.description} onChange={(e) => setC('description', e.target.value)} /></div>
          </div>
          <p className="font-body text-[0.95rem] text-cream-soft/85 mt-3">Shown on the Contact page and home page: {Number(p.consultation.fee) > 0 ? formatNaira(p.consultation.fee) : 'Complimentary'}.</p>
        </section>

        {/* Packages */}
        <section className={card}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-title text-[0.9rem] tracking-[0.16em] uppercase text-gold">Design packages</h2>
              <p className="font-body text-[0.95rem] text-cream-soft/85 mt-1">Leave the price empty for “Custom / on request”. A package with a price can be paid online after the customer requests it (when payments are on).</p>
            </div>
            <button onClick={() => setP((s) => ({ ...s, packages: [...s.packages, { name: '', price: null, price_note: '', featured: false, featuresText: '' }] }))} className={smallBtn}><Plus size={15} /> Add package</button>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {p.packages.map((pk, i) => (
              <div key={i} className={cn('border p-4 space-y-3', pk.featured ? 'border-gold/60 bg-gold/5' : 'border-gold/15 bg-charcoal-mid')}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1"><label className={labelCls} htmlFor={`pk-n-${i}`}>Name</label><input id={`pk-n-${i}`} className={inputCls} value={pk.name} onChange={(e) => setPkg(i, 'name', e.target.value)} /></div>
                  <div className="col-span-2 sm:col-span-1"><label className={labelCls} htmlFor={`pk-p-${i}`}>Price</label><MoneyInput id={`pk-p-${i}`} value={pk.price} onChange={(v) => setPkg(i, 'price', v)} placeholder="Custom" /></div>
                </div>
                {pk.price === null && <div><label className={labelCls} htmlFor={`pk-note-${i}`}>Label when no price</label><input id={`pk-note-${i}`} className={inputCls} value={pk.price_note} onChange={(e) => setPkg(i, 'price_note', e.target.value)} placeholder="Custom" /></div>}
                <div><label className={labelCls} htmlFor={`pk-f-${i}`}>What’s included (one per line)</label><textarea id={`pk-f-${i}`} rows={5} className={cn(inputCls, 'resize-y')} value={pk.featuresText} onChange={(e) => setPkg(i, 'featuresText', e.target.value)} /></div>
                <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-[#C9A84C]" checked={!!pk.featured} onChange={(e) => setPkg(i, 'featured', e.target.checked)} />
                  <span className="font-body text-[0.92rem] text-cream-soft/85">Highlight as “Most popular”</span>
                </label>
                <div className="flex gap-2">
                  <button aria-label="Move up" onClick={() => setP((s) => ({ ...s, packages: move(s.packages, i, -1) }))} className={smallBtn}><ArrowUp size={15} /></button>
                  <button aria-label="Move down" onClick={() => setP((s) => ({ ...s, packages: move(s.packages, i, 1) }))} className={smallBtn}><ArrowDown size={15} /></button>
                  <button onClick={() => { if (window.confirm(`Remove the ${pk.name || 'new'} package?`)) setP((s) => ({ ...s, packages: s.packages.filter((_, j) => j !== i) })) }} className={cn(smallBtn, 'ml-auto text-red-400 border-red-400/30 hover:text-red-300')}><Trash2 size={15} /> Remove</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section className={card}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-title text-[0.9rem] tracking-[0.16em] uppercase text-gold">Services</h2>
              <p className="font-body text-[0.95rem] text-cream-soft/85 mt-1">Listed on the Interior Décor page and in the footer. “From” price is optional.</p>
            </div>
            <button onClick={() => setP((s) => ({ ...s, services: [...s.services, { key: '', title: '', description: '', price_from: null }] }))} className={smallBtn}><Plus size={15} /> Add service</button>
          </div>
          <div className="space-y-3">
            {p.services.map((sv, i) => (
              <div key={i} className="border border-gold/15 bg-charcoal-mid p-3 grid grid-cols-1 md:grid-cols-[1fr_2fr_180px_auto] gap-3 md:items-end">
                <div><label className={labelCls} htmlFor={`sv-t-${i}`}>Service</label><input id={`sv-t-${i}`} className={inputCls} value={sv.title} onChange={(e) => setSvc(i, 'title', e.target.value)} /></div>
                <div><label className={labelCls} htmlFor={`sv-d-${i}`}>Description</label><input id={`sv-d-${i}`} className={inputCls} value={sv.description} onChange={(e) => setSvc(i, 'description', e.target.value)} /></div>
                <div><label className={labelCls} htmlFor={`sv-p-${i}`}>From price</label><MoneyInput id={`sv-p-${i}`} value={sv.price_from} onChange={(v) => setSvc(i, 'price_from', v)} placeholder="Optional" /></div>
                <div className="flex gap-2">
                  <button aria-label="Move up" onClick={() => setP((s) => ({ ...s, services: move(s.services, i, -1) }))} className={smallBtn}><ArrowUp size={15} /></button>
                  <button aria-label="Move down" onClick={() => setP((s) => ({ ...s, services: move(s.services, i, 1) }))} className={smallBtn}><ArrowDown size={15} /></button>
                  <button aria-label={`Remove ${sv.title}`} onClick={() => setP((s) => ({ ...s, services: s.services.filter((_, j) => j !== i) }))} className={cn(smallBtn, 'text-red-400 border-red-400/30')}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bulk + delivery */}
        <section className={card}>
          <h2 className="font-title text-[0.9rem] tracking-[0.16em] uppercase text-gold mb-4">Trade & delivery</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className={labelCls} htmlFor="b-items">Bulk order: minimum identical items</label><input id="b-items" inputMode="numeric" className={inputCls} value={p.bulk.min_items ?? ''} onChange={(e) => setP((s) => ({ ...s, bulk: { ...s.bulk, min_items: Number(e.target.value.replace(/\D/g, '')) || 0 } }))} /></div>
            <div><label className={labelCls} htmlFor="b-value">Bulk order: or project value over</label><MoneyInput id="b-value" value={p.bulk.min_value} onChange={(v) => setP((s) => ({ ...s, bulk: { ...s.bulk, min_value: v ?? 0 } }))} /></div>
            <div><label className={labelCls} htmlFor="d-fee">Default delivery fee (reference)</label><MoneyInput id="d-fee" value={deliveryFee} onChange={setDeliveryFee} placeholder="5000" /></div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SaveBar />
          <Link to="/interior-decor#packages" target="_blank" className="inline-flex items-center gap-2 min-h-[44px] font-body text-[0.9rem] text-gold hover:underline"><ExternalLink size={14} /> View on the website</Link>
        </div>
      </div>
    </AdminLayout>
  )
}
