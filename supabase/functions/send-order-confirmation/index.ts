import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    try {
        const payload = await req.json()
        const { record } = payload

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Maxims Interiors <onboarding@resend.dev>',
                to: record.customer_email,
                bcc: 'orders@maximsinteriors.com', // Internal notification
                subject: `Order Confirmation: ${record.order_number}`,
                html: `<h2>Order # ${record.order_number} Confirmed</h2>
              <p>Hi ${record.customer_name},</p>
              <p>Thank you for your order! We are currently processing it.</p>
              <p><strong>Total Amount:</strong> ₦${Number(record.total).toLocaleString()}</p>
              <p>We'll notify you once it ships.</p>
              <br/>
              <p>Best regards,<br/>Maxims Interiors Team</p>`
            })
        })

        const data = await res.json()
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
})
