// src/lib/api.js
// Thin REST client for the Maxims Express API. Attaches the JWT (if any),
// parses JSON, and throws on non-2xx so callers can try/catch.
// In production (Vercel) the API is served from the same origin, so no
// VITE_API_URL is needed — it defaults to same-origin in the browser.
// For local dev set VITE_API_URL=http://localhost:4000 in .env.
const BASE = (
  import.meta.env.VITE_API_URL ?? (typeof window !== 'undefined' ? '' : 'http://localhost:4000')
).replace(/\/$/, '')

let token = (typeof localStorage !== 'undefined' && localStorage.getItem('maxims_token')) || null

export function setToken(t) {
  token = t
  if (typeof localStorage === 'undefined') return
  if (t) localStorage.setItem('maxims_token', t)
  else localStorage.removeItem('maxims_token')
}
export function getToken() { return token }

// Build a querystring from an object, skipping empty values.
export function qs(params = {}) {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.append(k, v)
  })
  const s = usp.toString()
  return s ? `?${s}` : ''
}

async function request(method, path, body, isForm = false) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (isForm) payload = body
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }

  const res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  base: BASE,
  get:   (p) => request('GET', p),
  post:  (p, b) => request('POST', p, b),
  put:   (p, b) => request('PUT', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del:   (p) => request('DELETE', p),
  upload: (file, folder = 'misc') => {
    const fd = new FormData()
    fd.append('file', file)
    return request('POST', `/upload${qs({ folder })}`, fd, true)
  },
}
