// supabase/functions/send-contact-notification/index.ts
// DB Webhook: contact_messages INSERT.
// Notifies staff and auto-replies to the sender.
// Deploy: supabase functions deploy send-contact-notification --no-verify-jwt
import { handleOptions, json } from '../_shared/cors.ts'
import { sendMail } from '../_shared/mailer.ts'
import { emailShell } from '../_shared/templates.ts'

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre
  try {
    const { record } = await req.json()
    if (!record?.email) return json({ ok: true, note: 'no record' })

    const notify = Deno.env.get('NOTIFICATION_EMAIL') ?? 'hello@maximsinteriors.com'

    // 1) Staff notification
    await sendMail({
      to: notify,
      replyTo: record.email,
      subject: `New Enquiry from ${record.full_name} — Maxims Interiors`,
      html: emailShell({
        heading: 'New Enquiry Received',
        preheader: `From ${record.full_name}`,
        body: `<p><strong>${record.full_name}</strong> has sent a message via the website.</p>
          <p style="background:#FAF7F2;padding:14px;border-left:3px solid #C9A84C;">${record.message}</p>
          <p style="font-size:13px;color:#6b6880;">
            Email: ${record.email}<br>${record.phone ? `Phone: ${record.phone}<br>` : ''}${record.service ? `Service: ${record.service}` : ''}
          </p>`,
        ctaLabel: 'Open Admin', ctaUrl: `${Deno.env.get('APP_URL') ?? ''}/admin/messages`,
      }),
    })

    // 2) Auto-reply to the client
    await sendMail({
      to: record.email,
      subject: 'Thank you for reaching out — Maxims Interiors',
      html: emailShell({
        heading: `Thank you, ${String(record.full_name).split(' ')[0]}`,
        preheader: 'We have received your message.',
        body: `<p>Thank you for contacting Maxims Interiors &amp; Home Goods. We've received your message and a member of our team will be in touch within 24 hours.</p>
          <p>In the meantime, feel free to explore our latest work.</p>`,
        ctaLabel: 'View Our Portfolio', ctaUrl: `${Deno.env.get('APP_URL') ?? ''}/gallery`,
      }),
    })

    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
