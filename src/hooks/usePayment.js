// src/hooks/usePayment.js
// Client payment helper. The browser asks the API to initialise/verify;
// secret keys and the only "paid" writes live on the server. The amount for
// an order is always the server-side total; the browser cannot change it.
import { api } from '@/lib/api'

const REF_KEY = 'maxims_last_payment_ref'

/** Customer: pay for an order/quote with its pay token. Redirects to Squad. */
export async function payForOrder({ orderId, token, redirect = true }) {
  const data = await api.post('/payments/initialize', { orderId, token })
  try { sessionStorage.setItem(REF_KEY, data.reference) } catch { /* ignore */ }
  if (redirect && data.checkout_url) window.location.href = data.checkout_url
  return data
}

/** Staff: custom-amount payment link (deposits, custom quotes). Requires sign-in. */
export async function createPaymentLink({ amount, email, name, phone, description = '', metadata = {} }) {
  return api.post('/payments/initialize', { amount, email, name, phone, description, metadata })
}

export async function verifyPayment(reference) { return api.post('/payments/verify', { reference }) }

export function lastPaymentReference() {
  try { return sessionStorage.getItem(REF_KEY) } catch { return null }
}
