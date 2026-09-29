// server/src/utils/config.js
// Feature flags read from the environment at call time.

// Online payments (Paystack / GTCO Squad). Off until the live keys are in place.
// Set PAYMENTS_ENABLED=true on the server to switch the pay buttons back on.
export const paymentsEnabled = () => String(process.env.PAYMENTS_ENABLED || 'false').toLowerCase() === 'true'
