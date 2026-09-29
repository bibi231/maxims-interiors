// server/src/utils/notify.js
// Staff notifications for every new order / quote / contact / lead.
// Recipients come from BUSINESS_NOTIFY_EMAILS (comma-separated), falling back
// to NOTIFICATION_EMAIL, then the business mailboxes on the DirectAdmin mail.
import { sendMail } from './mailer.js'
import { emailShell } from './templates.js'

const DEFAULT_RECIPIENTS = [
  'info@maximsinterior.com.ng',
  'support@maximsinterior.com.ng',
  'christinegadzama@maximsinterior.com.ng',
]

export function staffRecipients() {
  const raw = process.env.BUSINESS_NOTIFY_EMAILS || process.env.NOTIFICATION_EMAIL || ''
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return list.length ? [...new Set(list)] : DEFAULT_RECIPIENTS
}

export const appUrl = () => (process.env.APP_URL || 'https://maximsinterior.com.ng').replace(/\/$/, '')

/** Send one staff alert (never throws; mailer swallows + logs errors). */
export function notifyStaff({ subject, heading, body, replyTo, adminPath = '/admin' }) {
  return sendMail({
    to: staffRecipients(),
    replyTo,
    subject,
    html: emailShell({ heading, body, preheader: subject, ctaLabel: 'Open in Admin', ctaUrl: `${appUrl()}${adminPath}` }),
  })
}
