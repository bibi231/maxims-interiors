// server/src/utils/mailer.js
// One mailer, two backends (EMAIL_PROVIDER): 'smtp' (Whogohost) | 'resend'.
import nodemailer from 'nodemailer'

let _transport
function smtpTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return _transport
}

export async function sendMail({ to, subject, html, cc, replyTo }) {
  const from = process.env.MAIL_FROM || 'Maxims Interiors <hello@maximsinteriors.com>'
  try {
    if ((process.env.EMAIL_PROVIDER || 'smtp') === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], cc, reply_to: replyTo, subject, html }),
      })
      if (!res.ok) throw new Error(await res.text())
    } else {
      await smtpTransport().sendMail({ from, to, cc, replyTo, subject, html })
    }
  } catch (err) {
    // Email failures must never break the API request that triggered them.
    console.error('[mailer] send failed:', err.message)
  }
}
