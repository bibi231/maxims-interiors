// src/lib/siteDefaults.js
// Fallbacks shown while site settings load (or if the API is unreachable).
// The real values are staff-editable in the admin and come from
// GET /api/settings. Keep in sync with server/src/utils/siteSettings.js.
export const DEFAULT_ADDRESS = 'No. 8 Oke Agbe Street, Garki 2, Abuja'

export const DEFAULT_CONTACT = {
  address: DEFAULT_ADDRESS,
  phone: '',
  whatsapp: '',
  email: 'info@maximsinterior.com.ng',
  hours: 'Mon–Sat: 9am–6pm WAT',
  map_url: '',
}

export const DEFAULT_PRICING = {
  currency: 'NGN',
  consultation: { title: 'Design consultation', fee: 0, duration: '60 minutes', description: 'A one-on-one session with our lead designer, at our showroom or on a video call.' },
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

/** Google Maps link for the address (staff can override with map_url). */
export function mapsUrl(ci = {}) {
  if (ci.map_url) return ci.map_url
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ci.address || DEFAULT_ADDRESS}, Nigeria`)}`
}

/** "tel:" / WhatsApp links from a Nigerian number as typed by staff. */
export function telHref(n) { return n ? `tel:${String(n).replace(/[^\d+]/g, '')}` : null }
export function waHref(n) {
  if (!n) return null
  let d = String(n).replace(/\D/g, '')
  if (d.startsWith('0')) d = '234' + d.slice(1)
  return `https://wa.me/${d}`
}
