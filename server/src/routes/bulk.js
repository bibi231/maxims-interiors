// server/src/routes/bulk.js
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { BulkRequest } from '../models.js'
import { requireAuth, canAccess, canWrite } from '../middleware/auth.js'
import { logActivity } from '../utils/activity.js'
import { sendMail } from '../utils/mailer.js'
import { emailShell, naira, esc, detailsTable } from '../utils/templates.js'
import { notifyStaff } from '../utils/notify.js'
import { forwardLead } from '../utils/supportai.js'

const router = Router()
const submitLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 })

// PUBLIC — submit a bulk/trade request.
router.post('/', submitLimiter, async (req, res) => {
  const b = req.body || {}
  if (!b.company_name || !b.contact_name || !b.email) return res.status(400).json({ error: 'Company, name and email required' })
  const pick = ['company_name', 'contact_name', 'email', 'phone', 'project_type', 'product_category', 'quantity', 'budget_range', 'message']
  const row = await BulkRequest.create(Object.fromEntries(pick.filter((k) => b[k] !== undefined).map((k) => [k, String(b[k]).slice(0, 3000)])))
  notifyStaff({
    subject: `New bulk request from ${row.company_name}`,
    heading: 'New Bulk / Trade Request',
    replyTo: row.email,
    adminPath: '/admin/bulk-requests',
    body: detailsTable([['Company', row.company_name], ['Contact', row.contact_name], ['Email', row.email], ['Phone', row.phone], ['Project type', row.project_type], ['Category', row.product_category], ['Quantity', row.quantity], ['Budget', row.budget_range], ['Message', row.message]]),
  })
  forwardLead({ kind: 'quote', name: row.contact_name, company: row.company_name, email: row.email, phone: row.phone, message: [row.project_type, row.quantity, row.budget_range, row.message].filter(Boolean).join(' | ') })
  res.status(201).json(row)
})

// ADMIN — list
router.get('/', requireAuth, canAccess('bulk_requests'), async (req, res) => {
  const q = {}
  if (req.query.status) q.status = req.query.status
  const rows = await BulkRequest.find(q).sort({ created_at: -1 }).populate('assigned_to', 'full_name')
  res.json(rows)
})

// ADMIN — update status / quote / notes (fires quote email on → quoted)
router.patch('/:id', requireAuth, canWrite('bulk_requests'), async (req, res) => {
  const existing = await BulkRequest.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const wasQuoted = existing.status === 'quoted'

  const { status, internal_notes, quote_amount, quote_notes, assigned_to } = req.body
  if (status !== undefined) existing.status = status
  if (internal_notes !== undefined) existing.internal_notes = internal_notes
  if (quote_amount !== undefined) existing.quote_amount = quote_amount
  if (quote_notes !== undefined) existing.quote_notes = quote_notes
  if (assigned_to !== undefined) existing.assigned_to = assigned_to || null
  await existing.save()

  await logActivity({ userId: req.user.id, action: 'status_changed', resourceType: 'bulk_request', resourceId: existing.id, description: `Bulk request from ${existing.company_name} → ${existing.status}` })

  // Send the quote email only on the transition into "quoted".
  if (existing.status === 'quoted' && !wasQuoted) {
    await sendMail({
      to: existing.email,
      cc: process.env.NOTIFICATION_EMAIL || undefined,
      subject: 'Your Custom Quote — Maxims Interiors',
      html: emailShell({
        heading: 'Your Custom Quote is Ready',
        body: `<p>Dear ${String(existing.contact_name).split(' ')[0]},</p>
          <p>Thank you for your interest in working with Maxims Interiors. Your quote:</p>
          <p style="background:#FAF7F2;padding:16px;border-left:3px solid #C9A84C;font-size:20px;color:#1C0D35;"><strong>${existing.quote_amount ? naira(existing.quote_amount) : 'See details below'}</strong></p>
          ${existing.quote_notes ? `<p>${existing.quote_notes}</p>` : ''}
          <p>To proceed or discuss, simply reply to this email.</p>`,
        ctaLabel: 'Contact Our Team', ctaUrl: `${process.env.APP_URL || ''}/contact`,
      }),
    })
  }
  res.json(existing)
})

export default router
