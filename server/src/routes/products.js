// server/src/routes/products.js
import { Router } from 'express'
import { Product } from '../models.js'
import { requireAuth, canWrite, requireOwner, attachUser } from '../middleware/auth.js'
import { logActivity } from '../utils/activity.js'

const router = Router()

// LIST — public sees active only; staff (token) sees all.
router.get('/', attachUser, async (req, res) => {
  const q = {}
  if (!req.user) q.status = 'active'
  else if (req.query.status) q.status = req.query.status
  if (req.query.category && req.query.category !== 'all') q.category = req.query.category
  if (req.query.featured === 'true') q.is_featured = true
  const rows = await Product.find(q).sort({ sort_order: 1, created_at: -1 })
  res.json(rows)
})

router.get('/:slug', async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug })
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json(p)
})

router.post('/', requireAuth, canWrite('products'), async (req, res) => {
  const p = await Product.create(req.body)
  await logActivity({ userId: req.user.id, action: 'created', resourceType: 'product', resourceId: p.id, description: `Created product "${p.name}"` })
  res.status(201).json(p)
})

router.put('/:id', requireAuth, canWrite('products'), async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!p) return res.status(404).json({ error: 'Not found' })
  await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'product', resourceId: p.id, description: `Updated product "${p.name}"` })
  res.json(p)
})

router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id)
  await logActivity({ userId: req.user.id, action: 'deleted', resourceType: 'product', resourceId: req.params.id, description: 'Deleted a product' })
  res.json({ ok: true })
})

export default router
