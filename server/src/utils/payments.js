// server/src/utils/payments.js
// GTCO Squad (primary) + Paystack adapters. Secret keys stay on the server.
//
// Squad reference (https://docs.squadco.com):
//   Initiate  POST {base}/transaction/initiate   Authorization: Bearer <SQUAD_SECRET_KEY>
//             body { amount (KOBO, integer), email, currency: 'NGN', initiate_type: 'inline',
//                    transaction_ref, callback_url, customer_name, metadata }
//             -> data.checkout_url. After payment Squad redirects the customer to
//                callback_url with ?reference=<transaction_ref>.
//   Verify    GET  {base}/transaction/verify/{transaction_ref}
//             -> data.transaction_status ('success' | 'failed' | 'abandoned' | 'pending'),
//                data.transaction_amount (KOBO), data.transaction_currency_id, data.transaction_type
//   Webhook   POST to our URL, header `x-squad-encrypted-body` =
//             HMAC-SHA512(raw JSON body, SQUAD_SECRET_KEY) as UPPERCASE hex.
//             body { Event: 'charge_successful', TransactionRef, Body: { amount (KOBO),
//                    transaction_ref, transaction_status: 'Success', currency, email, ... } }
//             Squad retries until it gets HTTP 200.
//   Base URL  sandbox keys (sandbox_sk_...) -> https://sandbox-api-d.squadco.com
//             live keys                     -> https://api-d.squadco.com
import crypto from 'node:crypto'

const squadSecret = () => process.env.SQUAD_SECRET_KEY || ''
const paystackSecret = () => process.env.PAYSTACK_SECRET_KEY || ''
const squadBase = () => (squadSecret().startsWith('sandbox') ? 'https://sandbox-api-d.squadco.com' : 'https://api-d.squadco.com')
const PAYSTACK_BASE = 'https://api.paystack.co'

/** Naira (DECIMAL) -> kobo integer. */
export const toKobo = (naira) => Math.round(Number(naira) * 100)

export function generateReference(prefix = 'MX') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
}

export function providerConfigured(provider) {
  return provider === 'paystack' ? Boolean(paystackSecret()) : Boolean(squadSecret())
}

async function readJson(res) {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { message: text.slice(0, 200) } }
}

// ── initialize ──
export async function initPayment(provider, { amountKobo, email, reference, callbackUrl, name, metadata }) {
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) throw new Error('Invalid amount')
  if (provider === 'paystack') {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${paystackSecret()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountKobo, email, reference, callback_url: callbackUrl, metadata: { customer_name: name, ...metadata } }),
      signal: AbortSignal.timeout(20000),
    })
    const data = await readJson(res)
    if (!data?.data?.authorization_url) throw new Error(data?.message || 'Paystack init failed')
    return { checkoutUrl: data.data.authorization_url }
  }
  const res = await fetch(`${squadBase()}/transaction/initiate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${squadSecret()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amountKobo, email, currency: 'NGN', initiate_type: 'inline',
      transaction_ref: reference, callback_url: callbackUrl, customer_name: name, metadata,
    }),
    signal: AbortSignal.timeout(20000),
  })
  const data = await readJson(res)
  if (!data?.data?.checkout_url) throw new Error(data?.message || 'Squad could not start the payment')
  return { checkoutUrl: data.data.checkout_url }
}

// ── verify (server-to-server) ──
// Returns { status: 'success'|'failed'|'pending', amountKobo, currency, channel, gatewayResponse }.
export async function verifyPayment(provider, reference) {
  const ref = encodeURIComponent(reference)
  if (provider === 'paystack') {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${ref}`, { headers: { Authorization: `Bearer ${paystackSecret()}` }, signal: AbortSignal.timeout(20000) })
    const d = (await readJson(res))?.data ?? {}
    const st = String(d.status || '').toLowerCase()
    return {
      status: st === 'success' ? 'success' : ['failed', 'abandoned', 'reversed'].includes(st) ? 'failed' : 'pending',
      amountKobo: Number.isFinite(Number(d.amount)) ? Number(d.amount) : null,
      currency: d.currency || null, channel: d.channel, gatewayResponse: d.gateway_response,
    }
  }
  const res = await fetch(`${squadBase()}/transaction/verify/${ref}`, { headers: { Authorization: `Bearer ${squadSecret()}` }, signal: AbortSignal.timeout(20000) })
  const d = (await readJson(res))?.data ?? {}
  const st = String(d.transaction_status || '').toLowerCase()
  return {
    status: st === 'success' ? 'success' : ['failed', 'abandoned', 'cancelled'].includes(st) ? 'failed' : 'pending',
    amountKobo: Number.isFinite(Number(d.transaction_amount)) ? Number(d.transaction_amount) : null,
    currency: d.transaction_currency_id || d.currency || null,
    channel: d.transaction_type, gatewayResponse: d.transaction_status,
  }
}

// ── webhook signature verification (constant-time) ──
function safeEqualHex(a, b) {
  const x = Buffer.from(String(a || '').trim().toLowerCase(), 'utf8')
  const y = Buffer.from(String(b || '').trim().toLowerCase(), 'utf8')
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y)
}

/**
 * rawBody: the exact bytes received (Buffer or string). parsedBody is only used
 * as a fallback because Squad's own sample signs JSON.stringify(body).
 */
export function verifyWebhookSignature(provider, rawBody, headers, parsedBody) {
  if (provider === 'paystack') {
    if (!paystackSecret()) return false
    const expected = crypto.createHmac('sha512', paystackSecret()).update(rawBody).digest('hex')
    return safeEqualHex(headers['x-paystack-signature'], expected)
  }
  const secret = squadSecret()
  if (!secret) return false
  const given = headers['x-squad-encrypted-body'] || headers['x-squad-signature']
  if (!given) return false
  const sign = (s) => crypto.createHmac('sha512', secret).update(s).digest('hex')
  if (safeEqualHex(given, sign(rawBody))) return true
  return parsedBody !== undefined && safeEqualHex(given, sign(JSON.stringify(parsedBody)))
}

/** Parses a verified webhook body into { reference, status, amountKobo, currency, channel }. */
export function parseWebhook(provider, event) {
  if (provider === 'paystack') {
    const d = event?.data || {}
    return {
      reference: d.reference,
      status: event?.event === 'charge.success' && d.status === 'success' ? 'success' : 'ignored',
      amountKobo: Number(d.amount), currency: d.currency, channel: d.channel,
    }
  }
  const d = event?.Body || event?.body || event?.data || {}
  const st = String(d.transaction_status || '').toLowerCase()
  const ev = String(event?.Event || '').toLowerCase()
  return {
    reference: d.transaction_ref || event?.TransactionRef,
    status: st === 'success' && (!ev || ev === 'charge_successful') ? 'success' : ['failed', 'abandoned'].includes(st) ? 'failed' : 'ignored',
    amountKobo: Number(d.amount), currency: d.currency, channel: d.transaction_type,
  }
}

// ── customer pay links ──
// Unguessable per-order token so only the customer (or staff who share the
// link) can open the pay page for an order. Stable for the order's lifetime.
export function payToken(orderId) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET || 'unset').update(`pay:${orderId}`).digest('base64url').slice(0, 32)
}
export function checkPayToken(orderId, token) {
  const a = Buffer.from(payToken(orderId)); const b = Buffer.from(String(token || ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
