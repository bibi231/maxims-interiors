// server/test/copy-from-mongo.test.js
// Seeds a THROWAWAY MongoDB with Mongoose-shaped documents for every model,
// runs scripts/copy-from-mongo.js into a THROWAWAY MariaDB/MySQL database, and
// checks counts, ids, idempotency, logins with copied bcrypt hashes and order data.
//
//   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/maxims_copy_test \
//   TEST_DATABASE_URL=mysql://user:pass@127.0.0.1:3306/maxims_copy_test \
//   npm run test:copy
//
// Both databases are wiped. Never point these at real data.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { MongoClient, ObjectId } from 'mongodb'

const { TEST_MONGODB_URI, TEST_DATABASE_URL } = process.env
if (!TEST_MONGODB_URI || !TEST_DATABASE_URL) {
  console.error('Set TEST_MONGODB_URI and TEST_DATABASE_URL to throwaway databases.')
  process.exit(1)
}
Object.assign(process.env, {
  DATABASE_URL: TEST_DATABASE_URL, JWT_SECRET: 'copy-test-secret',
  EMAIL_PROVIDER: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_SECURE: 'false',
  SUPPORTAI_API_KEY: '', TRUEWEB_NEWSLETTER_URL: '', NOTIFICATION_EMAIL: '', NODE_ENV: 'test',
})
const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { query, closeDB } = await import('../src/config/db.js')
const { createApp } = await import('../src/app.js')

const runCopy = (...flags) => spawnSync(process.execPath, ['scripts/copy-from-mongo.js', ...flags], {
  cwd: serverDir, encoding: 'utf8',
  env: { ...process.env, MONGODB_URI: TEST_MONGODB_URI, DATABASE_URL: TEST_DATABASE_URL },
})

// ── Representative Mongoose-shaped documents ──
const t0 = new Date('2026-03-01T10:00:00.000Z')
const t1 = new Date('2026-03-02T11:30:00.000Z')
const ts = { created_at: t0, updated_at: t1, __v: 0 }
const ownerId = new ObjectId(), staffId = new ObjectId(), prodA = new ObjectId(), prodB = new ObjectId(), orderId = new ObjectId()
const ownerPw = 'Owner-pass-123', staffPw = 'Staff-pass-456'
const docs = {
  users: [
    { _id: ownerId, email: 'owner@example.com', password_hash: await bcrypt.hash(ownerPw, 10), full_name: 'Owner One', role: 'owner', is_active: true, password_version: 2, last_seen: t1, ...ts },
    { _id: staffId, email: 'staff@example.com', password_hash: await bcrypt.hash(staffPw, 10), full_name: 'Staff Two', role: 'shop_manager', title: 'Shop', is_active: true, ...ts }, // no password_version: default 0
  ],
  products: [
    { _id: prodA, name: 'Linen Cushion Quartet', slug: 'linen-cushion-quartet', price: 32000, category: 'Living Room', images: ['https://x/a.jpg', 'https://x/b.jpg'], cover_image: 'https://x/a.jpg', stock_qty: 40, status: 'active', is_featured: true, sort_order: 0, tags: ['soft'], ...ts },
    { _id: prodB, name: 'Vela Pendant Light', slug: 'vela-pendant-light', price: 68000.5, compare_price: 70000, category: 'Lighting', images: [], stock_qty: 6, status: 'draft', is_featured: false, tags: [], ...ts },
  ],
  orders: [
    { _id: orderId, order_number: 'MX-ABC12345', kind: 'order', source: 'cart', customer_name: 'Ada', customer_email: 'ada@example.com', customer_phone: '0801',
      items: [{ product_id: String(prodA), name: 'Linen Cushion Quartet', slug: 'linen-cushion-quartet', price: 32000, qty: 2, image: 'https://x/a.jpg' }],
      subtotal: 64000, delivery_fee: 5000, total: 69000, status: 'contacted', payment_status: 'unpaid', preferred_contact: 'whatsapp',
      staff_notes: [{ _id: new ObjectId(), text: 'Called', author_name: 'Owner One', created_at: t1 }],
      status_history: [{ _id: new ObjectId(), status: 'new', author_name: 'Customer', created_at: t0 }, { _id: new ObjectId(), status: 'contacted', author_name: 'Owner One', created_at: t1 }],
      assigned_to: staffId, ...ts },
    { _id: new ObjectId(), order_number: 'MX-OLD1', customer_name: 'Legacy', customer_email: 'old@example.com', items: [], subtotal: 0, total: 0, status: 'shipped', ...ts }, // legacy: no kind
  ],
  bulkrequests: [{ _id: new ObjectId(), company_name: 'Acme', contact_name: 'Ed', email: 'ed@acme.com', quantity: '20', status: 'quoted', quote_amount: 1500000, assigned_to: ownerId, ...ts }],
  appointments: [{ _id: new ObjectId(), client_name: 'Di', client_email: 'di@example.com', preferred_date: '2026-04-01', preferred_time: '10:00', status: 'confirmed', confirmed_at: t1, duration_mins: 60, ...ts }],
  messages: [{ _id: new ObjectId(), full_name: 'Cy', email: 'cy@example.com', message: 'Hello — ₦ naira ✓', status: 'replied', replied_by: ownerId, reply_text: 'Thanks', replied_at: t1, ...ts }],
  galleries: [{ _id: new ObjectId(), title: 'Corporate Office', slug: 'corporate-office', category: 'Commercial', year: 2025, grid_size: 'large', images: ['https://x/o.jpg'], is_featured: true, is_published: true, ...ts }],
  testimonials: [{ _id: new ObjectId(), client_name: 'Ms Christine Miner', quote: 'Wonderful', rating: 5, is_featured: true, is_published: true, sort_order: 0, ...ts }],
  teammembers: [{ _id: new ObjectId(), full_name: 'Team A', title: 'Designer', profile_id: staffId, is_published: true, sort_order: 1, ...ts }],
  settings: [
    { _id: new ObjectId(), key: 'contact_info', value: { phone: '+234 1', email: 'info@example.com', hours: 'Mon–Sat' }, ...ts },
    { _id: new ObjectId(), key: 'delivery_fee', value: 7500, ...ts },
  ],
  activities: [{ _id: new ObjectId(), user_id: ownerId, action: 'updated', resource_type: 'order', resource_id: String(orderId), description: 'x', ...ts }],
  newsletters: [{ _id: new ObjectId(), email: 'news@example.com', source: 'footer', status: 'subscribed', welcomed_at: t1, ...ts }],
  transactions: [{ _id: new ObjectId(), reference: 'MX-1-abcd', provider: 'squad', order_id: orderId, customer_email: 'ada@example.com', amount: 69000, status: 'success', metadata: { a: 1 }, paid_at: t1, ...ts }],
}

const mongo = new MongoClient(TEST_MONGODB_URI)
let passed = 0
const step = async (name, fn) => { await fn(); passed++; console.log('  ok', name) }
let server

try {
  await mongo.connect()
  const db = mongo.db()
  await db.dropDatabase()
  for (const [c, list] of Object.entries(docs)) await db.collection(c).insertMany(list)
  const total = Object.values(docs).reduce((n, l) => n + l.length, 0)

  await step('dry run validates everything and writes nothing', async () => {
    await query('DELETE FROM `users`')
    const r = runCopy('--dry-run', '--truncate')
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.match(r.stdout, /DRY RUN/)
    assert.equal(Number((await query('SELECT COUNT(*) n FROM users'))[0].n), 0)
  })

  await step('copy succeeds and every table matches', async () => {
    const r = runCopy('--truncate')
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.match(r.stdout, /Copy complete: every table matches/)
    let n = 0
    for (const t of ['users', 'products', 'orders', 'bulk_requests', 'appointments', 'messages', 'gallery', 'testimonials', 'team_members', 'settings', 'activity', 'newsletter', 'transactions']) {
      n += Number((await query(`SELECT COUNT(*) n FROM \`${t}\``))[0].n)
    }
    assert.equal(n, total)
  })

  await step('re-run is idempotent (upsert by id)', async () => {
    const r = runCopy()
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.equal(Number((await query('SELECT COUNT(*) n FROM orders'))[0].n), docs.orders.length)
  })

  server = createApp().listen(0)
  const base = `http://127.0.0.1:${server.address().port}/api`
  const call = async (method, p, body, tk) => {
    const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    return { status: res.status, body: await res.json() }
  }

  let token
  await step('staff log in with their existing passwords (bcrypt hashes copied)', async () => {
    const a = await call('POST', '/auth/login', { email: 'owner@example.com', password: ownerPw })
    assert.equal(a.status, 200); token = a.body.token
    assert.equal(a.body.user.id, String(ownerId)); assert.equal(a.body.user.role, 'owner')
    const b = await call('POST', '/auth/login', { email: 'staff@example.com', password: staffPw })
    assert.equal(b.status, 200); assert.equal(b.body.user.role, 'shop_manager')
    assert.equal((await call('POST', '/auth/login', { email: 'staff@example.com', password: 'nope' })).status, 401)
    const u = (await query('SELECT password_version FROM users WHERE id = ?', [String(ownerId)]))[0]
    assert.equal(u.password_version, 2)
  })

  await step('orders: ids, reference, items, notes, history, timestamps, assignment intact', async () => {
    const list = (await call('GET', '/orders', null, token)).body
    const o = list.find((x) => x.id === String(orderId))
    assert.ok(o)
    assert.equal(o.order_number, 'MX-ABC12345'); assert.equal(o.total, 69000); assert.equal(o.delivery_fee, 5000)
    assert.deepEqual(o.items, docs.orders[0].items)
    assert.equal(o.staff_notes[0].text, 'Called'); assert.equal(o.status_history.length, 2)
    assert.equal(o.status_history[1].created_at, t1.toISOString())
    assert.equal(o.created_at, t0.toISOString()); assert.equal(o.updated_at, t1.toISOString())
    assert.equal(o.assigned_to.full_name, 'Staff Two')
    const legacy = list.find((x) => x.order_number === 'MX-OLD1')
    assert.equal(legacy.status, 'shipped'); assert.equal(legacy.kind, 'order') // default applied like Mongoose
    assert.ok((await call('GET', '/orders?kind=order', null, token)).body.some((x) => x.order_number === 'MX-OLD1'))
  })

  await step('products, settings, content, references read back correctly', async () => {
    const all = (await call('GET', '/products', null, token)).body
    const b = all.find((x) => x.id === String(prodB))
    assert.equal(b.price, 68000.5); assert.equal(b.compare_price, 70000); assert.equal(b.status, 'draft')
    const pub = (await call('GET', '/products')).body
    assert.deepEqual(pub.map((x) => x.id), [String(prodA)])
    assert.deepEqual(pub[0].images, docs.products[0].images)
    const s = (await call('GET', '/settings')).body
    assert.deepEqual(s.contact_info, docs.settings[0].value); assert.equal(s.delivery_fee, 7500)
    const msg = (await call('GET', '/messages', null, token)).body[0]
    assert.equal(msg.message, 'Hello — ₦ naira ✓'); assert.equal(msg.replied_by.full_name, 'Owner One')
    const act = (await call('GET', '/activity', null, token)).body
    assert.ok(act.some((x) => x.profile?.full_name === 'Owner One'))
    const team = (await call('GET', '/team')).body
    assert.equal(team[0].profile_id, String(staffId))
    assert.equal((await call('GET', '/gallery?featured=true')).body.length, 1)
    assert.equal((await call('GET', '/testimonials')).body[0].client_name, 'Ms Christine Miner')
    const tx = (await call('GET', '/payments/transactions', null, token)).body[0]
    assert.equal(tx.order_id, String(orderId)); assert.deepEqual(tx.metadata, { a: 1 })
  })

  await step('unknown collections and fields are reported, invalid docs fail loudly', async () => {
    await db.collection('coupons').insertOne({ code: 'X' })
    await db.collection('products').updateOne({ _id: prodA }, { $set: { legacy_field: 1 } })
    await db.collection('orders').insertOne({ _id: new ObjectId(), customer_name: 'Bad', customer_email: 'b@x.co', status: 'teleported', ...ts })
    const r = runCopy()
    assert.equal(r.status, 1)
    assert.match(r.stdout, /UNKNOWN collections[\s\S]*coupons: 1/)
    assert.match(r.stdout, /products: UNKNOWN fields \(not copied\): legacy_field \(1\)/)
    assert.match(r.stdout, /orders: 1 document\(s\) FAILED[\s\S]*teleported/)
    const lenient = runCopy('--lenient')
    assert.equal(lenient.status, 0, lenient.stdout + lenient.stderr)
    assert.equal(Number((await query('SELECT COUNT(*) n FROM orders'))[0].n), docs.orders.length + 1)
  })

  console.log(`\n${passed} checks passed`)
} catch (e) {
  console.error('\nFAILED:', e.message)
  process.exitCode = 1
} finally {
  server?.close()
  await mongo.close()
  await closeDB()
}
