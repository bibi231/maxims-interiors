// supabase/functions/_shared/providers.ts
// ============================================================
// Payment gateway adapters — Squad (GTCO) and Paystack.
// One small interface so the rest of the code is provider-agnostic.
// All secret keys are read from Edge Function secrets (Deno.env),
// never shipped to the browser.
// ============================================================

const SQUAD_SECRET = Deno.env.get('SQUAD_SECRET_KEY') ?? ''
const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''

// Squad: live base is api-d.squadco.com, sandbox is sandbox-api-d.squadco.com.
// Auto-detect from the key prefix (sandbox keys start with sandbox_sk).
const SQUAD_BASE = SQUAD_SECRET.startsWith('sandbox')
  ? 'https://sandbox-api-d.squadco.com'
  : 'https://api-d.squadco.com'
const PAYSTACK_BASE = 'https://api.paystack.co'

export interface InitInput {
  amount: number        // Naira
  email: string
  reference: string
  callbackUrl: string
  name?: string
  metadata?: Record<string, unknown>
}

export interface InitResult {
  checkoutUrl: string
}

export interface VerifyResult {
  status: 'success' | 'failed' | 'pending'
  channel?: string
  gatewayResponse?: string
  amount?: number       // Naira
  raw: unknown
}

const toKobo = (naira: number) => Math.round(Number(naira) * 100)

// ── SQUAD ─────────────────────────────────────────────────────
async function squadInit(i: InitInput): Promise<InitResult> {
  const res = await fetch(`${SQUAD_BASE}/transaction/initiate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SQUAD_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: toKobo(i.amount),
      email: i.email,
      currency: 'NGN',
      initiate_type: 'inline',
      transaction_ref: i.reference,
      callback_url: i.callbackUrl,
      customer_name: i.name,
      metadata: i.metadata ?? {},
    }),
  })
  const data = await res.json()
  const url = data?.data?.checkout_url
  if (!url) throw new Error(data?.message || 'Squad initiation failed')
  return { checkoutUrl: url }
}

async function squadVerify(reference: string): Promise<VerifyResult> {
  const res = await fetch(`${SQUAD_BASE}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${SQUAD_SECRET}` },
  })
  const data = await res.json()
  const d = data?.data ?? {}
  const ok = String(d.transaction_status ?? '').toLowerCase() === 'success'
  return {
    status: ok ? 'success' : (d.transaction_status ? 'failed' : 'pending'),
    channel: d.transaction_type,
    gatewayResponse: d.transaction_status,
    amount: d.transaction_amount ? Number(d.transaction_amount) / 100 : undefined,
    raw: data,
  }
}

// ── PAYSTACK ──────────────────────────────────────────────────
async function paystackInit(i: InitInput): Promise<InitResult> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: toKobo(i.amount),
      email: i.email,
      reference: i.reference,
      callback_url: i.callbackUrl,
      metadata: { customer_name: i.name, ...(i.metadata ?? {}) },
    }),
  })
  const data = await res.json()
  const url = data?.data?.authorization_url
  if (!url) throw new Error(data?.message || 'Paystack initiation failed')
  return { checkoutUrl: url }
}

async function paystackVerify(reference: string): Promise<VerifyResult> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  })
  const data = await res.json()
  const d = data?.data ?? {}
  const ok = String(d.status ?? '').toLowerCase() === 'success'
  return {
    status: ok ? 'success' : (d.status ? 'failed' : 'pending'),
    channel: d.channel,
    gatewayResponse: d.gateway_response,
    amount: d.amount ? Number(d.amount) / 100 : undefined,
    raw: data,
  }
}

// ── Dispatcher ────────────────────────────────────────────────
export function initPayment(provider: string, input: InitInput): Promise<InitResult> {
  return provider === 'paystack' ? paystackInit(input) : squadInit(input)
}

export function verifyTransaction(provider: string, reference: string): Promise<VerifyResult> {
  return provider === 'paystack' ? paystackVerify(reference) : squadVerify(reference)
}

export function generateReference(prefix = 'MX'): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
}
