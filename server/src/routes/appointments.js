// server/src/routes/appointments.js
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { Appointment } from '../models.js'
import { requireAuth, canAccess, canWrite } from '../middleware/auth.js'
import { logActivity } from '../utils/activity.js'
import { sendMail } from '../utils/mailer.js'
import { emailShell } from '../utils/templates.js'

const router = Router()
const bookLimiter = rateLimit({ windowMs: 60 * 1000, max: 6 })

// PUBLIC — check slot availability
router.get('/availability', async (req, res) => {
  const { date, time } = req.query
  if (!date || !time) return res.status(400).json({ available: false })
  const taken = await Appointment.exists({ preferred_date: date, preferred_time: time, status: { $nin: ['cancelled', 'rescheduled'] } })
  res.json({ available: !taken })
})

// PUBLIC — book
router.post('/', bookLimiter, async (req, res) => {
  const b = req.body || {}
  if (!b.client_name || !b.client_email || !b.preferred_date || !b.preferred_time) return res.status(400).json({ error: 'Missing booking details' })
  const taken = await Appointment.exists({ preferred_date: b.preferred_date, preferred_time: b.preferred_time, status: { $nin: ['cancelled', 'rescheduled'] } })
  if (taken) return res.status(409).json({ error: 'That slot is no longer available' })
  const appt = await Appointment.create(b)
  await sendMail({
    to: process.env.NOTIFICATION_EMAIL || process.env.MAIL_FROM,
    subject: `New Consultation Request — ${appt.client_name}`,
    html: emailShell({ heading: 'New Consultation Request', body: `<p><strong>${appt.client_name}</strong> requested ${appt.preferred_date} at ${appt.preferred_time}.</p><p style="font-size:13px;color:#6b6880;">${appt.client_email} · ${appt.client_phone || ''}</p>` }),
  })
  res.status(201).json(appt)
})

// ADMIN — list
router.get('/', requireAuth, canAccess('appointments'), async (req, res) => {
  const q = {}
  if (req.query.status) q.status = req.query.status
  if (req.query.date) q.preferred_date = req.query.date
  const rows = await Appointment.find(q).sort({ preferred_date: 1, preferred_time: 1 }).populate('assigned_to', 'full_name avatar_url')
  res.json(rows)
})

// ADMIN — update status (fires confirmation email on → confirmed)
router.patch('/:id', requireAuth, canWrite('appointments'), async (req, res) => {
  const appt = await Appointment.findById(req.params.id)
  if (!appt) return res.status(404).json({ error: 'Not found' })
  const wasConfirmed = appt.status === 'confirmed'
  Object.assign(appt, req.body)
  if (req.body.status === 'confirmed') appt.confirmed_at = new Date()
  await appt.save()
  await logActivity({ userId: req.user.id, action: 'status_changed', resourceType: 'appointment', resourceId: appt.id, description: `Appointment for ${appt.client_name} → ${appt.status}` })

  if (appt.status === 'confirmed' && !wasConfirmed) {
    await sendMail({
      to: appt.client_email,
      subject: 'Your Consultation is Confirmed — Maxims Interiors',
      html: emailShell({
        heading: 'Your Consultation is Confirmed',
        body: `<p>Dear ${String(appt.client_name).split(' ')[0]},</p><p>We're delighted to confirm your consultation.</p>
          <p style="background:#FAF7F2;padding:14px;border-left:3px solid #C9A84C;"><strong>Date:</strong> ${appt.preferred_date}<br><strong>Time:</strong> ${appt.preferred_time}<br><strong>Location:</strong> ${appt.location || 'Our Showroom, Wuse 2, Abuja'}${appt.meeting_link ? `<br><strong>Link:</strong> ${appt.meeting_link}` : ''}</p>
          <p>We look forward to seeing you. To reschedule, just reply to this email.</p>`,
      }),
    })
  }
  res.json(appt)
})

export default router
