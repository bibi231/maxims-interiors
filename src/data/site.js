// src/data/site.js
// ============================================================
// Central static content & config. Editing copy here updates it
// site-wide — keeps non-DB content trivial to maintain.
// (Dynamic content — products, gallery, testimonials, team —
//  comes from Supabase, not here.)
// ============================================================

export const BRAND = {
  name: 'Maxims Interiors',
  legalName: 'Maxims Interiors & Home Goods',
  tagline: 'Where Luxury Meets Living',
  city: 'Abuja, Nigeria',
}

// Fallback contact details (overridden by site_settings.contact_info when present)
export const CONTACT_FALLBACK = {
  phone: '+234 800 000 0000',
  email: 'hello@maximsinteriors.com',
  address: '123 Design Boulevard, Wuse 2, Abuja, FCT',
  hours: 'Mon–Sat: 9am–7pm WAT',
}

export const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Interior Decor', path: '/interior-decor' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Shop', path: '/shop' },
  { label: 'Bulk Orders', path: '/bulk-orders' },
  { label: 'Testimonials', path: '/testimonials' },
  { label: 'About', path: '/about' },
  { label: 'Team', path: '/team' },
]

// Home + Interior Decor services (no DB table — static)
export const SERVICES = [
  {
    icon: 'Sofa',
    title: 'Residential Design',
    blurb: 'Full-home interiors that balance comfort, function, and timeless elegance — from concept to the final styled reveal.',
  },
  {
    icon: 'Building2',
    title: 'Commercial & Hospitality',
    blurb: 'Hotels, lounges, and offices designed to elevate brand and guest experience while maximising every square metre.',
  },
  {
    icon: 'Lightbulb',
    title: 'Lighting & Ambience',
    blurb: 'Layered lighting schemes that sculpt mood and highlight architecture, day into night.',
  },
  {
    icon: 'Palette',
    title: 'Colour & Material Curation',
    blurb: 'Considered palettes, textiles, and finishes sourced for richness, durability, and a distinctly Maxims signature.',
  },
  {
    icon: 'Ruler',
    title: 'Space Planning',
    blurb: 'Intelligent layouts and flow optimisation that make rooms feel generous, calm, and effortless to live in.',
  },
  {
    icon: 'Truck',
    title: 'Trade & Bulk Supply',
    blurb: 'Reliable bulk sourcing of furniture and home goods for developers, hotels, and procurement teams.',
  },
]

// Design process steps (Interior Decor + About)
export const PROCESS = [
  { step: '01', title: 'Consultation', text: 'We listen first — your lifestyle, taste, and vision shape everything that follows.' },
  { step: '02', title: 'Concept & Mood', text: 'Mood boards, palettes, and spatial concepts bring the direction to life.' },
  { step: '03', title: 'Design & Sourcing', text: 'Detailed plans, 3D visuals, and curated sourcing of every piece.' },
  { step: '04', title: 'Install & Reveal', text: 'White-glove installation and styling, ending in a reveal you will never forget.' },
]

export const VALUES = [
  { title: 'Craft', text: 'Every detail is intentional. We sweat the millimetres so the whole feels effortless.' },
  { title: 'Warmth', text: 'Luxury that invites you in — spaces made to be lived in, not just admired.' },
  { title: 'Integrity', text: 'Honest timelines, honest budgets, and finishes that last well beyond the trend.' },
]

// About timeline (static historical milestones)
export const TIMELINE = [
  { year: '2016', title: 'The Beginning', text: 'Maxims opens its first studio in Abuja with a single bold idea — Nigerian luxury, world-class craft.' },
  { year: '2019', title: 'Hospitality Era', text: 'First major hotel commission; the trade & bulk-supply arm is born.' },
  { year: '2022', title: 'The Showroom', text: 'Our flagship showroom opens in Wuse 2, bringing the Maxims home-goods collection to life.' },
  { year: '2024', title: 'A New Standard', text: 'Over 200 spaces transformed across Nigeria, and a name synonymous with refined living.' },
]

// TrueWeb Network footer signature
export const TRUEWEB = {
  label: 'TrueWeb Network',
  url: 'https://trueweb.com.ng',
}
