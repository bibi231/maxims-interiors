// server/src/routes/team.js
import { Router } from 'express'
import { TeamMember } from '../models.js'
import { requireAuth, canWrite, requireOwner, attachUser } from '../middleware/auth.js'
import { logActivity } from '../utils/activity.js'

const router = Router()

router.get('/', attachUser, async (req, res) => {
  const q = {}
  if (!req.user || req.query.published === 'true') q.is_published = true
  const rows = await TeamMember.find(q).sort({ sort_order: 1 })
  res.json(rows)
})

router.post('/', requireAuth, canWrite('team'), async (req, res) => {
  const m = await TeamMember.create(req.body)
  await logActivity({ userId: req.user.id, action: 'created', resourceType: 'team_member', resourceId: m.id, description: `Added team member ${m.full_name}` })
  res.status(201).json(m)
})

router.put('/:id', requireAuth, canWrite('team'), async (req, res) => {
  const m = await TeamMember.findByIdAndUpdate(req.params.id, req.body, { new: true })
  if (!m) return res.status(404).json({ error: 'Not found' })
  await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'team_member', resourceId: m.id, description: `Updated team member ${m.full_name}` })
  res.json(m)
})

router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  await TeamMember.findByIdAndDelete(req.params.id)
  await logActivity({ userId: req.user.id, action: 'deleted', resourceType: 'team_member', resourceId: req.params.id, description: 'Removed a team member' })
  res.json({ ok: true })
})

export default router
