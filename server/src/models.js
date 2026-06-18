// server/src/models.js
// ============================================================
// All Mongoose models in one place.
// Field names are snake_case to match the frontend (which was first
// built against Postgres) — keeps the React layer almost unchanged.
// Every model exposes `id` (not `_id`) in JSON.
// ============================================================
import mongoose from 'mongoose'

const { Schema, model } = mongoose

// Shared options: snake_case timestamps + clean JSON (id instead of _id)
const opts = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = ret._id
      delete ret._id
      delete ret.password_hash // never leak credentials
      return ret
    },
  },
}

export const ROLES = ['owner', 'senior_designer', 'project_manager', 'shop_manager', 'content_editor']

// ── USERS (staff / profiles) ─────────────────────────────────
const userSchema = new Schema({
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  full_name:     { type: String, required: true },
  role:          { type: String, enum: ROLES, default: 'content_editor' },
  avatar_url:    String,
  title:         String,
  phone:         String,
  is_active:     { type: Boolean, default: true },
  last_seen:     Date,
}, opts)

// ── PRODUCTS ─────────────────────────────────────────────────
const productSchema = new Schema({
  name:          { type: String, required: true },
  slug:          { type: String, required: true, unique: true },
  description:   String,
  price:         { type: Number, required: true },
  compare_price: Number,
  category:      { type: String, required: true },
  badge:         String,
  images:        { type: [String], default: [] },
  cover_image:   String,
  stock_qty:     { type: Number, default: 0 },
  sku:           String,
  status:        { type: String, enum: ['active', 'draft', 'archived', 'out_of_stock'], default: 'active' },
  is_featured:   { type: Boolean, default: false },
  sort_order:    { type: Number, default: 0 },
  tags:          { type: [String], default: [] },
}, opts)

// ── ORDERS ───────────────────────────────────────────────────
const orderSchema = new Schema({
  order_number:     { type: String, unique: true },
  customer_name:    { type: String, required: true },
  customer_email:   { type: String, required: true },
  customer_phone:   String,
  delivery_address: String,
  city:             String,
  state:            String,
  items:            { type: [Schema.Types.Mixed], default: [] },
  subtotal:         { type: Number, default: 0 },
  delivery_fee:     { type: Number, default: 0 },
  total:            { type: Number, default: 0 },
  status:           { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], default: 'pending' },
  payment_method:   String,
  payment_ref:      String,
  payment_status:   { type: String, default: 'unpaid' },
  notes:            String,
  assigned_to:      { type: Schema.Types.ObjectId, ref: 'User' },
}, opts)

// ── BULK REQUESTS ────────────────────────────────────────────
const bulkSchema = new Schema({
  company_name:     { type: String, required: true },
  contact_name:     { type: String, required: true },
  email:            { type: String, required: true },
  phone:            String,
  project_type:     String,
  product_category: String,
  quantity:         String,
  budget_range:     String,
  message:          String,
  status:           { type: String, enum: ['new', 'reviewing', 'quoted', 'accepted', 'declined', 'completed'], default: 'new' },
  quote_amount:     Number,
  quote_notes:      String,
  assigned_to:      { type: Schema.Types.ObjectId, ref: 'User' },
  internal_notes:   String,
}, opts)

// ── APPOINTMENTS ─────────────────────────────────────────────
const apptSchema = new Schema({
  client_name:    { type: String, required: true },
  client_email:   { type: String, required: true },
  client_phone:   String,
  type:           { type: String, default: 'design_consultation' },
  service:        String,
  preferred_date: { type: String, required: true }, // YYYY-MM-DD
  preferred_time: { type: String, required: true }, // HH:mm
  duration_mins:  { type: Number, default: 60 },
  status:         { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'], default: 'pending' },
  location:       { type: String, default: 'showroom' },
  meeting_link:   String,
  notes:          String,
  internal_notes: String,
  assigned_to:    { type: Schema.Types.ObjectId, ref: 'User' },
  confirmed_at:   Date,
}, opts)

// ── CONTACT MESSAGES ─────────────────────────────────────────
const messageSchema = new Schema({
  full_name:  { type: String, required: true },
  email:      { type: String, required: true },
  phone:      String,
  service:    String,
  message:    { type: String, required: true },
  status:     { type: String, enum: ['unread', 'read', 'replied', 'archived'], default: 'unread' },
  replied_by: { type: Schema.Types.ObjectId, ref: 'User' },
  reply_text: String,
  replied_at: Date,
}, opts)

// ── GALLERY PROJECTS ─────────────────────────────────────────
const gallerySchema = new Schema({
  title:        { type: String, required: true },
  slug:         { type: String, required: true, unique: true },
  category:     { type: String, required: true },
  location:     String,
  year:         Number,
  grid_size:    { type: String, enum: ['small', 'medium', 'large'], default: 'small' },
  description:  String,
  images:       { type: [String], default: [] },
  cover_image:  String,
  is_featured:  { type: Boolean, default: false },
  is_published: { type: Boolean, default: true },
  sort_order:   { type: Number, default: 0 },
  sqft:         String,
  duration:     String,
  client_name:  String,
}, opts)

// ── TESTIMONIALS ─────────────────────────────────────────────
const testimonialSchema = new Schema({
  client_name:  { type: String, required: true },
  client_role:  String,
  quote:        { type: String, required: true },
  rating:       { type: Number, default: 5, min: 1, max: 5 },
  project_type: String,
  avatar_url:   String,
  is_featured:  { type: Boolean, default: false },
  is_published: { type: Boolean, default: true },
  sort_order:   { type: Number, default: 0 },
}, opts)

// ── TEAM MEMBERS ─────────────────────────────────────────────
const teamSchema = new Schema({
  full_name:    { type: String, required: true },
  title:        { type: String, required: true },
  bio:          String,
  photo_url:    String,
  instagram:    String,
  linkedin:     String,
  sort_order:   { type: Number, default: 0 },
  is_published: { type: Boolean, default: true },
  profile_id:   { type: Schema.Types.ObjectId, ref: 'User' },
}, opts)

// ── SITE SETTINGS (key/value) ────────────────────────────────
const settingSchema = new Schema({
  key:   { type: String, required: true, unique: true },
  value: Schema.Types.Mixed,
}, opts)

// ── ACTIVITY LOG ─────────────────────────────────────────────
const activitySchema = new Schema({
  user_id:       { type: Schema.Types.ObjectId, ref: 'User' },
  action:        { type: String, required: true },
  resource_type: String,
  resource_id:   String,
  description:   String,
}, opts)

// ── NEWSLETTER ───────────────────────────────────────────────
const newsletterSchema = new Schema({
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:        String,
  source:      { type: String, default: 'website' },
  status:      { type: String, enum: ['subscribed', 'unsubscribed', 'bounced'], default: 'subscribed' },
  welcomed_at: Date,
}, opts)

// ── TRANSACTIONS ─────────────────────────────────────────────
const txnSchema = new Schema({
  reference:        { type: String, required: true, unique: true },
  provider:         { type: String, default: 'squad' },
  order_id:         { type: Schema.Types.ObjectId, ref: 'Order' },
  customer_name:    String,
  customer_email:   { type: String, required: true },
  customer_phone:   String,
  amount:           { type: Number, required: true },
  currency:         { type: String, default: 'NGN' },
  status:           { type: String, enum: ['pending', 'success', 'failed', 'abandoned', 'refunded'], default: 'pending' },
  channel:          String,
  description:      String,
  gateway_response: String,
  metadata:         { type: Schema.Types.Mixed, default: {} },
  paid_at:          Date,
}, opts)

export const User        = model('User', userSchema)
export const Product     = model('Product', productSchema)
export const Order       = model('Order', orderSchema)
export const BulkRequest = model('BulkRequest', bulkSchema)
export const Appointment = model('Appointment', apptSchema)
export const Message     = model('Message', messageSchema)
export const Gallery     = model('Gallery', gallerySchema)
export const Testimonial = model('Testimonial', testimonialSchema)
export const TeamMember  = model('TeamMember', teamSchema)
export const Setting     = model('Setting', settingSchema)
export const Activity    = model('Activity', activitySchema)
export const Newsletter  = model('Newsletter', newsletterSchema)
export const Transaction = model('Transaction', txnSchema)
