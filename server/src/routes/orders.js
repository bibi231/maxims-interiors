// server/src/routes/orders.js
import { Router } from 'express'
import { Order } from '../models.js'
import { requireAuth, canAccess, canWrite, requireOwner } from '../middleware/auth.js'
import { logActivity } from '../utils/activity.js'
import { sendMail } from '../utils/mailer.js'
import { emailShell, naira } from '../utils/templates.js'

const router = Router()

function orderNumber() {
  return 'MX-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10)
}

// PUBLIC — place an order from the storefront.
router.post('/', async (req, res) => {
  const body = req.body || {}
  if (!body.customer_name || !body.customer_email) return res.status(400).json({ error: 'Name and email required' })
  const order = await Order.create({ ...body, order_number: orderNumber() })

  // Receipt email (non-blocking inside mailer)
  const items = Array.isArray(order.items) ? order.items : []
  const rows = items.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">${i.name} × ${i.qty}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${naira(i.price * i.qty)}</td></tr>`).join('')
  await sendMail({
    to: order.customer_email,
    subject: `Order Received — ${order.order_number} — Maxims Interiors`,
    html: emailShell({
      heading: 'Thank You for Your Order',
      body: `<p>Dear ${String(order.customer_name).split(' ')[0]},</p><p>We've received your order <strong>${order.order_number}</strong>:</p>
        <table width="100%" style="font-size:14px;color:#3D3B50;">${rows}
        <tr><td style="padding:10px 0;font-weight:bold;">Total</td><td style="padding:10px 0;text-align:right;font-weight:bold;color:#1C0D35;">${naira(order.total)}</td></tr></table>
        <p>Our team will be in touch shortly to arrange delivery.</p>`,
      ctaLabel: 'Visit Our Shop', ctaUrl: `${process.env.APP_URL || ''}/shop`,
    }),
  })
  res.status(201).json(order)
})

// ADMIN — list
router.get('/', requireAuth, canAccess('orders'), async (req, res) => {
  const q = {}
  if (req.query.status) q.status = req.query.status
  if (req.query.search) q.customer_name = new RegExp(req.query.search, 'i')
  const rows = await Order.find(q).sort({ created_at: -1 }).populate('assigned_to', 'full_name avatar_url')
  res.json(rows)
})

// ADMIN — update (status / assignment)
router.patch('/:id', requireAuth, canWrite('orders'), async (req, res) => {
  const allowed = (({ status, assigned_to, payment_status, notes }) => ({ status, assigned_to, payment_status, notes }))(req.body)
  Object.keys(allowed).forEach((k) => allowed[k] === undefined && delete allowed[k])
  const o = await Order.findByIdAndUpdate(req.params.id, allowed, { new: true })
  if (!o) return res.status(404).json({ error: 'Not found' })
  await logActivity({ userId: req.user.id, action: 'status_changed', resourceType: 'order', resourceId: o.id, description: `Order ${o.order_number} → ${o.status}` })
  res.json(o)
})

router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  await Order.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default router
