// supabase/functions/_shared/mailer.ts
// ============================================================
// One mailer, two backends — choose with EMAIL_PROVIDER:
//   'smtp'   → Whogohost (or any SMTP host) via denomailer
//   'resend' → Resend HTTP API
// Switch providers by changing one env var; no code changes.
// ============================================================
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const PROVIDER = Deno.env.get('EMAIL_PROVIDER') ?? 'smtp'
const FROM = Deno.env.get('MAIL_FROM') ?? 'Maxims Interiors <hello@maximsinteriors.com>'

export interface Mail {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  cc?: string | string[]
}

async function sendViaResend(mail: Mail) {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) throw new Error('RESEND_API_KEY not set')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(mail.to) ? mail.to : [mail.to],
      cc: mail.cc,
      reply_to: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
    }),
  })
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)
}

async function sendViaSmtp(mail: Mail) {
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get('SMTP_HOST')!,
      port: Number(Deno.env.get('SMTP_PORT') ?? '465'),
      tls: (Deno.env.get('SMTP_SECURE') ?? 'true') === 'true',
      auth: {
        username: Deno.env.get('SMTP_USER')!,
        password: Deno.env.get('SMTP_PASS')!,
      },
    },
  })
  await client.send({
    from: FROM,
    to: mail.to,
    cc: mail.cc,
    replyTo: mail.replyTo,
    subject: mail.subject,
    html: mail.html,
    content: 'This email requires an HTML-capable client.',
  })
  await client.close()
}

export async function sendMail(mail: Mail): Promise<void> {
  if (PROVIDER === 'resend') return sendViaResend(mail)
  return sendViaSmtp(mail)
}
