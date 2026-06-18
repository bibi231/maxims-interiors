// supabase/functions/payment-webhook/index.ts
// Receives gateway webhooks (Squad + Paystack), verifies the signature,
// and updates the transaction. This is the authoritative settlement path.
// Deploy: supabase functions deploy payment-webhook --no-verify-jwt
//
// Point your gateway dashboards here:
//   Squad    → https://<project>.supabase.co/functions/v1/payment-webhook?provider=squad
//   Paystack → https://<project>.supabase.co/functions/v1/payment-webhook?provider=paystack
import { handleOptions, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/db.ts'

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre

  try {
    const url = new URL(req.url)
    const provider = url.searchParams.get('provider') ?? 'squad'
    const raw = await req.text()

    // ── Verify signature ──
    if (provider === 'paystack') {
      const secret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''
      const expected = await hmacSha512Hex(secret, raw)
      if (req.headers.get('x-paystack-signature') !== expected) return json({ error: 'bad signature' }, 401)
    } else {
      const secret = Deno.env.get('SQUAD_WEBHOOK_SECRET') || Deno.env.get('SQUAD_SECRET_KEY') || ''
      const expected = (await hmacSha512Hex(secret, raw)).toUpperCase()
      const got = (req.headers.get('x-squad-signature') ?? '').toUpperCase()
      if (got !== expected) return json({ error: 'bad signature' }, 401)
    }

    const event = JSON.parse(raw)
    // Extract reference + success flag per provider shape.
    let reference = ''
    let success = false
    if (provider === 'paystack') {
      reference = event?.data?.reference
      success = event?.event === 'charge.success' && event?.data?.status === 'success'
    } else {
      const d = event?.Body ?? event?.data ?? event
      reference = d?.transaction_ref ?? d?.transactionRef
      success = String(d?.transaction_status ?? '').toLowerCase() === 'success'
    }
    if (!reference) return json({ ok: true, note: 'no reference' })

    const db = adminClient()
    const { data: txn } = await db.from('transactions').select('*').eq('reference', reference).single()
    if (!txn) return json({ ok: true, note: 'unknown reference' })
    if (txn.status === 'success') return json({ ok: true, note: 'already settled' })

    const status = success ? 'success' : 'failed'
    await db.from('transactions').update({
      status,
      paid_at: success ? new Date().toISOString() : null,
      metadata: { ...(txn.metadata ?? {}), webhook: true },
    }).eq('reference', reference)

    if (success && txn.order_id) {
      await db.from('orders').update({ payment_status: 'paid', payment_ref: reference }).eq('id', txn.order_id)
    }

    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message ?? 'webhook error' }, 500)
  }
})
