// Synthetic engine rehearsal only. No dotenv, production configuration or source database.
// Run against a dedicated portable instance: --isolated-port=33316 (10.11.16) or 33317 (10.6.18).
// Fresh randomly named schemas are retained for inspection; no existing schema is modified.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import mysql from 'mysql2/promise'
import { ObjectId, Decimal128 } from 'mongodb'
import * as models from '../src/models.js'
import { createMappings, runCopy, CopyBlockedError } from '../scripts/copy-core.js'
import { mariaDestination } from '../scripts/copy-adapters.js'
import { rehearsalProfile } from './rehearsal-profile.js'

let profile
try { profile = rehearsalProfile(process.argv.slice(2)) }
catch {
  console.error('Requires the explicit dedicated local fixture port; DATABASE_URL and env files are not used.')
  process.exit(1)
}
const config = { host: '127.0.0.1', port: profile.port, user: 'root', password: '', timezone: 'Z', charset: 'UTF8MB4_UNICODE_CI', connectTimeout: 3000 }
const administrative = await mysql.createConnection(config)
let runtime
try {
  const [[found]] = await administrative.query('SELECT VERSION() AS version, @@port AS port, @@datadir AS dataDir, @@sql_mode AS sqlMode, @@collation_server AS collation')
  runtime = found
  assert.equal(runtime.version, profile.version)
  assert.equal(Number(runtime.port), profile.port)
  assert.equal(runtime.dataDir.replaceAll('\\', '/').replace(/\/$/, '').toLowerCase(), 'c:/users/bgadz/deploy-infra/maxims-mariadb-20261006/' + profile.directory)
} catch (e) { await administrative.end(); throw e }
const mappings = createMappings(models)
const id = (n) => n.toString(16).padStart(24, '0')
// MariaDB/mysql2 can return a JSON expression as an object or JSON-column text.
const jsonValue = (value) => typeof value === 'string' ? JSON.parse(value) : value
const stamp = { created_at: new Date('2026-03-01T10:00:00.123Z'), updated_at: new Date('2026-03-02T11:30:00.456Z') }
const doc = (n, data) => ({ _id: new ObjectId(id(n)), ...stamp, ...data })
function fixtures() {
  return {
    users: [doc(1, { email: 'owner@example.invalid', password_hash: 'synthetic-only', full_name: 'Owner', role: 'owner', password_version: 2 })],
    products: [doc(2, { name: 'Lamp — ₦ ✓ 🛋️', slug: 'lamp', price: Decimal128.fromString('68000.50'), category: 'Lighting', images: ['https://example.invalid/lamp.jpg'] })],
    orders: [doc(3, { customer_name: 'Fixture', customer_email: 'customer@example.invalid', total: '69000.00', items: [{ product_id: new ObjectId(id(2)), qty: 2 }], staff_notes: [{ text: 'Fixture', created_at: stamp.updated_at }], status_history: [{ status: 'new', created_at: stamp.created_at }], assigned_to: new ObjectId(id(1)) })],
    bulkrequests: [doc(4, { company_name: 'Fixture', contact_name: 'Fixture', email: 'contact@example.invalid', quote_amount: '1500000.00' })],
    appointments: [doc(5, { client_name: 'Fixture', client_email: 'client@example.invalid', preferred_date: '2026-04-01', preferred_time: '10:00' })],
    messages: [doc(6, { full_name: 'Fixture', email: 'sender@example.invalid', message: 'Hello — ₦ ✓', replied_by: new ObjectId(id(1)) })],
    galleries: [doc(7, { title: 'Office', slug: 'office', category: 'Commercial', images: ['https://example.invalid/office.jpg'] })],
    testimonials: [doc(8, { client_name: 'Fixture', quote: 'Wonderful', rating: 5 })],
    teammembers: [doc(9, { full_name: 'Fixture', title: 'Designer', profile_id: new ObjectId(id(1)) })],
    settings: [doc(10, { key: 'contact_info', value: { address: 'Admin-edited address', hours: 'Mon–Sat', nested: { keep: [1, null, '✓'] } } })],
    activities: [doc(11, { user_id: new ObjectId(id(1)), action: 'updated', resource_type: 'order', resource_id: id(3) })],
    newsletters: [doc(12, { email: 'news@example.invalid', status: 'subscribed' })],
    transactions: [doc(13, { reference: 'MX-FIXTURE', order_id: new ObjectId(id(3)), customer_email: 'customer@example.invalid', amount: '69000.00', status: 'success', metadata: { nested: { b: 2, a: 1 } } })],
    blogposts: [doc(14, { title: 'Journal', slug: 'journal', content: '<p>Original HTML — 🛋️</p>', excerpt: 'Excerpt', tags: ['interiors'], cover_image: 'https://example.invalid/blog.jpg', status: 'published', published_at: stamp.created_at, seo_title: 'SEO', seo_description: 'Description', author_id: new ObjectId(id(1)), author_name: 'Owner', reading_minutes: 3 })],
  }
}
const sql = async (file) => (await fs.readFile(new URL('../sql/' + file, import.meta.url), 'utf8'))
  .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  .split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean)
const schemas = []
let passed = 0
async function apply(connection, files, rerun = false) {
  for (const file of files) for (const statement of await sql(file)) {
    try { await connection.query(statement) }
    catch (e) { if (!(rerun && /^ALTER\s+TABLE/i.test(statement) && [1060, 1061].includes(e.errno))) throw e }
  }
}
async function fresh(name, body) {
  const database = 'maxims_rehearsal_' + randomBytes(6).toString('hex')
  assert.match(database, /^maxims_rehearsal_[a-f0-9]{12}$/)
  // No IF NOT EXISTS: collisions halt rather than accepting somebody else's schema.
  await administrative.query('CREATE DATABASE `' + database + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  schemas.push({ case: name, schema: database })
  console.log(JSON.stringify({ case: name, schema: database, syntheticOnly: true }))
  const c = await mysql.createConnection({ ...config, database })
  try {
    await c.query("SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'")
    await apply(c, ['001-schema.sql', '002-blog.sql', '003-staff-invites.sql'])
    await body(c, database)
    passed++
    console.log('PASS ' + name)
  } catch (e) {
    console.error(JSON.stringify({ case: name, schema: database, error: e.code || e.name, syntheticOnly: true }))
    throw e
  } finally { await c.end() }
}
const count = async (c, table) => {
  assert.match(table, /^[a-z_]+$/)
  const [[r]] = await c.query('SELECT COUNT(*) AS n FROM `' + table + '`')
  return Number(r.n)
}
const empty = async (c) => { for (const m of mappings) assert.equal(await count(c, m.table), 0) }
const execute = (c, data = fixtures(), extra = {}) => runCopy({ mappings, source: { snapshot: async () => data }, destination: mariaDestination(c), ...extra })
try {
  await fresh('schema 001–003 rerun and plan is read-only', async (c) => {
    await apply(c, ['001-schema.sql', '002-blog.sql', '003-staff-invites.sql'], true)
    const r = await execute(c)
    assert.equal(r.canApply, true); assert.equal(r.equal, false)
    assert.equal(r.tables.reduce((n, t) => n + t.counts.missing, 0), 14)
    await empty(c)
  })
  await fresh('fourteen collections commit, independently reconcile and rerun writes zero', async (c, database) => {
    assert.equal((await execute(c, fixtures(), { apply: true })).equal, true)
    // A second connection must see COMMIT before another writer transaction starts.
    const reader = await mysql.createConnection({ ...config, database })
    try {
      assert.equal((await execute(reader)).equal, true)
      for (const m of mappings) assert.equal(await count(reader, m.table), 1)
      const [[row]] = await reader.query('SELECT items FROM orders')
      assert.deepEqual(jsonValue(row.items), [{ product_id: id(2), qty: 2 }])
      const [[blog]] = await reader.query('SELECT content, author_id, published_at FROM blog_posts')
      assert.equal(blog.content, '<p>Original HTML — 🛋️</p>'); assert.equal(blog.author_id, id(1))
      assert.equal(blog.published_at.toISOString(), stamp.created_at.toISOString())
      const [[product]] = await reader.query('SELECT price, created_at FROM products')
      assert.equal(product.price, '68000.50'); assert.equal(product.created_at.toISOString(), stamp.created_at.toISOString())
    } finally { await reader.end() }
    const destination = mariaDestination(c)
    destination.insert = () => { throw new Error('Identical rerun must never insert') }
    assert.equal((await runCopy({ mappings, source: { snapshot: async () => fixtures() }, destination, apply: true })).equal, true)
    const [[p]] = await c.query('SELECT price, name, created_at FROM products')
    assert.equal(p.price, '68000.50'); assert.equal(p.name, 'Lamp — ₦ ✓ 🛋️')
    assert.equal(p.created_at.toISOString(), stamp.created_at.toISOString())
    const [[b]] = await c.query('SELECT content, author_id FROM blog_posts')
    assert.equal(b.content, '<p>Original HTML — 🛋️</p>'); assert.equal(b.author_id, id(1))
  })
  await fresh('destination edit blocks copy and remains intact', async (c) => {
    await execute(c, fixtures(), { apply: true })
    await c.query('UPDATE users SET full_name=? WHERE id=?', ['Preserved edit', id(1)])
    await assert.rejects(execute(c, fixtures(), { apply: true }), CopyBlockedError)
    const [[u]] = await c.query('SELECT full_name FROM users WHERE id=?', [id(1)])
    assert.equal(u.full_name, 'Preserved edit')
  })
  await fresh('destination-only row blocks and survives', async (c) => {
    await c.query('INSERT INTO settings(id, `key`, value) VALUES (?, ?, ?)', [id(99), 'extra', JSON.stringify({ keep: true })])
    await assert.rejects(execute(c, fixtures(), { apply: true }), CopyBlockedError)
    assert.equal(await count(c, 'settings'), 1); assert.equal(await count(c, 'users'), 0)
  })
  await fresh('unknown Mongoose metadata blocks without insertion', async (c) => {
    const data = fixtures(); data.products[0].__v = 0
    await assert.rejects(execute(c, data, { apply: true }), CopyBlockedError)
    await empty(c)
  })
  await fresh('visible trigger blocks before insertion', async (c) => {
    await c.query('CREATE TRIGGER rehearsal_trigger BEFORE INSERT ON users FOR EACH ROW SET NEW.full_name=NEW.full_name')
    await assert.rejects(execute(c, fixtures(), { apply: true }), CopyBlockedError)
    await empty(c)
  })
  await fresh('non-InnoDB table blocks before insertion', async (c) => {
    await c.query('ALTER TABLE users ENGINE=MyISAM')
    await assert.rejects(execute(c, fixtures(), { apply: true }), CopyBlockedError)
    await empty(c)
  })
  await fresh('unexpected column blocks before insertion', async (c) => {
    await c.query('ALTER TABLE products ADD COLUMN unreviewed VARCHAR(20)')
    await assert.rejects(execute(c, fixtures(), { apply: true }), CopyBlockedError)
    await empty(c)
  })
  await fresh('late natural-key collision rolls back earlier inserts', async (c) => {
    const data = fixtures(); data.products.push(doc(20, { name: 'Duplicate', slug: 'lamp', price: '1.00', category: 'Fixture' }))
    await assert.rejects(execute(c, data, { apply: true }), (e) => e.errno === 1062)
    await empty(c)
  })
  await fresh('late transaction reference collision rolls back twelve earlier tables', async (c) => {
    const data = fixtures()
    data.transactions.push(doc(29, { reference: 'MX-FIXTURE', order_id: new ObjectId(id(3)), customer_email: 'other@example.invalid', amount: '1.00', status: 'success' }))
    await assert.rejects(execute(c, data, { apply: true }), (e) => e.errno === 1062)
    await empty(c)
  })
  await fresh('case-insensitive slug collision rolls back', async (c) => {
    const data = fixtures(); data.products.push(doc(20, { name: 'Duplicate', slug: 'LAMP', price: '1.00', category: 'Fixture' }))
    await assert.rejects(execute(c, data, { apply: true }), (e) => e.errno === 1062)
    await empty(c)
  })
  for (const [first, second] of [['resume', 'résumé'], ['lamp', 'lamp ']]) await fresh('accent/trailing-space natural-key collision rolls back: ' + first, async (c) => {
    const data = fixtures(); data.products[0].slug = first
    data.products.push(doc(20, { name: 'Duplicate', slug: second, price: '1.00', category: 'Fixture' }))
    await assert.rejects(execute(c, data, { apply: true }), (e) => e.errno === 1062)
    await empty(c)
  })
  await fresh('strict string truncation rolls back instead of losing values', async (c) => {
    const data = fixtures(); data.products[0].name = 'x'.repeat(256)
    await assert.rejects(execute(c, data, { apply: true }), (e) => e.errno === 1406)
    await empty(c)
  })
  await fresh('verification/report callback failure rolls back', async (c) => {
    await assert.rejects(execute(c, fixtures(), { apply: true, onVerified: async () => { throw new Error('fixture report failure') } }), /fixture report failure/)
    await empty(c)
  })
  await fresh('observed source drift rolls back every table', async (c) => {
    let reads = 0
    const source = { snapshot: async () => { const data = fixtures(); if (reads++) data.products[0].name = 'Changed'; return data } }
    await assert.rejects(runCopy({ mappings, source, destination: mariaDestination(c), apply: true }), CopyBlockedError)
    await empty(c)
  })
  await fresh('empty collection disappearing blocks and rolls back', async (c) => {
    let reads = 0
    const source = { snapshot: async () => { const data = fixtures(); data.blogposts = []; if (reads++) delete data.blogposts; return data } }
    await assert.rejects(runCopy({ mappings, source, destination: mariaDestination(c), apply: true }), CopyBlockedError)
    await empty(c)
  })
  await fresh('explicit null timestamps block without insertion', async (c) => {
    const data = fixtures(); data.products[0].created_at = null
    await assert.rejects(execute(c, data, { apply: true }), CopyBlockedError)
    await empty(c)
  })
  await fresh('explicit null non-nullable SQL field rolls back earlier inserts', async (c) => {
    // stock_qty is model-optional but SQL NOT NULL: exercise the actual SQL failure.
    // A null required category is rejected earlier by model validation, not by SQL.
    const data = fixtures(); data.products[0].stock_qty = null
    await assert.rejects(execute(c, data, { apply: true }), (e) => e.errno === 1048)
    await empty(c)
  })
  await fresh('locked read blocks updates and phantom inserts until release', async (c, database) => {
    const data = fixtures(); data.settings = []
    await execute(c, data, { apply: true })
    const other = await mysql.createConnection({ ...config, database })
    try {
      await other.query('SET SESSION innodb_lock_wait_timeout=1')
      await mariaDestination(c).transaction(async () => {
        await mariaDestination(c).snapshot(mappings, { lock: true })
        await assert.rejects(other.query('UPDATE users SET full_name=? WHERE id=?', ['Blocked writer', id(1)]), (e) => e.errno === 1205)
        await assert.rejects(other.query('INSERT INTO settings(id, `key`, value) VALUES (?, ?, ?)', [id(30), 'gap-fixture', '{}']), (e) => e.errno === 1205)
        await assert.rejects(other.query('INSERT INTO products(id,name,slug,price,category) VALUES (?, ?, ?, ?, ?)', [id(31), 'Fixture', 'new-gap-fixture', '1.00', 'Fixture']), (e) => e.errno === 1205)
      })
      assert.equal((await execute(c, data)).equal, true)
      // The same inserts can proceed only after the copy transaction releases locks.
      await other.query('INSERT INTO settings(id, `key`, value) VALUES (?, ?, ?)', [id(30), 'gap-fixture', '{}'])
      await other.query('INSERT INTO products(id,name,slug,price,category) VALUES (?, ?, ?, ?, ?)', [id(31), 'Fixture', 'new-gap-fixture', '1.00', 'Fixture'])
      assert.equal(await count(c, 'settings'), 1); assert.equal(await count(c, 'products'), 2)
    } finally { await other.end() }
  })
  const cases = [
    ['existing', { address: 'Admin edited', hours: 'Keep' }, false],
    ['blank', { address: '', hours: 'Keep' }, false],
    ['whitespace', { address: '  ', hours: 'Keep' }, false],
    ['property null', { address: null, hours: 'Keep' }, false],
    ['missing property', { hours: 'Keep' }, true],
    ['SQL null', undefined, true],
    ['JSON null', null, false],
    ['array', ['Keep'], false],
    ['scalar', 'Keep', false],
  ]
  for (const [label, value, fill] of cases) await fresh('004 preserves ' + label + ' and reruns safely', async (c) => {
    const original = value === undefined ? null : JSON.stringify(value)
    await c.query('INSERT INTO settings(id, `key`, value) VALUES (?, ?, ?)', [id(10), 'contact_info', original])
    await apply(c, ['004-site-address.sql'])
    // CAST requests JSON text even when mysql2 otherwise decodes JSON string scalars.
    const [[row]] = await c.query('SELECT CAST(value AS CHAR) AS value, JSON_TYPE(value) AS jsonType, updated_at FROM settings WHERE id=?', [id(10)])
    if (fill) {
      const parsed = jsonValue(row.value)
      assert.equal(parsed.address, 'No. 8 Oke Agbe Street, Garki 2, Abuja, FCT')
      if (value) assert.equal(parsed.hours, value.hours)
    } else {
      assert.deepEqual(jsonValue(row.value), value)
      if (label === 'JSON null') assert.equal(row.jsonType, 'NULL')
    }
    await apply(c, ['004-site-address.sql'])
    const [[again]] = await c.query('SELECT CAST(value AS CHAR) AS value, JSON_TYPE(value) AS jsonType, updated_at FROM settings WHERE id=?', [id(10)])
    assert.deepEqual(again, row)
    assert.equal(await count(c, 'schema_migrations'), 1)
  })
  await fresh('004 absent contact creates exactly one row', async (c) => {
    await apply(c, ['004-site-address.sql']); await apply(c, ['004-site-address.sql'])
    assert.equal(await count(c, 'settings'), 1)
    const [[row]] = await c.query('SELECT value FROM settings')
    assert.equal(jsonValue(row.value).address, 'No. 8 Oke Agbe Street, Garki 2, Abuja, FCT')
  })
  await fresh('004 fixed-ID collision halts without replacing unrelated row', async (c) => {
    const value = JSON.stringify({ preserve: true })
    await c.query('INSERT INTO settings(id, `key`, value) VALUES (?, ?, ?)', ['000000000000000000000004', 'unrelated', value])
    await assert.rejects(apply(c, ['004-site-address.sql']), (e) => e.errno === 1062)
    const [[row]] = await c.query('SELECT `key`, value FROM settings')
    assert.equal(row.key, 'unrelated'); assert.deepEqual(jsonValue(row.value), { preserve: true })
    assert.equal(await count(c, 'schema_migrations'), 0)
  })
  console.log(JSON.stringify({ passed, runtime, testSessionSqlMode: 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION', syntheticOnly: true, source: 'in-memory BSON fixtures, not MongoDB', schemasRetained: schemas }))
} finally { await administrative.end() }
