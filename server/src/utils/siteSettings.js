// server/src/utils/siteSettings.js
// Defaults for the staff-editable site settings (settings table, key/value).
// The admin edits contact_info (Settings > Contact & Address) and pricing
// (Pricing & Services). Public pages read them from GET /api/settings and
// GET /api/pricing; these defaults only fill keys that were never saved.
// Keep in sync with src/lib/siteDefaults.js (frontend fallback while loading).
import { Setting } from '../models.js'
import { ValidationError } from '../db/model.js'

export const DEFAULT_ADDRESS = 'No. 8 Oke Agbe Street, Garki 2, Abuja, FCT'

export const DEFAULT_CONTACT = {
  address: DEFAULT_ADDRESS,
  phone: '',
  whatsapp: '',
  email: 'info@maximsinterior.com.ng',
  hours: 'Mon–Sat: 9am–6pm WAT',
  map_url: '',
}

// Prices are naira (whole numbers). price: null = "Custom" / on request.
export const DEFAULT_PRICING = {
  currency: 'NGN',
  consultation: {
    title: 'Design consultation',
    fee: 0, // 0 = complimentary
    duration: '60 minutes',
    description: 'A one-on-one session with our lead designer, at our showroom or on a video call.',
  },
  packages: [
    { name: 'Essence', price: 150000, price_note: '', featured: false, features: ['1.5hr consultation', 'Colour palette', 'Mood board', 'Shopping list'] },
    { name: 'Signature', price: 400000, price_note: '', featured: true, features: ['Full 2D layout', '3D visualisations', 'Trade discounts', 'Project tracking', 'Site visits'] },
    { name: 'Prestige', price: null, price_note: 'Custom', featured: false, features: ['Full-service project management', 'Custom furniture', 'Priority support', 'Nationwide travel'] },
  ],
  services: [
    { key: 'full-room', title: 'Full Room Design', description: 'Comprehensive design service for a single room, from concept to final reveal.', price_from: null },
    { key: 'space-planning', title: 'Space Planning', description: 'Optimising the layout of your furniture and fixtures for maximum flow and function.', price_from: null },
    { key: 'colour', title: 'Colour Consultation', description: 'Expert palettes curated to set the right mood and coordinate with your existing architecture.', price_from: null },
    { key: 'sourcing', title: 'Furniture Sourcing', description: 'Access to exclusive trade-only collections and custom artisan furniture pieces.', price_from: null },
    { key: 'staging', title: 'Home Staging', description: 'Preparing your property for the market to maximise appeal and value.', price_from: null },
    { key: 'virtual', title: 'Virtual Design', description: 'Professional design services delivered entirely online, nationwide.', price_from: null },
  ],
  bulk: { min_items: 10, min_value: 2500000 },
}

const DEFAULTS = { contact_info: DEFAULT_CONTACT, pricing: DEFAULT_PRICING }

/** Merges a stored object value over its defaults (shallow). */
export function withDefaults(key, value) {
  const d = DEFAULTS[key]
  if (!d) return value
  if (!value || typeof value !== 'object' || Array.isArray(value)) return structuredClone(d)
  return { ...structuredClone(d), ...value }
}

export async function getSetting(key) {
  const row = await Setting.findOne({ key })
  return withDefaults(key, row?.value ?? null)
}

// ── Validation for staff-submitted values ─────────────────────
const str = (v, max = 300) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max))
const money = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Math.round(Number(String(v).replace(/[₦,\s]/g, '')))
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) throw new ValidationError(`"${v}" is not a valid amount`)
  return n
}

export function cleanContact(v = {}) {
  const out = {}
  for (const k of Object.keys(DEFAULT_CONTACT)) out[k] = str(v[k], k === 'map_url' ? 500 : 300)
  if (out.map_url && !/^https:\/\//i.test(out.map_url)) out.map_url = ''
  return out
}

export function cleanPricing(v = {}) {
  const c = v.consultation || {}
  const packages = (Array.isArray(v.packages) ? v.packages : []).slice(0, 12).map((p) => ({
    name: str(p?.name, 80),
    price: money(p?.price),
    price_note: str(p?.price_note, 60),
    featured: Boolean(p?.featured),
    features: (Array.isArray(p?.features) ? p.features : String(p?.features || '').split('\n')).map((f) => str(f, 120)).filter(Boolean).slice(0, 15),
  })).filter((p) => p.name)
  const services = (Array.isArray(v.services) ? v.services : []).slice(0, 24).map((s, i) => ({
    key: str(s?.key, 40) || `service-${i + 1}`,
    title: str(s?.title, 80),
    description: str(s?.description, 400),
    price_from: money(s?.price_from),
  })).filter((s) => s.title)
  return {
    currency: 'NGN',
    consultation: {
      title: str(c.title, 80) || DEFAULT_PRICING.consultation.title,
      fee: money(c.fee) ?? 0,
      duration: str(c.duration, 60),
      description: str(c.description, 400),
    },
    packages,
    services,
    bulk: { min_items: Math.max(0, Math.round(Number(v.bulk?.min_items) || 0)), min_value: money(v.bulk?.min_value) ?? 0 },
  }
}
