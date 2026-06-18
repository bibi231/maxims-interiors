// server/src/routes/gallery.js
import { Router } from 'express'
import { Gallery } from '../models.js'
import { requireAuth, canWrite, requireOwner, attachUser } from '../middleware/auth.js'
import { logActivity } from '../utils/activity.js'

const router = Router()

router.get('/', attachUser, async (req, res) => {
  const q = {}
  if (!req.user) q.is_published = true
  else if (req.query.published !== undefined) q.is_published = req.query.published === 'true'
  if (req.query.category && req.query.category !== 'all') q.category = req.query.category
  if (req.query.featured === 'true') q.is_featured = true
  const rows = await Gallery.find(q).sort({ sort_order: 1, created_at: -1 })
  res.json(rows)
})

router.post('/', requireAuth, canWrite('gallery'), async (req, res) => {
  const g = await Gallery.create(req.body)
  await logActivity({ userId: req.user.id, action: 'created', resourceType: 'gallery_project', resourceId: g.id, description: `Created project "${g.title}"` })
  res.status(201).json(g)
})

router.put('/:id', requireAuth, canWrite('gallery'), async (req, res) => {
  const g = await Gallery.findByIdAndUpdate(req.params.id, req.body, { new: true })
  if (!g) return res.status(404).json({ error: 'Not found' })
  await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'gallery_project', resourceId: g.id, description: `Updated project "${g.title}"` })
  res.json(g)
})

router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  await Gallery.findByIdAndDelete(req.params.id)
  await logActivity({ userId: req.user.id, action: 'deleted', resourceType: 'gallery_project', resourceId: req.params.id, description: 'Deleted a project' })
  res.json({ ok: true })
})

export default router
