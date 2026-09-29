// server/src/routes/messages.js
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { Message } from '../models.js'
import { requireAuth, canAccess, canWrite } from '../middleware/auth.js'
import { logActivity } from '../utils/activity.js'
import { sendMail } from '../utils/mailer.js'
import { emailShell, esc, detailsTable, refBlock } from '../utils/templates.js'
import { notifyStaff, appUrl } from '../utils/notify.js'
import { forwardLead } from '../utils/supportai.js'

const router = Router()
const submitLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 })

// PUBLIC — submit contact form (+ staff notification + auto-reply)
router.post('/', submitLimiter, async (req, res) => {
  const b = req.body || {}
  if (!b.full_name || !b.email || !b.message) return res.status(400).json({ error: 'Name, email and message required' })
  const msg = await Message.create({
    full_name: String(b.full_name).slice(0, 120), email: String(b.email).slice(0, 160),
    phone: b.phone ? String(b.phone).slice(0, 40) : undefined, service: b.service ? String(b.service).slice(0, 160) : undefined,
    message: String(b.message).slice(0, 5000),
  })
  const ref = 'MC-' + String(msg.id).slice(-6).toUpperCase()
  res.status(201).json({ ok: true, reference: ref })

  notifyStaff({
    subject: `New enquiry ${ref} from ${msg.full_name}`,
    heading: 'New Website Enquiry',
    replyTo: msg.email,
    adminPath: '/admin/messages',
    body: `<p>A new message came in through the contact form.</p>${detailsTable([['Reference', ref], ['Name', msg.full_name], ['Email', msg.email], ['Phone', msg.phone], ['Service', msg.service]])}<p style="background:#FAF7F2;padding:14px;border-left:3px solid #C9A84C;">${esc(msg.message).replace(/\n/g, '<br>')}</p>`,
  })
  sendMail({
    to: msg.email,
    subject: `We received your message (${ref}) - Maxims Interiors`,
    html: emailShell({
      heading: `Thank you, ${esc(String(msg.full_name).split(' ')[0])}`,
      body: `<p>We have received your message and a member of our team will be in touch within 24 hours.</p>${refBlock('Your reference number', ref)}<p>If anything is urgent, just reply to this email.</p>`,
      ctaLabel: 'View Our Portfolio', ctaUrl: `${appUrl()}/gallery`,
    }),
  })
  forwardLead({ kind: 'contact', reference: ref, name: msg.full_name, email: msg.email, phone: msg.phone, message: [msg.service, msg.message].filter(Boolean).join(' | ') })
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
