// supabase/functions/send-appointment-confirmation/index.ts
// DB Webhook: appointments UPDATE. Emails the client when status → confirmed.
// Deploy: supabase functions deploy send-appointment-confirmation --no-verify-jwt
import { handleOptions, json } from '../_shared/cors.ts'
import { sendMail } from '../_shared/mailer.ts'
import { emailShell } from '../_shared/templates.ts'

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre
  try {
    const { record, old_record } = await req.json()
    // Only fire on the transition into "confirmed".
    if (record?.status !== 'confirmed' || old_record?.status === 'confirmed') {
      return json({ ok: true, note: 'no transition' })
    }

    await sendMail({
      to: record.client_email,
      subject: 'Your Consultation is Confirmed — Maxims Interiors',
      html: emailShell({
        heading: 'Your Consultation is Confirmed',
        preheader: `${record.preferred_date} at ${record.preferred_time}`,
        body: `<p>Dear ${String(record.client_name).split(' ')[0]},</p>
          <p>We're delighted to confirm your consultation with Maxims Interiors.</p>
          <p style="background:#FAF7F2;padding:14px;border-left:3px solid #C9A84C;">
            <strong>Date:</strong> ${record.preferred_date}<br>
            <strong>Time:</strong> ${record.preferred_time}<br>
            <strong>Location:</strong> ${record.location ?? 'Our Showroom, Wuse 2, Abuja'}
            ${record.meeting_link ? `<br><strong>Meeting link:</strong> ${record.meeting_link}` : ''}
          </p>
          <p>We look forward to bringing your vision to life. If you need to reschedule, simply reply to this email.</p>`,
      }),
    })
    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
