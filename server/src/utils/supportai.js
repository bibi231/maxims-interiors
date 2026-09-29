// server/src/utils/supportai.js
// Best-effort lead forwarding to SupportAI so every order / quote / contact /
// booking also lands in the Maxims bot's lead inbox. Never blocks or fails the
// customer request: fire-and-forget with a short timeout, errors are logged.
//
// Endpoint: POST {SUPPORTAI_API_URL}/api/v1/bots/{SUPPORTAI_BOT_ID}/leads
//   Authorization: Bearer {SUPPORTAI_API_KEY}
//   { name?, email?, phone?, company?, kind, reference?, message?, pageUrl? }
//   (email or phone required) -> 201 { data: { leadId } }
//
// Env:
//   SUPPORTAI_API_KEY   bot API key
//   SUPPORTAI_BOT_ID    Maxims bot id (6a58aa0726d3a64c4c51611b)
//   SUPPORTAI_API_URL   optional, default https://api.supportai.com.ng
// Disabled (no-op) unless both key and bot id are set.
const KINDS = ['order', 'quote', 'contact', 'booking', 'other']

export function forwardLead({ kind, name, email, phone, company, reference, message, pageUrl }) {
  const key = process.env.SUPPORTAI_API_KEY
  const botId = process.env.SUPPORTAI_BOT_ID
  if (!key || !botId) return
  if (!email && !phone) return
  const base = (process.env.SUPPORTAI_API_URL || 'https://api.supportai.com.ng').replace(/\/$/, '')
  const body = {
    kind: KINDS.includes(kind) ? kind : 'other',
    name: name || undefined,
    email: email || undefined,
    phone: phone || undefined,
    company: company || undefined,
    reference: reference || undefined,
    message: message ? String(message).slice(0, 4000) : undefined,
    pageUrl: pageUrl || (process.env.APP_URL || 'https://maximsinterior.com.ng'),
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 5000)
  fetch(`${base}/api/v1/bots/${encodeURIComponent(botId)}/leads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  })
    .then((r) => { if (!r.ok) console.warn(`[supportai] lead forward HTTP ${r.status}`) })
    .catch((e) => console.warn('[supportai] lead forward failed:', e.message))
    .finally(() => clearTimeout(timer))
}
