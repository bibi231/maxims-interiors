// server/src/routes/newsletter.js
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { Newsletter } from '../models.js'
import { requireAuth, canAccess, canWrite } from '../middleware/auth.js'
import { sendMail } from '../utils/mailer.js'
import { emailShell } from '../utils/templates.js'

const router = Router()
const subLimiter = rateLimit({ windowMs: 60 * 1000, max: 8 })

// PUBLIC — subscribe (idempotent + welcome email)
router.post('/', subLimiter, async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email required' })
  const existing = await Newsletter.findOne({ email })
  if (existing) return res.json({ ok: true, already: true })

  const sub = await Newsletter.create({ email, source: req.body.source || 'website' })
  await sendMail({
    to: email,
    subject: 'Welcome to Maxims Interiors',
    html: emailShell({ heading: 'Welcome to the List', body: `<p>Thank you for subscribing. You'll be first to know about new collections, design inspiration, and private previews.</p>`, ctaLabel: 'Explore the Collection', ctaUrl: `${process.env.APP_URL || ''}/shop` }),
  })
  sub.welcomed_at = new Date(); await sub.save()
  res.status(201).json({ ok: true })
})

// ADMIN — list
router.get('/', requireAuth, canAccess('newsletter'), async (req, res) => {
  const q = {}
  if (req.query.status) q.status = req.query.status
  const rows = await Newsletter.find(q).sort({ created_at: -1 })
  res.json(rows)
})

// ADMIN — update status
router.patch('/:id', requireAuth, canWrite('newsletter'), async (req, res) => {
  const row = await Newsletter.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
  res.json(row)
})

export default router
