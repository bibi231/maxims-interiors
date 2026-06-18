// server/src/routes/settings.js
import { Router } from 'express'
import { Setting } from '../models.js'
import { requireAuth, requireOwner } from '../middleware/auth.js'

const router = Router()

// PUBLIC — read all settings as a { key: value } map (used by Footer/Contact).
router.get('/', async (_req, res) => {
  const rows = await Setting.find()
  const map = {}
  rows.forEach((r) => { map[r.key] = r.value })
  res.json(map)
})

// OWNER — upsert one setting.
router.put('/:key', requireAuth, requireOwner, async (req, res) => {
  const row = await Setting.findOneAndUpdate(
    { key: req.params.key },
    { value: req.body.value },
    { new: true, upsert: true },
  )
  res.json(row)
})

export default router
