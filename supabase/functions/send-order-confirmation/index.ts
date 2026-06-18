// supabase/functions/send-order-confirmation/index.ts
// DB Webhook: orders INSERT. Emails the customer an order receipt.
// Deploy: supabase functions deploy send-order-confirmation --no-verify-jwt
import { handleOptions, json } from '../_shared/cors.ts'
import { sendMail } from '../_shared/mailer.ts'
import { emailShell, naira } from '../_shared/templates.ts'

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre
  try {
    const { record } = await req.json()
    if (!record?.customer_email) return json({ ok: true, note: 'no record' })

    const items = Array.isArray(record.items) ? record.items : []
    const rows = items.map((i: { name: string; qty: number; price: number }) =>
      `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">${i.name} × ${i.qty}</td>
           <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${naira(i.price * i.qty)}</td></tr>`).join('')

    await sendMail({
      to: record.customer_email,
      subject: `Order Received — ${record.order_number} — Maxims Interiors`,
      html: emailShell({
        heading: 'Thank You for Your Order',
        preheader: `Order ${record.order_number} received`,
        body: `<p>Dear ${String(record.customer_name).split(' ')[0]},</p>
          <p>We've received your order <strong>${record.order_number}</strong>. Here's a summary:</p>
          <table role="presentation" width="100%" style="font-size:14px;color:#3D3B50;">
            ${rows}
            <tr><td style="padding:10px 0;font-weight:bold;">Total</td>
                <td style="padding:10px 0;text-align:right;font-weight:bold;color:#1C0D35;">${naira(record.total)}</td></tr>
          </table>
          <p>Our team will be in touch shortly to arrange delivery${record.payment_status === 'paid' ? '' : ' and confirm payment'}.</p>`,
        ctaLabel: 'Visit Our Shop', ctaUrl: `${Deno.env.get('APP_URL') ?? ''}/shop`,
      }),
    })
    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
