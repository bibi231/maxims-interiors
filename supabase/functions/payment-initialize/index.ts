// supabase/functions/payment-initialize/index.ts
// Creates a pending transaction + returns a gateway checkout URL.
// Deploy: supabase functions deploy payment-initialize --no-verify-jwt
import { corsHeaders, handleOptions, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/db.ts'
import { initPayment, generateReference } from '../_shared/providers.ts'

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre

  try {
    const { amount, email, name, phone, provider = 'squad', orderId, description, metadata } = await req.json()

    // ── Server-side validation (never trust the client) ──
    const amt = Number(amount)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Valid email required' }, 400)
    if (!amt || amt <= 0 || amt > 100_000_000) return json({ error: 'Invalid amount' }, 400)
    if (!['squad', 'paystack'].includes(provider)) return json({ error: 'Unknown provider' }, 400)

    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
    const reference = generateReference()
    const db = adminClient()

    // Record a PENDING transaction up front.
    const { error: insErr } = await db.from('transactions').insert({
      reference, provider, order_id: orderId ?? null,
      customer_name: name ?? null, customer_email: email, customer_phone: phone ?? null,
      amount: amt, status: 'pending', metadata: metadata ?? {},
      gateway_response: description ?? null,
    })
    if (insErr) return json({ error: insErr.message }, 500)

    const { checkoutUrl } = await initPayment(provider, {
      amount: amt, email, name, reference,
      callbackUrl: `${appUrl}/payment/callback?reference=${reference}`,
      metadata: { ...(metadata ?? {}), description: description ?? '' },
    })

    return json({ reference, checkout_url: checkoutUrl, provider })
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Initialization failed' }, 500)
  }
})
