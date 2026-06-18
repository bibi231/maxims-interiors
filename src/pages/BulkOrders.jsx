// src/pages/BulkOrders.jsx
import { useState } from 'react'
import { Building2, Check, Hotel, Briefcase, Package } from 'lucide-react'
import Meta from '@/components/Meta'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import { submitBulkRequest } from '@/hooks/useData'

const PROJECT_TYPES = ['Hotel / Hospitality', 'Residential Development', 'Office / Commercial', 'Restaurant / Lounge', 'Retail', 'Other']
const CATEGORIES = ['Furniture', 'Lighting', 'Décor & Art', 'Rugs & Textiles', 'Full Fit-Out', 'Mixed']
const BUDGETS = ['Under ₦5M', '₦5M – ₦20M', '₦20M – ₦50M', '₦50M+', 'To be discussed']

const PERKS = [
  { icon: Hotel, title: 'Hospitality Specialists', text: 'Trusted by hotels and developers for full-property fit-outs.' },
  { icon: Briefcase, title: 'Trade Pricing', text: 'Volume pricing and dedicated account management for partners.' },
  { icon: Package, title: 'End-to-End Logistics', text: 'Sourcing, delivery, and installation coordinated by one team.' },
]

const EMPTY = { company: '', name: '', email: '', phone: '', projectType: '', category: '', quantity: '', budget: '', message: '' }

export default function BulkOrders() {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.company || !form.name || !form.email) {
      setError('Please fill in your company, name, and email.'); return
    }
    setLoading(true)
    try {
      await submitBulkRequest({
        company_name: form.company,
        contact_name: form.name,
        email: form.email,
        phone: form.phone,
        project_type: form.projectType,
        product_category: form.category,
        quantity: form.quantity,
        budget_range: form.budget,
        message: form.message,
      })
      setSuccess(true)
    } catch {
      setError('Submission failed. Please email us directly at hello@maximsinteriors.com.')
    }
    setLoading(false)
  }

  return (
    <>
      <Meta title="Bulk & Trade Orders — Maxims Interiors" description="Bulk furniture and home-goods supply for hotels, developers, and commercial projects across Nigeria." />
      <PageHero
        eyebrow="Trade & Bulk"
        title="Furnishing at Scale"
        lead="Hotels, developments, offices — Maxims supplies and installs at volume, with trade pricing and a single point of contact."
      />

      {/* Perks */}
      <section className="bg-charcoal-mid border-b border-gold/10">
        <div className="container-lux px-5 sm:px-8 lg:px-16 py-12 grid sm:grid-cols-3 gap-6">
          {PERKS.map((p) => (
            <div key={p.title} className="flex gap-4">
              <p.icon size={24} className="text-gold shrink-0" />
              <div>
                <h3 className="font-editorial text-lg text-cream-soft">{p.title}</h3>
                <p className="font-body text-sm text-cream-soft/55 mt-1">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-base bg-charcoal">
        <div className="container-lux max-w-3xl">
          {success ? (
            <Reveal>
              <div className="card-glass p-10 text-center">
                <div className="grid place-items-center w-16 h-16 mx-auto rounded-full bg-gold/15 text-gold mb-5"><Check size={30} /></div>
                <h2 className="text-display-md">Request Received</h2>
                <p className="mt-4 font-body text-cream-soft/60 leading-relaxed">
                  Thank you, {form.name.split(' ')[0] || 'there'}. Our trade team will respond within 48 hours
                  with a custom quote for <span className="text-gold">{form.company}</span>.
                </p>
                <div className="mt-6 text-left max-w-sm mx-auto font-body text-sm text-cream-soft/50 space-y-1 border-t border-gold/10 pt-5">
                  {form.projectType && <p><span className="text-cream-soft/35">Project:</span> {form.projectType}</p>}
                  {form.category && <p><span className="text-cream-soft/35">Category:</span> {form.category}</p>}
                  {form.budget && <p><span className="text-cream-soft/35">Budget:</span> {form.budget}</p>}
                </div>
              </div>
            </Reveal>
          ) : (
            <Reveal>
              <div className="text-center mb-8">
                <Building2 size={28} className="text-gold mx-auto mb-3" />
                <h2 className="text-display-md">Request a Trade Quote</h2>
                <p className="mt-2 font-body text-cream-soft/55">Tell us about your project and we'll build a tailored proposal.</p>
              </div>

              {error && <div className="notice-error mb-6">{error}</div>}

              <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-5">
                <Field label="Company / Organisation *"><input className="lux-input" value={form.company} onChange={set('company')} /></Field>
                <Field label="Contact Name *"><input className="lux-input" value={form.name} onChange={set('name')} /></Field>
                <Field label="Email *"><input type="email" className="lux-input" value={form.email} onChange={set('email')} /></Field>
                <Field label="Phone"><input className="lux-input" value={form.phone} onChange={set('phone')} /></Field>
                <Field label="Project Type"><Select value={form.projectType} onChange={set('projectType')} options={PROJECT_TYPES} /></Field>
                <Field label="Product Category"><Select value={form.category} onChange={set('category')} options={CATEGORIES} /></Field>
                <Field label="Estimated Quantity"><input className="lux-input" placeholder="e.g. 120 chairs, 40 rooms" value={form.quantity} onChange={set('quantity')} /></Field>
                <Field label="Budget Range"><Select value={form.budget} onChange={set('budget')} options={BUDGETS} /></Field>
                <Field label="Project Details" full><textarea rows={4} className="lux-input resize-none" value={form.message} onChange={set('message')} placeholder="Timeline, location, scope…" /></Field>
                <div className="sm:col-span-2">
                  <button type="submit" disabled={loading} className="btn-gold-solid w-full disabled:opacity-60">
                    {loading ? 'Sending…' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </Reveal>
          )}
        </div>
      </section>
    </>
  )
}

function Field({ label, children, full }) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="font-title text-[0.62rem] tracking-[0.15em] uppercase text-cream-soft/50 block mb-2">{label}</span>
      {children}
    </label>
  )
}
function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} className="lux-input">
      <option value="">Select…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
