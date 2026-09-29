// server/src/routes/orders.js
// Order requests + quote requests. Payments are not live yet, so customers
// submit a request (no payment) and staff follow up. When PAYMENTS_ENABLED=true
// the storefront can additionally start a payment for an order request.
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { Order, Product, ORDER_STATUSES, isValidId } from '../models.js'
import { requireAuth, canAccess, canWrite, requireOwner } from '../middleware/auth.js'
import { logActivity } from '../utils/activity.js'
import { sendMail } from '../utils/mailer.js'
import { emailShell, esc, detailsTable, itemsTable, refBlock, naira } from '../utils/templates.js'
import { notifyStaff, appUrl } from '../utils/notify.js'
import { forwardLead } from '../utils/supportai.js'
import { getSetting } from '../utils/siteSettings.js'
import { payToken, checkPayToken } from '../utils/payments.js'
import { paymentsEnabled } from '../utils/config.js'
import { orderPayable } from './payments.js'

const router = Router()
const submitLimiter = rateLimit({ windowMs: 60 * 1000, max: 6, standardHeaders: true, legacyHeaders: false })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTACT_PREFS = ['phone', 'whatsapp', 'email']
const STATUS_LABEL = {
  new: 'New', contacted: 'Contacted', awaiting_payment: 'Awaiting payment', paid: 'Paid',
  confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled',
  pending: 'Pending', processing: 'Processing', shipped: 'Shipped', refunded: 'Refunded',
}

function reference(kind) {
  const prefix = kind === 'quote' ? 'MQ' : 'MX'
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`
}

const clean = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined)

// Re-price the cart from the database: never trust client-sent prices.
async function priceItems(rawItems) {
  const input = Array.isArray(rawItems) ? rawItems.slice(0, 50) : []
  const ids = input.map((i) => i?.product_id || i?.id).map(String).filter(isValidId)
  const products = ids.length ? await Product.find({ _id: { $in: ids } }) : []
  const byId = new Map(products.map((p) => [String(p._id), p]))
  const items = []
  for (const raw of input) {
    const p = byId.get(String(raw?.product_id || raw?.id))
    if (!p) continue
    const qty = Math.min(Math.max(parseInt(raw.qty, 10) || 1, 1), 999)
    items.push({ product_id: String(p._id), name: p.name, slug: p.slug, sku: p.sku, price: Number(p.price) || 0, qty, image: p.cover_image })
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  return { items, subtotal }
}

// PUBLIC — submit an order request (from the cart) or a quote request
// (from a product page or a service). No payment is taken here.
async function createRequest(req, res) {
  const b = req.body || {}
  const kind = b.kind === 'quote' ? 'quote' : 'order'
  const name = clean(b.customer_name, 120)
  const email = clean(b.customer_email, 160)?.toLowerCase()
  const phone = clean(b.customer_phone, 40)
  if (!name) return res.status(400).json({ error: 'Please enter your full name.' })
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
  if (!phone || phone.replace(/\D/g, '').length < 7) return res.status(400).json({ error: 'Please enter a phone number we can reach you on.' })

  const { items, subtotal: productSubtotal } = await priceItems(b.items)
  let subtotal = productSubtotal
  // A design package from Pricing & Services: priced on the server from the
  // admin-set price (never from the client), so it can be paid online.
  const pkgName = clean(b.package, 80)
  if (pkgName) {
    const { packages = [] } = await getSetting('pricing')
    const pkg = packages.find((p) => p.name.toLowerCase() === pkgName.toLowerCase())
    if (pkg && Number(pkg.price) > 0) {
      items.push({ product_id: null, name: `${pkg.name} design package`, slug: null, sku: null, price: Number(pkg.price), qty: 1, image: null, package: pkg.name })
      subtotal += Number(pkg.price)
    }
  }
  const service = clean(b.service, 160)
  if (kind === 'order' && !items.length) return res.status(400).json({ error: 'Your cart is empty. Add a product first.' })
  if (kind === 'quote' && !items.length && !service && !clean(b.notes)) {
    return res.status(400).json({ error: 'Tell us what you would like a quote for.' })
  }

  const order = await Order.create({
    order_number: reference(kind),
    kind,
    source: clean(b.source, 40) || (kind === 'order' ? 'cart' : pkgName ? 'package' : items.length ? 'product' : 'service'),
    service,
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    delivery_address: clean(b.delivery_address, 300),
    city: clean(b.city, 80),
    state: clean(b.state, 80),
    preferred_contact: CONTACT_PREFS.includes(b.preferred_contact) ? b.preferred_contact : 'phone',
    notes: clean(b.notes, 2000),
    items,
    subtotal,
    delivery_fee: 0, // confirmed by staff when they call
    total: subtotal,
    status: 'new',
    payment_status: 'unpaid',
    status_history: [{ status: 'new', author_name: 'Customer' }],
  })

  const isQuote = kind === 'quote'
  const label = isQuote ? 'Quote request' : 'Order request'
  const first = esc(name.split(' ')[0])
  const details = detailsTable([
    ['Reference', order.order_number],
    ['Name', order.customer_name],
    ['Phone', order.customer_phone],
    ['Email', order.customer_email],
    ['Preferred contact', order.preferred_contact],
    ['Service', order.service],
    ['Delivery address', [order.delivery_address, order.city, order.state].filter(Boolean).join(', ')],
    ['Notes', order.notes],
  ])
  const lines = itemsTable(items, { subtotal: items.length ? subtotal : undefined, total: items.length ? subtotal : undefined })

  // Respond first: email + SupportAI must never slow down or fail the customer.
  const token = payToken(order.id)
  res.status(201).json({
    id: order.id, order_number: order.order_number, kind, status: order.status,
    total: order.total, items: order.items,
    pay_token: token, pay_url: `${appUrl()}/pay/${order.id}?t=${token}`,
    payable: paymentsEnabled() && orderPayable(order),
  })

  notifyStaff({
    subject: `New ${label.toLowerCase()} ${order.order_number} from ${name}`,
    heading: `New ${label}`,
    replyTo: email,
    adminPath: '/admin/orders',
    body: `<p>A customer has submitted a ${label.toLowerCase()} on the website. No payment has been taken &mdash; please contact them to confirm${isQuote ? ' and send a quote' : ' availability, delivery and payment'}.</p>${details}${lines}`,
  })

  sendMail({
    to: email,
    replyTo: process.env.MAIL_REPLY_TO || 'info@maximsinterior.com.ng',
    subject: `We received your ${label.toLowerCase()} (${order.order_number}) - Maxims Interiors`,
    html: emailShell({
      preheader: `Reference ${order.order_number}. Our team will contact you shortly.`,
      heading: isQuote ? 'Your quote request is in' : 'Your order request is in',
      body: `<p>Dear ${first},</p>
        <p>Thank you for choosing Maxims Interiors. We have received your ${label.toLowerCase()} and a member of our team will contact you by <strong>${esc(order.preferred_contact)}</strong> shortly${isQuote ? ' with a tailored quote' : ' to confirm availability, delivery and payment'}.</p>
        ${refBlock('Your reference number', order.order_number)}
        ${lines}
        ${items.length ? '<p style="font-size:13px;color:#6b6880;">Prices shown are current catalogue prices. Delivery is confirmed separately. <strong>No payment has been taken.</strong></p>' : ''}
        <p>Please quote your reference number in any correspondence. If you have questions, simply reply to this email or call us.</p>`,
      ctaLabel: 'Continue Browsing', ctaUrl: `${appUrl()}/shop`,
    }),
  })

  forwardLead({
    kind: isQuote ? 'quote' : 'order',
    reference: order.order_number,
    name, email, phone,
    preferredContact: order.preferred_contact,
    message: [order.service, order.notes, items.map((i) => `${i.name} x${i.qty}`).join(', ')].filter(Boolean).join(' | '),
    value: subtotal || undefined,
    currency: 'NGN',
  })
}

const safe = (fn) => (req, res, next) => fn(req, res).catch(next)
router.post('/', submitLimiter, safe(createRequest))
router.post('/request', submitLimiter, safe(createRequest))

// PUBLIC (with pay token) — what the customer sees on /pay/:id
router.get('/pay/:id', safe(async (req, res) => {
  const id = String(req.params.id)
  if (!isValidId(id) || !checkPayToken(id, req.query.t)) return res.status(404).json({ error: 'This payment link is not valid. Please use the link from your email or contact us.' })
  const o = await Order.findById(id)
  if (!o) return res.status(404).json({ error: 'Order not found' })
  res.json({
    id: o.id, order_number: o.order_number, kind: o.kind, status: o.status, payment_status: o.payment_status,
    customer_name: String(o.customer_name).split(' ')[0],
    items: (o.items || []).map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    subtotal: o.subtotal, delivery_fee: o.delivery_fee, total: o.total,
    payable: orderPayable(o), payments_enabled: paymentsEnabled(),
  })
}))

// STAFF — get (and optionally email) the customer's pay link for an order.
router.post('/:id/payment-link', requireAuth, canWrite('orders'), safe(async (req, res) => {
  const o = await Order.findById(req.params.id)
  if (!o) return res.status(404).json({ error: 'Order not found' })
  const url = `${appUrl()}/pay/${o.id}?t=${payToken(o.id)}`
  let emailed = null
  if (req.body?.send) {
    if (!orderPayable(o)) return res.status(409).json({ error: 'Set an amount (and make sure it is not already paid or closed) before sending a payment link.' })
    emailed = await sendMail({
      to: o.customer_email,
      replyTo: process.env.MAIL_REPLY_TO || 'info@maximsinterior.com.ng',
      subject: `Payment for ${o.order_number} - Maxims Interiors`,
      html: emailShell({
        heading: 'Your payment link',
        body: `<p>Dear ${esc(String(o.customer_name).split(' ')[0])},</p><p>You can pay for ${o.kind === 'quote' ? 'your quote' : 'your order'} <strong>${esc(o.order_number)}</strong> securely online. Amount due: <strong>${naira(o.total)}</strong>.</p>${itemsTable(o.items || [], { subtotal: o.subtotal, deliveryFee: o.delivery_fee, total: o.total })}`,
        ctaLabel: `Pay ${naira(o.total)}`, ctaUrl: url,
      }),
    })
    if (emailed && ['new', 'contacted'].includes(o.status)) {
      o.status = 'awaiting_payment'
      o.status_history.push({ status: 'awaiting_payment', author_name: req.user.full_name || req.user.email })
      await o.save()
    }
    await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'order', resourceId: o.id, description: `Payment link for ${o.order_number} ${emailed ? 'emailed' : 'email failed'}` })
  }
  res.json({ url, payable: orderPayable(o), payments_enabled: paymentsEnabled(), emailed })
}))

// ADMIN — list
router.get('/', requireAuth, canAccess('orders'), async (req, res) => {
  const q = {}
  if (req.query.status) q.status = req.query.status
  if (req.query.kind) q.kind = req.query.kind === 'order' ? { $in: ['order', null] } : req.query.kind
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    q.$or = [{ customer_name: rx }, { customer_email: rx }, { customer_phone: rx }, { order_number: rx }]
  }
  const rows = await Order.find(q).sort({ created_at: -1 }).limit(500).populate('assigned_to', 'full_name avatar_url')
  res.json(rows)
})

// ADMIN — update status / assignment / payment status, or add a staff note
router.patch('/:id', requireAuth, canWrite('orders'), async (req, res) => {
  const o = await Order.findById(req.params.id)
  if (!o) return res.status(404).json({ error: 'Order not found' })
  const { status, assigned_to, payment_status, note, delivery_fee, quoted_total } = req.body || {}
  const author = req.user.full_name || req.user.email
  const changes = []

  if (status !== undefined && status !== o.status) {
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status' })
    o.status = status
    o.status_history.push({ status, author_name: author })
    // Staff recording an offline payment (bank transfer, cash). Online payments
    // are only ever marked paid by utils/settlePayment.js after gateway verification.
    if (status === 'paid' && o.payment_status !== 'paid') { o.payment_status = 'paid'; o.payment_method = o.payment_method || 'manual' }
    changes.push(`status → ${STATUS_LABEL[status] || status}`)
  }
  if (payment_status !== undefined) o.payment_status = payment_status
  if (assigned_to !== undefined) o.assigned_to = assigned_to || null
  if (delivery_fee !== undefined && !Number.isNaN(Number(delivery_fee))) {
    o.delivery_fee = Math.max(0, Number(delivery_fee))
    o.total = Number(o.subtotal || 0) + o.delivery_fee
    changes.push(`delivery fee set`)
  }
  // Quotes: staff set the quoted price; the customer can then pay it online.
  if (quoted_total !== undefined && o.kind === 'quote') {
    const q = Number(quoted_total)
    if (!Number.isFinite(q) || q < 0) return res.status(400).json({ error: 'Invalid quote amount' })
    if (o.payment_status === 'paid') return res.status(409).json({ error: 'This quote has already been paid.' })
    o.subtotal = q
    o.total = q + Number(o.delivery_fee || 0)
    changes.push('quote amount set')
  }
  if (typeof note === 'string' && note.trim()) {
    o.staff_notes.push({ text: note.trim().slice(0, 2000), author_name: author })
    changes.push('note added')
  }
  await o.save()
  await logActivity({ userId: req.user.id, action: 'status_changed', resourceType: 'order', resourceId: o.id, description: `${o.kind === 'quote' ? 'Quote' : 'Order'} ${o.order_number}: ${changes.join(', ') || 'updated'}` })
  await o.populate('assigned_to', 'full_name avatar_url')
  res.json(o)
})

router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  await Order.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default router
