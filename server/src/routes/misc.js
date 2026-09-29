// server/src/routes/misc.js
// Activity log, profiles (staff), dashboard + payment stats, uploads.
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { Activity, User, Order, BulkRequest, Appointment, Message, Product, Transaction } from '../models.js'
import { requireAuth, canAccess, requireOwner, ROLE_PERMISSIONS } from '../middleware/auth.js'
import { upload, persistFile } from '../middleware/upload.js'
import { logActivity } from '../utils/activity.js'
import { sendSetupEmail } from '../utils/staffInvite.js'

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
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role.' })
  if (!ROLE_PERMISSIONS[req.body.role]) return res.status(400).json({ error: 'Unknown role.' })
  const u = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true })
  if (!u) return res.status(404).json({ error: 'Team member not found' })
  await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'profile', resourceId: u.id, description: `Changed ${u.full_name}'s role to ${u.role}` })
  res.json(u)
})
router.patch('/profiles/:id', requireAuth, requireOwner, async (req, res) => {
  if (req.params.id === req.user.id && req.body.is_active === false) return res.status(400).json({ error: 'You cannot deactivate your own account.' })
  const updates = (({ full_name, title, phone, is_active }) => ({ full_name, title, phone, is_active }))(req.body)
  if (req.body.password) {
    if (String(req.body.password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    updates.password_hash = await bcrypt.hash(req.body.password, 12); updates.$inc = { password_version: 1 }; updates.invite_pending = false
  }
  const u = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
  if (!u) return res.status(404).json({ error: 'Team member not found' })
  if (req.body.is_active !== undefined) {
    await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'profile', resourceId: u.id, description: `${u.is_active ? 'Reactivated' : 'Deactivated'} ${u.full_name}` })
  }
  res.json(u)
})

// Owner: send a fresh set-up link. Invalidates earlier links (password_version
// bump) and returns the new link so it can be copied if the email fails.
router.post('/profiles/:id/resend-invite', requireAuth, requireOwner, async (req, res) => {
  const u = await User.findById(req.params.id)
  if (!u) return res.status(404).json({ error: 'Team member not found' })
  if (!u.is_active) return res.status(400).json({ error: 'Reactivate this account before sending a new link.' })
  if (!u.invite_pending) return res.status(400).json({ error: 'This person has already set a password. They can use "Forgot your password?" on the sign-in page.' })
  u.password_version = (u.password_version || 0) + 1
  u.invited_at = new Date()
  await u.save()
  const mail = await sendSetupEmail(u, { invitedBy: req.user.full_name })
  await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'profile', resourceId: u.id, description: `Re-sent invite to ${u.full_name}${mail.ok ? '' : ' - email failed'}` })
  res.json({ user: u, invite_sent: mail.ok, email_error: mail.ok ? undefined : mail.error, setup_url: mail.url })
})

// Owner: remove a team member. A pending invite (never used) is deleted
// outright; an account that has been used is deactivated so its history
// (activity log, assignments) stays intact. Deactivated users cannot sign in
// and their existing sessions stop working.
router.delete('/profiles/:id', requireAuth, requireOwner, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot remove your own account.' })
  const u = await User.findById(req.params.id)
  if (!u) return res.status(404).json({ error: 'Team member not found' })
  if (u.role === 'owner') return res.status(400).json({ error: "Change this person's role before removing them." })
  if (u.invite_pending && !u.last_seen) {
    await u.deleteOne()
    await logActivity({ userId: req.user.id, action: 'deleted', resourceType: 'profile', resourceId: u.id, description: `Cancelled the invite for ${u.full_name}` })
    return res.json({ ok: true, deleted: true })
  }
  u.is_active = false
  await u.save()
  await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'profile', resourceId: u.id, description: `Deactivated ${u.full_name}` })
  res.json({ ok: true, deleted: false, user: u })
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
      pending: orders.filter((o) => ['new', 'pending'].includes(o.status)).length,
      revenue: orders.filter((o) => ['paid', 'confirmed', 'delivered', 'shipped'].includes(o.status)).reduce((s, o) => s + Number(o.total || 0), 0),
    },
    bulk: { total: bulk.length, new: bulk.filter((b) => b.status === 'new').length, thisMonth: bulk.filter((b) => b.created_at >= monthStart).length },
    appointments: { total: appts.length, pending: appts.filter((a) => a.status === 'pending').length, today: appts.filter((a) => new Date(a.preferred_date).toDateString() === today).length },
    messages: { total: messages.length, unread: messages.filter((m) => m.status === 'unread').length },
    products: { total: products.length, active: products.filter((p) => p.status === 'active').length, lowStock: products.filter((p) => p.stock_qty <= 3 && p.status === 'active').length },
  })
})

// ── NOTIFICATION COUNTS (admin bell, polled) ──
// Only counts sections the signed-in role can see.
router.get('/stats/notifications', requireAuth, async (req, res) => {
  const perms = ROLE_PERMISSIONS[req.user.role]?.access || []
  const has = (s) => perms.includes(s)
  const [orders, quotes, appointments, messages, bulk] = await Promise.all([
    has('orders') ? Order.countDocuments({ status: { $in: ['new', 'pending'] }, kind: { $ne: 'quote' } }) : 0,
    has('orders') ? Order.countDocuments({ status: 'new', kind: 'quote' }) : 0,
    has('appointments') ? Appointment.countDocuments({ status: 'pending' }) : 0,
    has('messages') ? Message.countDocuments({ status: 'unread' }) : 0,
    has('bulk_requests') ? BulkRequest.countDocuments({ status: 'new' }) : 0,
  ])
  res.json({ orders: orders + quotes, newOrders: orders, quotes, appointments, messages, bulk, total: orders + quotes + appointments + messages + bulk })
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
