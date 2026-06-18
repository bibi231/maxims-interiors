// supabase/functions/send-bulk-quote/index.ts
// DB Webhook: bulk_requests UPDATE. Emails the client when status → quoted.
// Deploy: supabase functions deploy send-bulk-quote --no-verify-jwt
import { handleOptions, json } from '../_shared/cors.ts'
import { sendMail } from '../_shared/mailer.ts'
import { emailShell, naira } from '../_shared/templates.ts'

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre
  try {
    const { record, old_record } = await req.json()
    if (record?.status !== 'quoted' || old_record?.status === 'quoted') {
      return json({ ok: true, note: 'no transition' })
    }

    const cc = Deno.env.get('NOTIFICATION_EMAIL') ?? undefined

    await sendMail({
      to: record.email,
      cc,
      subject: 'Your Custom Quote — Maxims Interiors',
      html: emailShell({
        heading: 'Your Custom Quote is Ready',
        preheader: `Quote for ${record.company_name}`,
        body: `<p>Dear ${String(record.contact_name).split(' ')[0]},</p>
          <p>Thank you for your interest in working with Maxims Interiors. Based on your requirements, we're pleased to share your quote:</p>
          <p style="background:#FAF7F2;padding:16px;border-left:3px solid #C9A84C;font-size:20px;color:#1C0D35;">
            <strong>${record.quote_amount ? naira(record.quote_amount) : 'See details below'}</strong>
          </p>
          ${record.quote_notes ? `<p>${record.quote_notes}</p>` : ''}
          <p>This quote covers ${record.product_category ?? 'your requested items'} for ${record.project_type ?? 'your project'}. To proceed or discuss, simply reply to this email.</p>`,
        ctaLabel: 'Contact Our Team', ctaUrl: `${Deno.env.get('APP_URL') ?? ''}/contact`,
      }),
    })
    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
