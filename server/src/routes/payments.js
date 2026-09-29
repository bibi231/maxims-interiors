// server/src/routes/payments.js
// Online payments (GTCO Squad by default; Paystack also supported).
// Off unless PAYMENTS_ENABLED=true and the provider secret key is set.
//
// Flow for a customer order / quote:
//   1. Customer submits a request -> gets an order id + pay token (or staff
//      send them the pay link /pay/<orderId>?t=<token>).
//   2. POST /api/payments/initialize { orderId, token } -> server charges the
//      order's server-side total (kobo), creates a pending transaction,
//      returns the Squad checkout URL.
//   3. Squad calls POST /api/payments/webhook?provider=squad (HMAC-SHA512
//      signed) -> settles the transaction + order (idempotent).
//   4. Customer is redirected to /payment/callback?reference=... which calls
//      POST /api/payments/verify -> server asks Squad directly (fallback when
//      the webhook is late or not configured).
// The browser never marks anything paid.
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { Transaction, Order, isValidId } from '../models.js'
import { paymentsEnabled, paymentProvider } from '../utils/config.js'
import { requireAuth, canAccess, canWrite, attachUser, ROLE_PERMISSIONS } from '../middleware/auth.js'
import { initPayment, verifyPayment, verifyWebhookSignature, parseWebhook, generateReference, toKobo, checkPayToken } from '../utils/payments.js'
import { applyGatewayResult } from '../utils/settlePayment.js'
import { appUrl } from '../utils/notify.js'
import { logActivity } from '../utils/activity.js'

const router = Router()
const initLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false })
const verifyLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false })
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const safe = (fn) => (req, res, next) => fn(req, res).catch(next)

const CLOSED = ['cancelled', 'delivered', 'refunded', 'paid', 'confirmed', 'shipped']
export function orderPayable(o) {
  return Boolean(o) && o.payment_status !== 'paid' && !CLOSED.includes(o.status) && Number(o.total) > 0
}

// PUBLIC (order + token) / STAFF (custom amount) — start a payment.
router.post('/initialize', initLimiter, attachUser, safe(async (req, res) => {
  if (!paymentsEnabled()) return res.status(503).json({ error: 'Online payment is not available yet. Please submit an order request and our team will contact you.' })
  const b = req.body || {}
  const provider = paymentProvider()
  let amount, email, name, phone, description, orderId = null, metadata = {}

  if (b.orderId) {
    if (!isValidId(String(b.orderId))) return res.status(404).json({ error: 'Order not found' })
    const order = await Order.findById(b.orderId)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    const isStaff = req.user && ROLE_PERMISSIONS[req.user.role]?.write.includes('orders')
    if (!isStaff && !checkPayToken(order.id, b.token)) return res.status(403).json({ error: 'This payment link is not valid. Please use the link from your email.' })
    if (!orderPayable(order)) {
      return res.status(409).json({ error: order.payment_status === 'paid' ? 'This order has already been paid. Thank you!' : 'This order is not awaiting payment. Please contact us.' })
    }
    amount = Number(order.total) // server-side total, never the client's number
    email = order.customer_email; name = order.customer_name; phone = order.customer_phone
    description = `${order.kind === 'quote' ? 'Quote' : 'Order'} ${order.order_number}`
    orderId = order.id
    metadata = { order_number: order.order_number }
  } else {
    // Custom-amount payment links (deposits etc.) are staff-only.
    if (!req.user || !ROLE_PERMISSIONS[req.user.role]?.write.includes('transactions')) return res.status(401).json({ error: 'Sign in to create a payment link.' })
    amount = Number(b.amount); email = String(b.email || '').trim().toLowerCase(); name = b.name; phone = b.phone
    description = String(b.description || '').slice(0, 300)
    metadata = typeof b.metadata === 'object' && b.metadata ? b.metadata : {}
  }
  if (!EMAIL_RE.test(email || '')) return res.status(400).json({ error: 'Valid email required' })
  if (!Number.isFinite(amount) || amount < 100 || amount > 100_000_000) return res.status(400).json({ error: 'Amount must be between ₦100 and ₦100,000,000' })

  const reference = generateReference(orderId ? 'MXP' : 'MXL')
  const txn = await Transaction.create({
    reference, provider, order_id: orderId || undefined,
    customer_name: name, customer_email: email, customer_phone: phone,
    amount, currency: 'NGN', status: 'pending', description, metadata,
  })
  try {
    const { checkoutUrl } = await initPayment(provider, {
      amountKobo: toKobo(amount), email, name, reference,
      // The gateway appends ?reference=<ref> (Squad) / ?reference=&trxref= (Paystack).
      callbackUrl: `${appUrl()}/payment/callback`,
      metadata: { ...metadata, description },
    })
    if (req.user) await logActivity({ userId: req.user.id, action: 'created', resourceType: 'transaction', resourceId: txn.id, description: `Payment link ${reference} for ₦${amount.toLocaleString('en-NG')}` })
    res.json({ reference, checkout_url: checkoutUrl, provider, amount })
  } catch (e) {
    txn.status = 'failed'; txn.gateway_response = `init failed: ${e.message}`.slice(0, 500); await txn.save()
    console.error('[payments] init failed:', e.message)
    res.status(502).json({ error: 'The payment page could not be opened. Please try again in a minute or contact us.' })
  }
}))

// PUBLIC — verify-on-return fallback. Asks the gateway directly.
router.post('/verify', verifyLimiter, safe(async (req, res) => {
  const reference = String(req.body?.reference || '').slice(0, 191)
  if (!reference) return res.status(400).json({ error: 'reference required' })
  const txn = await Transaction.findOne({ reference })
  if (!txn) return res.status(404).json({ error: 'Transaction not found' })
  const shape = (t, status) => ({
    status,
    transaction: { reference: t.reference, amount: t.amount, currency: t.currency, customer_name: t.customer_name, status: t.status, paid_at: t.paid_at },
  })
  if (txn.status === 'success') return res.json(shape(txn, 'success'))

  let result
  try { result = await verifyPayment(txn.provider, reference) } catch (e) {
    console.error('[payments] verify failed:', e.message)
    return res.json(shape(txn, 'pending'))
  }
  const out = await applyGatewayResult(txn, result, 'verify')
  const fresh = await Transaction.findById(txn.id)
  res.json(shape(fresh, out.status))
}))

// PUBLIC — gateway webhook (authoritative). Signature-verified, idempotent.
// Squad: https://<site>/api/payments/webhook?provider=squad
router.post('/webhook', safe(async (req, res) => {
  const provider = req.query.provider === 'paystack' ? 'paystack' : 'squad'
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}))
  if (!verifyWebhookSignature(provider, raw, req.headers, req.body)) return res.status(401).json({ error: 'bad signature' })

  const ev = parseWebhook(provider, req.body)
  if (!ev.reference || ev.status === 'ignored') return res.json({ ok: true, ignored: true })
  const txn = await Transaction.findOne({ reference: String(ev.reference) })
  if (!txn) return res.json({ ok: true, unknown: true }) // not ours (e.g. another integration); ack so it is not retried
  if (txn.provider !== provider) return res.json({ ok: true, ignored: true })
  const out = await applyGatewayResult(txn, {
    status: ev.status, amountKobo: ev.amountKobo, currency: ev.currency, channel: ev.channel,
    gatewayResponse: `webhook: ${ev.status}`,
  }, 'webhook')
  res.json({ ok: true, status: out.status })
}))

// ADMIN — list transactions
router.get('/transactions', requireAuth, canAccess('transactions'), safe(async (req, res) => {
  const q = {}
  if (req.query.status) q.status = String(req.query.status)
  if (req.query.provider) q.provider = String(req.query.provider)
  if (req.query.search) q.customer_email = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const rows = await Transaction.find(q).sort({ created_at: -1 }).limit(1000)
  res.json(rows)
}))

// ADMIN — re-check a pending transaction with the gateway.
router.post('/transactions/:id/recheck', requireAuth, canWrite('transactions'), safe(async (req, res) => {
  const txn = await Transaction.findById(req.params.id)
  if (!txn) return res.status(404).json({ error: 'Not found' })
  if (txn.status === 'success') return res.json({ status: 'success', transaction: txn })
  const out = await applyGatewayResult(txn, await verifyPayment(txn.provider, txn.reference), 'verify')
  res.json({ status: out.status, reason: out.reason, transaction: await Transaction.findById(txn.id) })
}))

export default router
