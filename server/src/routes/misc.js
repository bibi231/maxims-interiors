// server/src/routes/misc.js
// Activity log, profiles (staff), dashboard + payment stats, uploads.
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { Activity, User, Order, BulkRequest, Appointment, Message, Product, Transaction } from '../models.js'
import { requireAuth, canAccess, requireOwner, ROLE_PERMISSIONS } from '../middleware/auth.js'
import { upload, persistFile } from '../middleware/upload.js'
import { logActivity } from '../utils/activity.js'

const router = Router()

// ── ACTIVITY LOG (read-only) ──
router.get('/activity', requireAuth, canAccess('activity'), async (req, res) => {
  const rows = await Activity.find().sort({ created_at: -1 }).limit(Number(req.query.limit || 100)).populate('user_id', 'full_name role avatar_url')
  // shape to match frontend: profile field
  res.json(rows.map((r) => ({ ...r.toJSON(), profile: r.user_id })))
})

// ── PROFILES (staff management) ──
router.get('/profiles', requireAuth, async (_req, res) => {
  const rows = await User.find().sort({ created_at: 1 })
  res.json(rows)
})
router.patch('/profiles/:id/role', requireAuth, requireOwner, async (req, res) => {
  const u = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true })
  res.json(u)
})
router.patch('/profiles/:id', requireAuth, requireOwner, async (req, res) => {
  const updates = (({ full_name, title, phone, is_active }) => ({ full_name, title, phone, is_active }))(req.body)
  if (req.body.password) updates.password_hash = await bcrypt.hash(req.body.password, 12)
  const u = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
  res.json(u)
})

// ── DASHBOARD STATS ──
router.get('/stats/dashboard', requireAuth, canAccess('dashboard'), async (_req, res) => {
  const [orders, bulk, appts, messages, products] = await Promise.all([
    Order.find({}, 'status total created_at'),
    BulkRequest.find({}, 'status created_at'),
    Appointment.find({}, 'status preferred_date created_at'),
    Message.find({}, 'status created_at'),
    Product.find({}, 'status stock_qty'),
  ])
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = now.toDateString()
  res.json({
    orders: {
      total: orders.length,
      thisMonth: orders.filter((o) => o.created_at >= monthStart).length,
      pending: orders.filter((o) => o.status === 'pending').length,
      revenue: orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0),
    },
    bulk: { total: bulk.length, new: bulk.filter((b) => b.status === 'new').length, thisMonth: bulk.filter((b) => b.created_at >= monthStart).length },
    appointments: { total: appts.length, pending: appts.filter((a) => a.status === 'pending').length, today: appts.filter((a) => new Date(a.preferred_date).toDateString() === today).length },
    messages: { total: messages.length, unread: messages.filter((m) => m.status === 'unread').length },
    products: { total: products.length, active: products.filter((p) => p.status === 'active').length, lowStock: products.filter((p) => p.stock_qty <= 3 && p.status === 'active').length },
  })
})

// ── PAYMENT STATS ──
router.get('/stats/payments', requireAuth, canAccess('transactions'), async (_req, res) => {
  const rows = await Transaction.find({}, 'amount status provider created_at')
  const paid = rows.filter((r) => r.status === 'success')
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  res.json({
    count: rows.length,
    paidCount: paid.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    failed: rows.filter((r) => r.status === 'failed').length,
    revenue: paid.reduce((s, r) => s + Number(r.amount || 0), 0),
    revenueThisMonth: paid.filter((r) => r.created_at >= monthStart).reduce((s, r) => s + Number(r.amount || 0), 0),
  })
})

// ── UPLOADS (any authenticated staff) ──
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  const folder = (req.query.folder || req.body.folder || 'misc').toString().replace(/[^a-z0-9_-]/gi, '')
  try {
    const url = await persistFile(req.file, folder)
    await logActivity({ userId: req.user.id, action: 'created', resourceType: 'upload', description: `Uploaded ${req.file.originalname}` })
    res.status(201).json({ url, path: url })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
