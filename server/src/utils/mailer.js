// server/src/utils/mailer.js
// All email goes through the site's own mail server over SMTP
// (mail.maximsinterior.com.ng on the DirectAdmin host). No third-party email
// API is used. EMAIL_PROVIDER=smtp is the only supported value; anything else
// is logged and SMTP is used anyway.
import nodemailer from 'nodemailer'

let _transport
let _warned = false

function smtpTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.maximsinterior.com.ng',
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    })
  }
  return _transport
}

const fromAddress = () => process.env.MAIL_FROM || 'Maxims Interiors <info@maximsinterior.com.ng>'

/**
 * Sends one email. Never throws.
 * Resolves { ok: true } or { ok: false, error } so callers that need to tell
 * a person the email failed (staff invites, test email) can do so.
 */
export async function sendMailResult({ to, subject, html, cc, replyTo }) {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase()
  if (provider !== 'smtp' && !_warned) {
    _warned = true
    console.warn(`[mailer] EMAIL_PROVIDER="${provider}" is not supported; sending through SMTP (${process.env.SMTP_HOST || 'mail.maximsinterior.com.ng'}).`)
  }
  try {
    await smtpTransport().sendMail({ from: fromAddress(), to, cc, replyTo, subject, html })
    return { ok: true }
  } catch (err) {
    console.error('[mailer] send failed:', err.message)
    return { ok: false, error: err.code ? `${err.code}: ${err.message}` : err.message }
  }
}

/** Fire-and-forget style helper used by most routes. Resolves true/false. */
export async function sendMail(opts) {
  return (await sendMailResult(opts)).ok
}

/** Checks the SMTP connection and login without sending anything. */
export async function verifySmtp() {
  try {
    await smtpTransport().verify()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.code ? `${err.code}: ${err.message}` : err.message }
  }
}
