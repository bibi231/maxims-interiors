// supabase/functions/payment-verify/index.ts
// Verifies a reference with the gateway and updates the transaction.
// The ONLY paths (with the webhook) that can set status = 'success'.
// Deploy: supabase functions deploy payment-verify --no-verify-jwt
import { handleOptions, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/db.ts'
import { verifyTransaction } from '../_shared/providers.ts'

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre

  try {
    const { reference } = await req.json()
    if (!reference) return json({ error: 'reference required' }, 400)

    const db = adminClient()
    const { data: txn, error } = await db.from('transactions').select('*').eq('reference', reference).single()
    if (error || !txn) return json({ error: 'Transaction not found' }, 404)

    // Already settled — return as-is (idempotent).
    if (txn.status === 'success') return json({ status: 'success', transaction: txn })

    const result = await verifyTransaction(txn.provider, reference)

    // Guard against amount tampering: gateway amount must match our record.
    const amountOk = result.amount == null || Math.abs(result.amount - Number(txn.amount)) < 1
    const finalStatus = result.status === 'success' && amountOk ? 'success' : (result.status === 'pending' ? 'pending' : 'failed')

    const updates: Record<string, unknown> = {
      status: finalStatus,
      channel: result.channel ?? txn.channel,
      gateway_response: result.gatewayResponse ?? txn.gateway_response,
    }
    if (finalStatus === 'success') updates.paid_at = new Date().toISOString()

    const { data: updated } = await db.from('transactions').update(updates).eq('reference', reference).select().single()

    // If this transaction is tied to an order, mark the order paid.
    if (finalStatus === 'success' && txn.order_id) {
      await db.from('orders').update({ payment_status: 'paid', payment_ref: reference }).eq('id', txn.order_id)
    }

    return json({ status: finalStatus, transaction: updated ?? txn })
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Verification failed' }, 500)
  }
})
