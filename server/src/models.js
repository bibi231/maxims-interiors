// server/src/models.js
// ============================================================
// All models in one place, backed by MariaDB (see sql/001-schema.sql and
// db/model.js). Field names are snake_case to match the frontend.
// Every record exposes `id` (and `_id`) in JSON; password_hash is never sent.
// ============================================================
import { defineModel, isValidId } from './db/model.js'

export { isValidId }

export const ROLES = ['owner', 'senior_designer', 'project_manager', 'shop_manager', 'content_editor']

const S = (extra = {}) => ({ type: 'string', ...extra })
const T = (extra = {}) => ({ type: 'text', ...extra })
const N = (extra = {}) => ({ type: 'number', ...extra })
const I = (extra = {}) => ({ type: 'int', ...extra })
const B = (def) => ({ type: 'bool', default: def })
const D = () => ({ type: 'date' })
const J = (def) => ({ type: 'json', default: def })
const R = (ref) => ({ type: 'ref', ref })

// ── USERS (staff / profiles) ─────────────────────────────────
export const User = defineModel('User', 'users', {
  email:            S({ required: true, lowercase: true, trim: true }),
  password_hash:    S({ required: true, hidden: true }),
  full_name:        S({ required: true }),
  role:             S({ enum: ROLES, default: 'content_editor' }),
  avatar_url:       T(),
  title:            S(),
  phone:            S(),
  is_active:        B(true),
  last_seen:        D(),
  // Bumped on every password change; reset links embed it so they are single-use.
  password_version: I({ default: 0 }),
})

// ── PRODUCTS ─────────────────────────────────────────────────
export const Product = defineModel('Product', 'products', {
  name:          S({ required: true }),
  slug:          S({ required: true }),
  description:   T(),
  price:         N({ required: true }),
  compare_price: N(),
  category:      S({ required: true }),
  badge:         S(),
  images:        J([]),
  cover_image:   T(),
  stock_qty:     I({ default: 0 }),
  sku:           S(),
  status:        S({ enum: ['active', 'draft', 'archived', 'out_of_stock'], default: 'active' }),
  is_featured:   B(false),
  sort_order:    I({ default: 0 }),
  tags:          J([]),
})

// ── ORDERS (order requests + quote requests) ─────────────────
export const ORDER_STATUSES = ['new', 'contacted', 'awaiting_payment', 'paid', 'confirmed', 'delivered', 'cancelled',
  'pending', 'processing', 'shipped', 'refunded']

// staff_notes / status_history entries get a timestamp when first saved.
function stampEntries(doc) {
  for (const k of ['staff_notes', 'status_history']) {
    if (!Array.isArray(doc[k])) doc[k] = []
    for (const e of doc[k]) if (e && typeof e === 'object' && !e.created_at) e.created_at = new Date()
  }
}

export const Order = defineModel('Order', 'orders', {
  order_number:      S(),
  customer_name:     S({ required: true }),
  customer_email:    S({ required: true }),
  customer_phone:    S(),
  delivery_address:  T(),
  city:              S(),
  state:             S(),
  items:             J([]),   // [{ product_id, name, slug, sku, price, qty, image }]
  subtotal:          N({ default: 0 }),
  delivery_fee:      N({ default: 0 }),
  total:             N({ default: 0 }),
  // Workflow: new -> contacted -> awaiting_payment -> paid/confirmed -> delivered | cancelled.
  status:            S({ enum: ORDER_STATUSES, default: 'new' }),
  kind:              S({ enum: ['order', 'quote'], default: 'order' }),
  source:            S(),
  service:           S(),
  preferred_contact: S({ enum: ['phone', 'whatsapp', 'email'], default: 'phone' }),
  payment_method:    S(),
  payment_ref:       S(),
  payment_status:    S({ default: 'unpaid' }),
  notes:             T(),
  staff_notes:       J([]),   // [{ text, author_name, created_at }]
  status_history:    J([]),   // [{ status, author_name, created_at }]
  assigned_to:       R('User'),
}, { beforeSave: stampEntries })

// ── BULK REQUESTS ────────────────────────────────────────────
export const BulkRequest = defineModel('BulkRequest', 'bulk_requests', {
  company_name:     T({ required: true }),
  contact_name:     T({ required: true }),
  email:            T({ required: true }),
  phone:            T(),
  project_type:     T(),
  product_category: T(),
  quantity:         T(),
  budget_range:     T(),
  message:          T(),
  status:           S({ enum: ['new', 'reviewing', 'quoted', 'accepted', 'declined', 'completed'], default: 'new' }),
  quote_amount:     N(),
  quote_notes:      T(),
  assigned_to:      R('User'),
  internal_notes:   T(),
})

// ── APPOINTMENTS ─────────────────────────────────────────────
export const Appointment = defineModel('Appointment', 'appointments', {
  client_name:    S({ required: true }),
  client_email:   S({ required: true }),
  client_phone:   S(),
  type:           S({ default: 'design_consultation' }),
  service:        S(),
  preferred_date: S({ required: true }), // YYYY-MM-DD
  preferred_time: S({ required: true }), // HH:mm
  duration_mins:  I({ default: 60 }),
  status:         S({ enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'], default: 'pending' }),
  location:       S({ default: 'showroom' }),
  meeting_link:   T(),
  notes:          T(),
  internal_notes: T(),
  assigned_to:    R('User'),
  confirmed_at:   D(),
})

// ── CONTACT MESSAGES ─────────────────────────────────────────
export const Message = defineModel('Message', 'messages', {
  full_name:  S({ required: true }),
  email:      S({ required: true }),
  phone:      S(),
  service:    S(),
  message:    T({ required: true }),
  status:     S({ enum: ['unread', 'read', 'replied', 'archived'], default: 'unread' }),
  replied_by: R('User'),
  reply_text: T(),
  replied_at: D(),
})

// ── GALLERY PROJECTS ─────────────────────────────────────────
export const Gallery = defineModel('Gallery', 'gallery', {
  title:        S({ required: true }),
  slug:         S({ required: true }),
  category:     S({ required: true }),
  location:     S(),
  year:         I(),
  grid_size:    S({ enum: ['small', 'medium', 'large'], default: 'small' }),
  description:  T(),
  images:       J([]),
  cover_image:  T(),
  is_featured:  B(false),
  is_published: B(true),
  sort_order:   I({ default: 0 }),
  sqft:         S(),
  duration:     S(),
  client_name:  S(),
})

// ── TESTIMONIALS ─────────────────────────────────────────────
export const Testimonial = defineModel('Testimonial', 'testimonials', {
  client_name:  S({ required: true }),
  client_role:  S(),
  quote:        T({ required: true }),
  rating:       I({ default: 5 }),
  project_type: S(),
  avatar_url:   T(),
  is_featured:  B(false),
  is_published: B(true),
  sort_order:   I({ default: 0 }),
})

// ── TEAM MEMBERS ─────────────────────────────────────────────
export const TeamMember = defineModel('TeamMember', 'team_members', {
  full_name:    S({ required: true }),
  title:        S({ required: true }),
  bio:          T(),
  photo_url:    T(),
  instagram:    S(),
  linkedin:     S(),
  sort_order:   I({ default: 0 }),
  is_published: B(true),
  profile_id:   R('User'),
})

// ── SITE SETTINGS (key/value) ────────────────────────────────
export const Setting = defineModel('Setting', 'settings', {
  key:   S({ required: true }),
  value: J(),
})

// ── ACTIVITY LOG ─────────────────────────────────────────────
export const Activity = defineModel('Activity', 'activity', {
  user_id:       R('User'),
  action:        S({ required: true }),
  resource_type: S(),
  resource_id:   S(),
  description:   T(),
})

// ── NEWSLETTER ───────────────────────────────────────────────
export const Newsletter = defineModel('Newsletter', 'newsletter', {
  email:       S({ required: true, lowercase: true, trim: true }),
  name:        S(),
  source:      S({ default: 'website' }),
  status:      S({ enum: ['subscribed', 'unsubscribed', 'bounced'], default: 'subscribed' }),
  welcomed_at: D(),
})

// ── TRANSACTIONS ─────────────────────────────────────────────
export const Transaction = defineModel('Transaction', 'transactions', {
  reference:        S({ required: true }),
  provider:         S({ default: 'squad' }),
  order_id:         R('Order'),
  customer_name:    S(),
  customer_email:   S({ required: true }),
  customer_phone:   S(),
  amount:           N({ required: true }),
  currency:         S({ default: 'NGN' }),
  status:           S({ enum: ['pending', 'success', 'failed', 'abandoned', 'refunded'], default: 'pending' }),
  channel:          S(),
  description:      T(),
  gateway_response: T(),
  metadata:         J({}),
  paid_at:          D(),
})
