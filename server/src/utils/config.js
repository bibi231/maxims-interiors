// server/src/utils/config.js
// Feature flags read from the environment at call time.

export const paymentProvider = () => (process.env.PAYMENT_PROVIDER || 'squad').toLowerCase() === 'paystack' ? 'paystack' : 'squad'

// Online payments. On only when PAYMENTS_ENABLED=true AND the provider's
// secret key is set (SQUAD_SECRET_KEY for Squad), so a half-configured
// server never shows customers a pay button that cannot work.
export const paymentsEnabled = () => {
  if (String(process.env.PAYMENTS_ENABLED || 'false').toLowerCase() !== 'true') return false
  return paymentProvider() === 'paystack' ? Boolean(process.env.PAYSTACK_SECRET_KEY) : Boolean(process.env.SQUAD_SECRET_KEY)
}
