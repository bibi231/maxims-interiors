// src/hooks/usePayment.js
// Client payment helper. The browser asks the API to initialise/verify;
// secret keys + the only "paid" writes live on the server.
import { api } from '@/lib/api'

const DEFAULT_PROVIDER = import.meta.env.VITE_PAYMENT_PROVIDER || 'squad'

export async function initializePayment({
  amount, email, name, phone, provider = DEFAULT_PROVIDER,
  orderId = null, description = '', metadata = {}, redirect = false,
}) {
  const data = await api.post('/payments/initialize', { amount, email, name, phone, provider, orderId, description, metadata })
  if (redirect && data.checkout_url) window.location.href = data.checkout_url
  return data
}

export function createPaymentLink(opts) { return initializePayment({ ...opts, redirect: false }) }

export async function verifyPayment(reference) { return api.post('/payments/verify', { reference }) }

export function usePayment() {
  return {
    provider: DEFAULT_PROVIDER,
    isConfigured: Boolean(import.meta.env.VITE_SQUAD_PUBLIC_KEY || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY),
    initializePayment, createPaymentLink, verifyPayment,
  }
}
