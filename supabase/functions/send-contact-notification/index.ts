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
                to: 'hello@maximsinteriors.com',
                subject: `New Contact Request: ${record.service}`,
                html: `<h2>New Contact Message</h2>
              <p><strong>Name:</strong> ${record.name}</p>
              <p><strong>Email:</strong> ${record.email}</p>
              <p><strong>Phone:</strong> ${record.phone || 'N/A'}</p>
              <p><strong>Message:</strong><br/>${record.message}</p>`
            })
        })

        const data = await res.json()
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
})
