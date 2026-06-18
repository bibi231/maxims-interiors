// server/src/routes/testimonials.js
import { Router } from 'express'
import { Testimonial } from '../models.js'
import { requireAuth, canWrite, requireOwner, attachUser } from '../middleware/auth.js'
import { logActivity } from '../utils/activity.js'

const router = Router()

router.get('/', attachUser, async (req, res) => {
  const q = {}
  if (!req.user) q.is_published = true
  else if (req.query.published !== undefined) q.is_published = req.query.published === 'true'
  if (req.query.featured === 'true') q.is_featured = true
  const rows = await Testimonial.find(q).sort({ sort_order: 1, created_at: -1 })
  res.json(rows)
})

router.post('/', requireAuth, canWrite('testimonials'), async (req, res) => {
  const t = await Testimonial.create(req.body)
  await logActivity({ userId: req.user.id, action: 'created', resourceType: 'testimonial', resourceId: t.id, description: `Created testimonial from ${t.client_name}` })
  res.status(201).json(t)
})

router.put('/:id', requireAuth, canWrite('testimonials'), async (req, res) => {
  const t = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true })
  if (!t) return res.status(404).json({ error: 'Not found' })
  await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'testimonial', resourceId: t.id, description: `Updated testimonial from ${t.client_name}` })
  res.json(t)
})

router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  await Testimonial.findByIdAndDelete(req.params.id)
  await logActivity({ userId: req.user.id, action: 'deleted', resourceType: 'testimonial', resourceId: req.params.id, description: 'Deleted a testimonial' })
  res.json({ ok: true })
})

export default router
