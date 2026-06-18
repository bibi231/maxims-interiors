// server/src/routes/payments.js
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { Transaction, Order } from '../models.js'
import { requireAuth, canAccess } from '../middleware/auth.js'
import { initPayment, verifyPayment, verifyWebhookSignature, generateReference } from '../utils/payments.js'

const router = Router()
const initLimiter = rateLimit({ windowMs: 60 * 1000, max: 15 })

// PUBLIC/ADMIN — initialise a payment, return a checkout URL.
router.post('/initialize', initLimiter, async (req, res) => {
  try {
    const { amount, email, name, phone, provider = process.env.PAYMENT_PROVIDER || 'squad', orderId, description, metadata } = req.body
    const amt = Number(amount)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email required' })
    if (!amt || amt <= 0 || amt > 100_000_000) return res.status(400).json({ error: 'Invalid amount' })
    if (!['squad', 'paystack'].includes(provider)) return res.status(400).json({ error: 'Unknown provider' })

    const reference = generateReference()
    await Transaction.create({
      reference, provider, order_id: orderId || undefined,
      customer_name: name, customer_email: email, customer_phone: phone,
      amount: amt, status: 'pending', description: description || '', metadata: metadata || {},
    })

    const { checkoutUrl } = await initPayment(provider, {
      amount: amt, email, name, reference,
      callbackUrl: `${process.env.APP_URL || ''}/payment/callback?reference=${reference}`,
      metadata: { ...(metadata || {}), description: description || '' },
    })
    res.json({ reference, checkout_url: checkoutUrl, provider })
  } catch (e) {
    res.status(500).json({ error: e.message || 'Initialization failed' })
  }
})

// PUBLIC — verify a reference (called from the callback page).
router.post('/verify', async (req, res) => {
  try {
    const { reference } = req.body
    if (!reference) return res.status(400).json({ error: 'reference required' })
    const txn = await Transaction.findOne({ reference })
    if (!txn) return res.status(404).json({ error: 'Transaction not found' })
    if (txn.status === 'success') return res.json({ status: 'success', transaction: txn })

    const result = await verifyPayment(txn.provider, reference)
    const amountOk = result.amount == null || Math.abs(result.amount - Number(txn.amount)) < 1
    const status = result.status === 'success' && amountOk ? 'success' : (result.status === 'pending' ? 'pending' : 'failed')
    txn.status = status
    txn.channel = result.channel || txn.channel
    txn.gateway_response = result.gatewayResponse || txn.gateway_response
    if (status === 'success') txn.paid_at = new Date()
    await txn.save()
    if (status === 'success' && txn.order_id) await Order.findByIdAndUpdate(txn.order_id, { payment_status: 'paid', payment_ref: reference })
    res.json({ status, transaction: txn })
  } catch (e) {
    res.status(500).json({ error: e.message || 'Verification failed' })
  }
})

// PUBLIC — gateway webhook (authoritative). Signature-verified.
router.post('/webhook', async (req, res) => {
  try {
    const provider = req.query.provider || 'squad'
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body)
    if (!verifyWebhookSignature(provider, raw, req.headers)) return res.status(401).json({ error: 'bad signature' })

    const event = req.body
    let reference = '', success = false
    if (provider === 'paystack') {
      reference = event?.data?.reference
      success = event?.event === 'charge.success' && event?.data?.status === 'success'
    } else {
      const d = event?.Body || event?.data || event
      reference = d?.transaction_ref || d?.transactionRef
      success = String(d?.transaction_status || '').toLowerCase() === 'success'
    }
    if (!reference) return res.json({ ok: true })

    const txn = await Transaction.findOne({ reference })
    if (txn && txn.status !== 'success') {
      txn.status = success ? 'success' : 'failed'
      if (success) txn.paid_at = new Date()
      await txn.save()
      if (success && txn.order_id) await Order.findByIdAndUpdate(txn.order_id, { payment_status: 'paid', payment_ref: reference })
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ADMIN — list transactions
router.get('/transactions', requireAuth, canAccess('transactions'), async (req, res) => {
  const q = {}
  if (req.query.status) q.status = req.query.status
  if (req.query.provider) q.provider = req.query.provider
  if (req.query.search) q.customer_email = new RegExp(req.query.search, 'i')
  const rows = await Transaction.find(q).sort({ created_at: -1 })
  res.json(rows)
})

export default router
