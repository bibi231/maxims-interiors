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

  // 1) Welcome the subscriber
  await sendMail({
    to: email,
    subject: 'Welcome to Maxims Interiors',
    html: emailShell({ heading: 'Welcome to the List', body: `<p>Thank you for subscribing. You'll be first to know about new collections, design inspiration, and private previews.</p>`, ctaLabel: 'Explore the Collection', ctaUrl: `${process.env.APP_URL || ''}/shop` }),
  })

  // 2) Alert the Maxims team (their Gmail) so they see every signup
  if (process.env.NOTIFICATION_EMAIL) {
    await sendMail({
      to: process.env.NOTIFICATION_EMAIL,
      subject: 'New newsletter subscriber — Maxims Interiors',
      html: emailShell({ heading: 'New Subscriber', body: `<p><strong>${email}</strong> just joined your newsletter (source: ${sub.source}).</p><p>See all subscribers in your admin dashboard under Newsletter.</p>`, ctaLabel: 'Open Admin', ctaUrl: `${process.env.APP_URL || ''}/admin/newsletter` }),
    })
  }

  // 3) Mirror to TrueWeb so it also shows in Bitrus's TrueWeb admin (fire-and-forget)
  if (process.env.TRUEWEB_NEWSLETTER_URL) {
    fetch(process.env.TRUEWEB_NEWSLETTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'maxims-interior' }),
    }).catch(() => { /* never block the signup on mirror failure */ })
  }

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
