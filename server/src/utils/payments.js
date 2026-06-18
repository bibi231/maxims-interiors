// server/src/utils/payments.js
// Squad (GTCO) + Paystack adapters. Secret keys stay on the server.
import crypto from 'node:crypto'

const squadSecret = () => process.env.SQUAD_SECRET_KEY || ''
const paystackSecret = () => process.env.PAYSTACK_SECRET_KEY || ''
const squadBase = () => (squadSecret().startsWith('sandbox') ? 'https://sandbox-api-d.squadco.com' : 'https://api-d.squadco.com')
const PAYSTACK_BASE = 'https://api.paystack.co'
const toKobo = (naira) => Math.round(Number(naira) * 100)

export function generateReference(prefix = 'MX') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
}

// ── initialize ──
export async function initPayment(provider, { amount, email, reference, callbackUrl, name, metadata }) {
  if (provider === 'paystack') {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${paystackSecret()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: toKobo(amount), email, reference, callback_url: callbackUrl, metadata: { customer_name: name, ...metadata } }),
    })
    const data = await res.json()
    if (!data?.data?.authorization_url) throw new Error(data?.message || 'Paystack init failed')
    return { checkoutUrl: data.data.authorization_url }
  }
  // squad
  const res = await fetch(`${squadBase()}/transaction/initiate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${squadSecret()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: toKobo(amount), email, currency: 'NGN', initiate_type: 'inline', transaction_ref: reference, callback_url: callbackUrl, customer_name: name, metadata }),
  })
  const data = await res.json()
  if (!data?.data?.checkout_url) throw new Error(data?.message || 'Squad init failed')
  return { checkoutUrl: data.data.checkout_url }
}

// ── verify ──
export async function verifyPayment(provider, reference) {
  if (provider === 'paystack') {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${paystackSecret()}` } })
    const data = await res.json()
    const d = data?.data ?? {}
    const ok = String(d.status).toLowerCase() === 'success'
    return { status: ok ? 'success' : (d.status ? 'failed' : 'pending'), channel: d.channel, gatewayResponse: d.gateway_response, amount: d.amount ? d.amount / 100 : undefined }
  }
  const res = await fetch(`${squadBase()}/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${squadSecret()}` } })
  const data = await res.json()
  const d = data?.data ?? {}
  const ok = String(d.transaction_status).toLowerCase() === 'success'
  return { status: ok ? 'success' : (d.transaction_status ? 'failed' : 'pending'), channel: d.transaction_type, gatewayResponse: d.transaction_status, amount: d.transaction_amount ? d.transaction_amount / 100 : undefined }
}

// ── webhook signature verification ──
export function verifyWebhookSignature(provider, rawBody, headers) {
  if (provider === 'paystack') {
    const expected = crypto.createHmac('sha512', paystackSecret()).update(rawBody).digest('hex')
    return headers['x-paystack-signature'] === expected
  }
  const secret = process.env.SQUAD_WEBHOOK_SECRET || squadSecret()
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex').toUpperCase()
  return (headers['x-squad-signature'] || '').toUpperCase() === expected
}
