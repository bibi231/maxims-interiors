import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    try {
        const payload = await req.json()
        // For update triggers, payload has old_record and record
        const { record, old_record } = payload

        // Only send if status changed to 'quoted'
        if (record.status !== 'quoted' || old_record.status === 'quoted') {
            return new Response('No email sent', { headers: { 'Content-Type': 'text/plain' } })
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Maxims Interiors <onboarding@resend.dev>',
                to: record.email,
                subject: `Your Quote is Ready | Maxims Interiors`,
                html: `<h2>Quote for Bulk Request</h2>
              <p>Hi ${record.name},</p>
              <p>We have reviewed your bulk request and have prepared a quote for you.</p>
              <p><strong>Notes:</strong><br/>${record.internal_notes || 'Please see attached quote details.'}</p>
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
