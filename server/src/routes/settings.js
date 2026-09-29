// server/src/routes/settings.js
import { Router } from 'express'
import { Setting } from '../models.js'
import { requireAuth, requireOwner } from '../middleware/auth.js'
import { sendMailResult, verifySmtp } from '../utils/mailer.js'
import { emailShell } from '../utils/templates.js'
import { withDefaults, cleanContact, cleanPricing } from '../utils/siteSettings.js'
import { logActivity } from '../utils/activity.js'

const router = Router()

// PUBLIC — read all settings as a { key: value } map (used by Footer/Contact).
router.get('/', async (_req, res) => {
  const rows = await Setting.find()
  const map = {}
  rows.forEach((r) => { map[r.key] = r.value })
  // Fill never-saved keys/fields (address, pricing) from the defaults.
  map.contact_info = withDefaults('contact_info', map.contact_info)
  map.pricing = withDefaults('pricing', map.pricing)
  res.json(map)
})

// OWNER — send a test email to yourself through the site's SMTP server and
// report the exact error if it fails (Settings > Email in the admin).
router.post('/test-email', requireAuth, requireOwner, async (req, res) => {
  const check = await verifySmtp()
  if (!check.ok) return res.status(502).json({ ok: false, error: `Could not sign in to the mail server: ${check.error}` })
  const r = await sendMailResult({
    to: req.user.email,
    subject: 'Maxims admin: test email',
    html: emailShell({ heading: 'Email is working', body: '<p>This test was sent from the Maxims admin through the Maxims mail server (SMTP).</p>' }),
  })
  if (!r.ok) return res.status(502).json({ ok: false, error: r.error })
  res.json({ ok: true, to: req.user.email, host: process.env.SMTP_HOST || 'mail.maximsinterior.com.ng' })
})

// OWNER — upsert one setting.
const CLEANERS = { contact_info: cleanContact, pricing: cleanPricing }

router.put('/:key', requireAuth, requireOwner, async (req, res) => {
  const key = String(req.params.key)
  if (!/^[a-z0-9_]{1,64}$/i.test(key)) return res.status(400).json({ error: 'Invalid setting name' })
  const value = CLEANERS[key] ? CLEANERS[key](req.body?.value || {}) : req.body?.value
  const row = await Setting.findOneAndUpdate(
    { key },
    { value },
    { new: true, upsert: true },
  )
  await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'settings', resourceId: key, description: `Updated site setting "${key}"` })
  res.json(row)
})

export default router
