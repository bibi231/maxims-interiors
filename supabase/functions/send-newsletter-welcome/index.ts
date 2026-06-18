// supabase/functions/send-newsletter-welcome/index.ts
// DB Webhook: newsletter_subscribers INSERT. Sends a welcome email and
// stamps welcomed_at so we never double-send.
// Deploy: supabase functions deploy send-newsletter-welcome --no-verify-jwt
import { handleOptions, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/db.ts'
import { sendMail } from '../_shared/mailer.ts'
import { emailShell } from '../_shared/templates.ts'

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre
  try {
    const { record } = await req.json()
    if (!record?.email || record.welcomed_at) return json({ ok: true, note: 'skip' })

    await sendMail({
      to: record.email,
      subject: 'Welcome to Maxims Interiors',
      html: emailShell({
        heading: 'Welcome to the List',
        preheader: 'New collections, design notes & private previews.',
        body: `<p>Thank you for subscribing to Maxims Interiors &amp; Home Goods.</p>
          <p>You'll be the first to know about new collections, design inspiration, and private previews — curated for those who love refined living.</p>`,
        ctaLabel: 'Explore the Collection', ctaUrl: `${Deno.env.get('APP_URL') ?? ''}/shop`,
      }),
    })

    await adminClient().from('newsletter_subscribers')
      .update({ welcomed_at: new Date().toISOString() }).eq('id', record.id)

    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
