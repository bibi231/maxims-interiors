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
                to: record.client_email,
                bcc: 'hello@maximsinteriors.com',
                subject: `Appointment Confirmation: ${new Date(record.preferred_date).toLocaleDateString()}`,
                html: `<h2>Appointment Request Received</h2>
              <p>Hi ${record.client_name},</p>
              <p>Your appointment request for <strong>${new Date(record.preferred_date).toLocaleDateString()} at ${record.preferred_time}</strong> has been received.</p>
              <p>We will review it and get back to you with a confirmation shortly.</p>
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
