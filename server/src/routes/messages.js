// server/src/routes/messages.js
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { Message } from '../models.js'
import { requireAuth, canAccess, canWrite } from '../middleware/auth.js'
import { logActivity } from '../utils/activity.js'
import { sendMail } from '../utils/mailer.js'
import { emailShell } from '../utils/templates.js'

const router = Router()
const submitLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 })

// PUBLIC — submit contact form (+ staff notification + auto-reply)
router.post('/', submitLimiter, async (req, res) => {
  const b = req.body || {}
  if (!b.full_name || !b.email || !b.message) return res.status(400).json({ error: 'Name, email and message required' })
  const msg = await Message.create(b)

  await sendMail({
    to: process.env.NOTIFICATION_EMAIL || process.env.MAIL_FROM,
    replyTo: msg.email,
    subject: `New Enquiry from ${msg.full_name} — Maxims Interiors`,
    html: emailShell({ heading: 'New Enquiry Received', body: `<p><strong>${msg.full_name}</strong> sent a message:</p><p style="background:#FAF7F2;padding:14px;border-left:3px solid #C9A84C;">${msg.message}</p><p style="font-size:13px;color:#6b6880;">${msg.email} · ${msg.phone || ''}${msg.service ? ` · ${msg.service}` : ''}</p>`, ctaLabel: 'Open Admin', ctaUrl: `${process.env.APP_URL || ''}/admin/messages` }),
  })
  await sendMail({
    to: msg.email,
    subject: 'Thank you for reaching out — Maxims Interiors',
    html: emailShell({ heading: `Thank you, ${String(msg.full_name).split(' ')[0]}`, body: `<p>We've received your message and will be in touch within 24 hours.</p>`, ctaLabel: 'View Our Portfolio', ctaUrl: `${process.env.APP_URL || ''}/gallery` }),
  })
  res.status(201).json({ ok: true })
})

// ADMIN — list
router.get('/', requireAuth, canAccess('messages'), async (req, res) => {
  const q = {}
  if (req.query.status) q.status = req.query.status
  const rows = await Message.find(q).sort({ created_at: -1 }).populate('replied_by', 'full_name')
  res.json(rows)
})

// ADMIN — mark read
router.patch('/:id/read', requireAuth, canAccess('messages'), async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, { status: 'read' })
  res.json({ ok: true })
})

// ADMIN — reply (sends email) or archive
router.patch('/:id', requireAuth, canWrite('messages'), async (req, res) => {
  const msg = await Message.findById(req.params.id)
  if (!msg) return res.status(404).json({ error: 'Not found' })

  if (req.body.reply_text) {
    msg.reply_text = req.body.reply_text
    msg.status = 'replied'
    msg.replied_by = req.user.id
    msg.replied_at = new Date()
    await msg.save()
    await sendMail({
      to: msg.email,
      subject: 'Re: Your enquiry — Maxims Interiors',
      html: emailShell({ heading: 'A Note from Maxims', body: `<p>Dear ${String(msg.full_name).split(' ')[0]},</p><p>${req.body.reply_text.replace(/\n/g, '<br>')}</p>` }),
    })
    await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'contact_message', resourceId: msg.id, description: `Replied to ${msg.full_name}` })
  } else if (req.body.status) {
    msg.status = req.body.status
    await msg.save()
  }
  res.json(msg)
})

export default router
