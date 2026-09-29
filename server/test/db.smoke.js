// server/test/db.smoke.js
// End-to-end smoke test of the API against a REAL MariaDB/MySQL database.
// It writes test rows, so only point it at a throwaway database:
//
//   TEST_DATABASE_URL=mysql://user:pass@127.0.0.1:3306/maxims_test npm run test:db
//
// Expects the schema applied and `npm run seed` + `npm run staff` run first
// (an owner account christinegadzama@... must exist). Emails are disabled.
import assert from 'node:assert/strict'

if (!process.env.TEST_DATABASE_URL) {
  console.error('Set TEST_DATABASE_URL to a throwaway database (this test writes data).')
  process.exit(1)
}
Object.assign(process.env, {
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  JWT_SECRET: 'smoke-test-secret',
  EMAIL_PROVIDER: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_SECURE: 'false',
  SUPPORTAI_API_KEY: '', TRUEWEB_NEWSLETTER_URL: '', NOTIFICATION_EMAIL: '', PAYMENTS_ENABLED: 'false',
  NODE_ENV: 'test',
})

const { createApp } = await import('../src/app.js')
const { closeDB } = await import('../src/config/db.js')
const { User } = await import('../src/models.js')
const { setupLink } = await import('../src/utils/staffInvite.js')

const server = createApp().listen(0)
const base = `http://127.0.0.1:${server.address().port}/api`
let token = null
const call = async (method, path, body, tk = token) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json; try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, body: json }
}
let passed = 0
const step = async (name, fn) => { await fn(); passed++; console.log('  ok', name) }
const tag = Date.now().toString(36)

try {
  await step('health checks the DB', async () => {
    const r = await call('GET', '/health')
    assert.equal(r.status, 200); assert.equal(r.body.db.ok, true)
  })

  let products
  await step('public product list (active only, sorted, JSON arrays, numbers, booleans)', async () => {
    const r = await call('GET', '/products', null, null)
    assert.equal(r.status, 200); assert.ok(r.body.length >= 8)
    products = r.body
    const p = products.find((x) => x.images?.length) || products[0]
    assert.ok(Array.isArray(p.images)); assert.equal(typeof p.price, 'number'); assert.equal(typeof p.is_featured, 'boolean')
    assert.ok(p.id && p.id === p._id && /^[a-f0-9]{24}$/.test(p.id))
    assert.ok(r.body.every((x) => x.status === 'active'))
  })
  await step('product by slug + 404', async () => {
    assert.equal((await call('GET', `/products/${products[0].slug}`, null, null)).body.id, products[0].id)
    assert.equal((await call('GET', '/products/nope-nope', null, null)).status, 404)
  })

  await step('login rejects wrong password; set-up link sets password; login works', async () => {
    const owner = await User.findOne({ role: 'owner', is_active: true })
    assert.ok(owner, 'owner account missing (run npm run staff)')
    assert.equal((await call('POST', '/auth/login', { email: owner.email, password: 'wrong-password' }, null)).status, 401)
    const link = new URL(setupLink(owner))
    const pw = 'Smoke-' + tag + '-pw'
    const r = await call('POST', '/auth/reset-password', { token: link.searchParams.get('token'), password: pw }, null)
    assert.equal(r.status, 200, JSON.stringify(r.body)); assert.ok(r.body.token)
    const again = await call('POST', '/auth/reset-password', { token: link.searchParams.get('token'), password: pw }, null)
    assert.equal(again.status, 400) // single use
    const login = await call('POST', '/auth/login', { email: owner.email.toUpperCase(), password: pw }, null)
    assert.equal(login.status, 200); token = login.body.token
    assert.equal(login.body.user.password_hash, undefined)
    const me = await call('GET', '/auth/me')
    assert.equal(me.body.user.email, owner.email); assert.ok(me.body.user.last_seen)
  })

  let prod
  await step('product create / update / validation / duplicate slug', async () => {
    const r = await call('POST', '/products', { name: 'Smoke Lamp ' + tag, slug: 'smoke-lamp-' + tag, price: '45000', category: 'Lighting', images: ['a.jpg', 'b.jpg'], is_featured: 'true', stock_qty: '3', id: 'ignored' })
    assert.equal(r.status, 201, JSON.stringify(r.body)); prod = r.body
    assert.equal(prod.price, 45000); assert.equal(prod.is_featured, true); assert.deepEqual(prod.images, ['a.jpg', 'b.jpg'])
    const u = await call('PUT', `/products/${prod.id}`, { price: 47000.5, status: 'draft' })
    assert.equal(u.body.price, 47000.5); assert.equal(u.body.status, 'draft')
    assert.equal((await call('PUT', `/products/${prod.id}`, { status: 'bogus' })).status, 400)
    assert.equal((await call('POST', '/products', { name: 'x', slug: 'smoke-lamp-' + tag, price: 1, category: 'c' })).status, 409)
    assert.equal((await call('POST', '/products', { name: 'no price', slug: 'np-' + tag, category: 'c' })).status, 400)
    const pub = await call('GET', '/products', null, null)
    assert.ok(!pub.body.some((x) => x.id === prod.id)) // draft hidden from public
    const staff = await call('GET', '/products?status=draft')
    assert.ok(staff.body.some((x) => x.id === prod.id))
    await call('PUT', `/products/${prod.id}`, { status: 'active', price: 45000 })
  })

  let order, quote
  await step('order request re-prices from DB; quote request', async () => {
    const r = await call('POST', '/orders/request', { customer_name: 'Ada Smoke', customer_email: 'ADA@example.com', customer_phone: '08012345678', items: [{ product_id: prod.id, qty: 2, price: 1 }, { product_id: 'bad', qty: 1 }], notes: 'hi' }, null)
    assert.equal(r.status, 201, JSON.stringify(r.body)); order = r.body
    assert.equal(order.total, 90000); assert.equal(order.items.length, 1); assert.match(order.order_number, /^MX-/)
    const q = await call('POST', '/orders', { kind: 'quote', customer_name: 'Bo Quote', customer_email: 'bo@example.com', customer_phone: '08099999999', service: 'Full home design' }, null)
    assert.equal(q.status, 201); quote = q.body; assert.match(quote.order_number, /^MQ-/)
    assert.equal((await call('POST', '/orders', { customer_name: 'x', customer_email: 'x@y.co', customer_phone: '0801234567', items: [] }, null)).status, 400)
  })

  await step('admin order list: kind filter, search, populate', async () => {
    const all = await call('GET', '/orders')
    const o = all.body.find((x) => x.id === order.id)
    assert.equal(o.customer_email, 'ada@example.com'); assert.equal(o.status_history[0].status, 'new'); assert.ok(o.status_history[0].created_at)
    const onlyOrders = await call('GET', '/orders?kind=order')
    assert.ok(onlyOrders.body.every((x) => x.kind !== 'quote'))
    const onlyQuotes = await call('GET', '/orders?kind=quote')
    assert.ok(onlyQuotes.body.some((x) => x.id === quote.id) && onlyQuotes.body.every((x) => x.kind === 'quote'))
    const s = await call('GET', `/orders?search=${encodeURIComponent(order.order_number)}`)
    assert.equal(s.body.length, 1)
    const s2 = await call('GET', '/orders?search=ADA%20sm')
    assert.ok(s2.body.some((x) => x.id === order.id))
  })

  await step('order patch: status history, note, assignment populate, delivery fee', async () => {
    const me = (await call('GET', '/auth/me')).body.user
    const r = await call('PATCH', `/orders/${order.id}`, { status: 'contacted', note: 'Called customer', assigned_to: me.id, delivery_fee: '5000' })
    assert.equal(r.status, 200, JSON.stringify(r.body))
    assert.equal(r.body.status, 'contacted'); assert.equal(r.body.total, 95000)
    assert.equal(r.body.status_history.length, 2); assert.equal(r.body.staff_notes[0].text, 'Called customer')
    assert.equal(r.body.assigned_to.full_name, me.full_name); assert.equal(r.body.assigned_to.password_hash, undefined)
    const again = await call('PATCH', `/orders/${order.id}`, { status: 'paid' })
    assert.equal(again.body.payment_status, 'paid'); assert.equal(again.body.assigned_to.id, me.id)
    assert.equal((await call('PATCH', `/orders/${order.id}`, { status: 'weird' })).status, 400)
    assert.equal((await call('PATCH', '/orders/000000000000000000000000', { status: 'paid' })).status, 404)
  })

  await step('notification + dashboard stats', async () => {
    const n = await call('GET', '/stats/notifications')
    assert.equal(n.status, 200); assert.ok(n.body.quotes >= 1); assert.equal(typeof n.body.total, 'number')
    const d = await call('GET', '/stats/dashboard')
    assert.ok(d.body.orders.total >= 2); assert.ok(d.body.orders.revenue >= 95000); assert.ok(d.body.orders.thisMonth >= 2)
    assert.ok(d.body.products.total >= 8)
  })

  await step('contact message: create, list, read, reply', async () => {
    const r = await call('POST', '/messages', { full_name: 'Cy Contact', email: 'cy@example.com', message: 'Hello ' + tag }, null)
    assert.equal(r.status, 201); assert.match(r.body.reference, /^MC-[0-9A-F]{6}$/)
    const list = await call('GET', '/messages?status=unread')
    const m = list.body.find((x) => x.message === 'Hello ' + tag); assert.ok(m)
    assert.equal((await call('PATCH', `/messages/${m.id}/read`)).body.ok, true)
    const rep = await call('PATCH', `/messages/${m.id}`, { reply_text: 'Thanks!' })
    assert.equal(rep.body.status, 'replied'); assert.ok(rep.body.replied_at)
    const l2 = await call('GET', '/messages?status=replied')
    assert.ok(l2.body.find((x) => x.id === m.id).replied_by.full_name)
  })

  await step('appointments: availability, book, conflict, confirm', async () => {
    const slot = { date: '2031-01-0' + (1 + (Date.now() % 9)), time: '10:' + String(Date.now() % 60).padStart(2, '0') }
    assert.equal((await call('GET', `/appointments/availability?date=${slot.date}&time=${slot.time}`, null, null)).body.available, true)
    const b = await call('POST', '/appointments', { client_name: 'Di Book', client_email: 'di@example.com', preferred_date: slot.date, preferred_time: slot.time }, null)
    assert.equal(b.status, 201, JSON.stringify(b.body))
    assert.equal((await call('POST', '/appointments', { client_name: 'X', client_email: 'x@example.com', preferred_date: slot.date, preferred_time: slot.time }, null)).status, 409)
    const c = await call('PATCH', `/appointments/${b.body.id}`, { status: 'confirmed' })
    assert.equal(c.body.status, 'confirmed'); assert.ok(c.body.confirmed_at)
    const list = await call('GET', `/appointments?date=${slot.date}`)
    assert.ok(list.body.some((x) => x.id === b.body.id))
  })

  await step('bulk request: create, quote', async () => {
    const r = await call('POST', '/bulk', { company_name: 'Acme', contact_name: 'Ed', email: 'ed@acme.com', quantity: 20 }, null)
    assert.equal(r.status, 201); assert.equal(r.body.quantity, '20')
    const p = await call('PATCH', `/bulk/${r.body.id}`, { status: 'quoted', quote_amount: 1500000, assigned_to: '' })
    assert.equal(p.body.status, 'quoted'); assert.equal(p.body.quote_amount, 1500000); assert.equal(p.body.assigned_to, null)
    assert.ok((await call('GET', '/bulk')).body.some((x) => x.id === r.body.id))
  })

  await step('newsletter: subscribe is idempotent; admin list + patch', async () => {
    const email = `News.${tag}@Example.com`
    assert.equal((await call('POST', '/newsletter', { email }, null)).status, 201)
    assert.equal((await call('POST', '/newsletter', { email }, null)).body.already, true)
    const row = (await call('GET', '/newsletter')).body.find((x) => x.email === email.toLowerCase())
    assert.ok(row?.welcomed_at)
    assert.equal((await call('PATCH', `/newsletter/${row.id}`, { status: 'unsubscribed' })).body.status, 'unsubscribed')
  })

  await step('settings: read map, upsert JSON value', async () => {
    const s = await call('GET', '/settings', null, null)
    assert.equal(s.body.delivery_fee, 5000); assert.ok(s.body.contact_info.email)
    await call('PUT', '/settings/smoke_' + tag, { value: { a: [1, 2], b: 'x' } })
    await call('PUT', '/settings/smoke_' + tag, { value: { a: [3] } })
    assert.deepEqual((await call('GET', '/settings', null, null)).body['smoke_' + tag], { a: [3] })
  })

  await step('gallery, testimonials, team CRUD + published filters', async () => {
    const g = await call('POST', '/gallery', { title: 'Smoke Project', slug: 'smoke-proj-' + tag, category: 'Living Room', year: '2025', is_published: false })
    assert.equal(g.status, 201); assert.equal(g.body.year, 2025)
    assert.ok(!(await call('GET', '/gallery', null, null)).body.some((x) => x.id === g.body.id))
    assert.ok((await call('GET', '/gallery?published=false')).body.some((x) => x.id === g.body.id))
    assert.equal((await call('PUT', `/gallery/${g.body.id}`, { is_published: true })).body.is_published, true)
    assert.equal((await call('DELETE', `/gallery/${g.body.id}`)).body.ok, true)

    const t = await call('POST', '/testimonials', { client_name: 'Tee', quote: 'Great', rating: 4 })
    assert.equal(t.status, 201)
    assert.ok((await call('GET', '/testimonials?featured=true', null, null)).body.every((x) => x.is_featured))
    await call('DELETE', `/testimonials/${t.body.id}`)

    const me = (await call('GET', '/auth/me')).body.user
    const tm = await call('POST', '/team', { full_name: 'Tm', title: 'Designer', profile_id: me.id })
    assert.equal(tm.body.profile_id, me.id)
    assert.equal((await call('PUT', `/team/${tm.body.id}`, { profile_id: null })).body.profile_id, null)
    assert.ok((await call('GET', '/team', null, null)).body.some((x) => x.id === tm.body.id))
    await call('DELETE', `/team/${tm.body.id}`)
  })

  await step('staff: register without password, profiles, role, deactivate, password $inc', async () => {
    const email = `staff.${tag}@example.com`
    const r = await call('POST', '/auth/register', { email, full_name: 'New Staff', role: 'shop_manager' })
    assert.equal(r.status, 201, JSON.stringify(r.body)); assert.equal(r.body.user.password_hash, undefined)
    assert.equal((await call('POST', '/auth/register', { email, full_name: 'Dup' })).status, 409)
    const profiles = await call('GET', '/profiles')
    assert.ok(profiles.body.every((p) => p.password_hash === undefined))
    const id = r.body.user.id
    assert.equal((await call('PATCH', `/profiles/${id}/role`, { role: 'content_editor' })).body.role, 'content_editor')
    const p = await call('PATCH', `/profiles/${id}`, { password: 'abcdefgh1', title: 'T' })
    assert.equal(p.body.title, 'T')
    assert.equal((await User.findById(id)).password_version, 1)
    const login = await call('POST', '/auth/login', { email, password: 'abcdefgh1' }, null)
    assert.equal(login.status, 200)
    // content_editor cannot see orders
    assert.equal((await call('GET', '/orders', null, login.body.token)).status, 403)
    await call('PATCH', `/profiles/${id}`, { is_active: false })
    assert.equal((await call('POST', '/auth/login', { email, password: 'abcdefgh1' }, null)).status, 403)
    assert.equal((await call('GET', '/auth/me', null, login.body.token)).status, 401)
    assert.equal((await call('POST', '/auth/forgot-password', { email }, null)).status, 200)
  })

  await step('team invites: pending status, email failure surfaced with copyable link, resend, cancel', async () => {
    const email = `invite.${tag}@example.com`
    const r = await call('POST', '/auth/register', { email, full_name: 'Ivy Invite', role: 'content_editor' })
    assert.equal(r.status, 201, JSON.stringify(r.body))
    assert.equal(r.body.invite_sent, false) // SMTP is unreachable in the test
    assert.ok(r.body.email_error)
    assert.match(r.body.setup_url, /\/admin\/reset-password\?token=.+&welcome=1$/)
    assert.equal(r.body.user.invite_pending, true); assert.ok(r.body.user.invited_at)
    const id = r.body.user.id
    const listed = (await call('GET', '/profiles')).body.find((p) => p.id === id)
    assert.equal(listed.invite_pending, true)
    // resend invalidates the first link
    const re = await call('POST', `/profiles/${id}/resend-invite`)
    assert.equal(re.status, 200, JSON.stringify(re.body)); assert.equal(re.body.invite_sent, false); assert.ok(re.body.setup_url)
    const oldTok = new URL(r.body.setup_url).searchParams.get('token')
    assert.equal((await call('POST', '/auth/reset-password', { token: oldTok, password: 'abcdefgh1' }, null)).status, 400)
    // cancel a pending invite deletes it
    const del = await call('DELETE', `/profiles/${id}`)
    assert.equal(del.body.deleted, true)
    assert.ok(!(await call('GET', '/profiles')).body.some((p) => p.id === id))
    // accepted invite: set password clears pending; remove then deactivates
    const r2 = await call('POST', '/auth/register', { email: 'b.' + email, full_name: 'Bea Invite', role: 'shop_manager' })
    const tok = new URL(r2.body.setup_url).searchParams.get('token')
    const set = await call('POST', '/auth/reset-password', { token: tok, password: 'abcdefgh1' }, null)
    assert.equal(set.status, 200); assert.equal(set.body.user.invite_pending, false)
    assert.equal((await call('POST', `/profiles/${r2.body.user.id}/resend-invite`)).status, 400)
    const rm = await call('DELETE', `/profiles/${r2.body.user.id}`)
    assert.equal(rm.body.deleted, false); assert.equal(rm.body.user.is_active, false)
    const me = (await call('GET', '/auth/me')).body.user
    assert.equal((await call('DELETE', `/profiles/${me.id}`)).status, 400)
    assert.equal((await call('POST', '/settings/test-email')).status, 502)
  })

  await step('rate limits: forgot-password is per IP+email, reset-password has its own budget', async () => {
    const email = `limit.${tag}@example.com`
    for (let i = 0; i < 5; i++) assert.equal((await call('POST', '/auth/forgot-password', { email }, null)).status, 200)
    assert.equal((await call('POST', '/auth/forgot-password', { email }, null)).status, 429)
    // a different email from the same IP still has its own budget
    assert.equal((await call('POST', '/auth/forgot-password', { email: 'other.' + email }, null)).status, 200)
    // holding a link: reset-password is not blocked by the forgot limiter
    for (let i = 0; i < 6; i++) assert.equal((await call('POST', '/auth/reset-password', { token: 'bad', password: 'abcdefgh1' }, null)).status, 400)
  })

  await step('activity log with populated profile', async () => {
    const a = await call('GET', '/activity?limit=5')
    assert.equal(a.status, 200); assert.ok(a.body.length > 0 && a.body.length <= 5)
    assert.ok(a.body[0].profile?.full_name)
  })

  await step('payments disabled; transactions list; order delete', async () => {
    assert.equal((await call('POST', '/payments/initialize', { email: 'a@b.co', amount: 10 }, null)).status, 503)
    assert.ok(Array.isArray((await call('GET', '/payments/transactions?search=a')).body))
    assert.equal((await call('GET', '/stats/payments')).status, 200)
    assert.equal((await call('DELETE', `/orders/${quote.id}`)).body.ok, true)
    await call('DELETE', `/products/${prod.id}`)
    assert.equal((await call('GET', `/products/${prod.slug}`, null, null)).status, 404)
  })

  console.log(`\n${passed} checks passed`)
} catch (e) {
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  server.close()
  await closeDB()
}
