// Offline fixtures only: no env, sockets, database credentials or destructive test setup.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { ObjectId, Decimal128, Long } from 'mongodb'
import * as models from '../src/models.js'
import { createMappings, decimal, prepareDocument, planCopy, runCopy, CopyBlockedError } from '../scripts/copy-core.js'
import { mariaDestination, mongoSource } from '../scripts/copy-adapters.js'
import { parseArgs, persistReport } from '../scripts/copy-from-mongo.js'

const mappings = createMappings(models)
const get = (name) => mappings.find((m) => m.collection === name)
const id = (n) => n.toString(16).padStart(24, '0')
const stamp = { created_at: new Date('2026-03-01T10:00:00.123Z'), updated_at: new Date('2026-03-02T11:30:00.456Z') }
const doc = (n, data) => ({ _id: new ObjectId(id(n)), ...stamp, ...data })
const fixtures = () => ({
  users: [doc(1, { email: 'owner@example.invalid', password_hash: 'private-fixture-hash', full_name: 'Owner', role: 'owner', password_version: 2 })],
  products: [doc(2, { name: 'Product', slug: 'product', price: Decimal128.fromString('68000.50'), category: 'Lighting' })],
  orders: [doc(3, { customer_name: 'Customer', customer_email: 'customer@example.invalid', total: 69000, items: [{ product_id: new ObjectId(id(2)), price: 32000, qty: 2 }], staff_notes: [{ text: 'Called', created_at: stamp.updated_at }], status_history: [{ status: 'new', created_at: stamp.created_at }], assigned_to: new ObjectId(id(1)) })],
  bulkrequests: [doc(4, { company_name: 'Company', contact_name: 'Contact', email: 'contact@example.invalid', quote_amount: '1500000.00' })],
  appointments: [doc(5, { client_name: 'Client', client_email: 'client@example.invalid', preferred_date: '2026-04-01', preferred_time: '10:00' })],
  messages: [doc(6, { full_name: 'Sender', email: 'sender@example.invalid', message: 'Hello — ₦ ✓', replied_by: new ObjectId(id(1)) })],
  galleries: [doc(7, { title: 'Office', slug: 'office', category: 'Commercial', images: ['https://example.invalid/office.jpg'] })],
  testimonials: [doc(8, { client_name: 'Client', quote: 'Wonderful', rating: 5 })],
  teammembers: [doc(9, { full_name: 'Designer', title: 'Designer', profile_id: new ObjectId(id(1)) })],
  settings: [doc(10, { key: 'contact_info', value: { address: 'Admin-edited address', hours: 'Mon–Sat' } })],
  activities: [doc(11, { user_id: new ObjectId(id(1)), action: 'updated', resource_type: 'order', resource_id: id(3) })],
  newsletters: [doc(12, { email: 'news@example.invalid', status: 'subscribed' })],
  transactions: [doc(13, { reference: 'MX-FIXTURE', order_id: new ObjectId(id(3)), customer_email: 'customer@example.invalid', amount: '69000.00', status: 'success', metadata: { nested: { b: 2, a: 1 } } })],
  blogposts: [doc(14, { title: 'Journal', slug: 'journal', content: '<p>Original HTML</p>', excerpt: 'Excerpt', tags: ['interiors'], cover_image: 'https://example.invalid/blog.jpg', status: 'published', published_at: stamp.created_at, seo_title: 'SEO', seo_description: 'Description', author_id: new ObjectId(id(1)), author_name: 'Owner', reading_minutes: 3 })],
})
const rowsFor = (source) => Object.fromEntries(mappings.map((m) => [m.table, (source[m.collection] || []).map((d) => prepareDocument(m, d).row)]))

class FakeDestination {
  constructor(rows = {}, options = {}) { this.rows = structuredClone(rows); this.options = options; this.writes = 0; this.commits = 0; this.rollbacks = 0; this.reads = 0 }
  async snapshot() { this.reads++; return { rows: structuredClone(this.rows), errors: this.options.schemaErrors || [] } }
  async insert(mapping, row) {
    this.writes++
    if (this.options.failAt === this.writes) throw new Error('fake constraint failure')
    const list = this.rows[mapping.table] ||= []
    const unique = { users: 'email', products: 'slug', orders: 'order_number', settings: 'key', newsletter: 'email', transactions: 'reference', blog_posts: 'slug', gallery: 'slug' }[mapping.table]
    if (list.some((r) => r.id === row.id || (unique && row[unique] != null && r[unique] === row[unique]))) throw new Error('fake duplicate key')
    list.push(structuredClone(this.options.corrupt ? { ...row, full_name: 'changed' } : row))
  }
  async transaction(work) {
    const before = structuredClone(this.rows)
    try { const result = await work(); this.commits++; return result }
    catch (e) { this.rows = before; this.rollbacks++; throw e }
  }
}
const execute = (documents, destination, extra = {}) => runCopy({ mappings, source: { snapshot: async () => documents }, destination, ...extra })
const block = async (documents, destination, extra = {}) => {
  await assert.rejects(execute(documents, destination, extra), CopyBlockedError)
}

test('mapping includes every current model and every blog column', () => {
  assert.equal(mappings.length, 14)
  const blog = get('blogposts')
  assert.equal(blog.table, 'blog_posts')
  assert.deepEqual(Object.keys(blog.model.fields), ['title', 'slug', 'excerpt', 'content', 'cover_image', 'tags', 'status', 'published_at', 'seo_title', 'seo_description', 'author_id', 'author_name', 'reading_minutes'])
  assert.throws(() => createMappings({ ...models, NewModel: { table: 'new_table', toRow() {} } }), /unmapped_model/)
})
test('default plan performs no inserts or transactions across all fourteen fixtures', async () => {
  const destination = new FakeDestination()
  const result = await execute(fixtures(), destination)
  assert.equal(result.canApply, true); assert.equal(result.equal, false)
  assert.equal(destination.writes, 0); assert.equal(destination.commits, 0)
  assert.equal(result.tables.reduce((n, t) => n + t.counts.missing, 0), 14)
})
test('apply inserts and canonically reconciles all fields, then reruns without writing', async () => {
  const destination = new FakeDestination()
  const result = await execute(fixtures(), destination, { apply: true })
  assert.equal(result.equal, true); assert.equal(result.status, 'reconciled'); assert.equal(destination.commits, 1)
  assert.equal(destination.writes, 14)
  const blog = destination.rows.blog_posts[0]
  assert.equal(blog.content, '<p>Original HTML</p>'); assert.equal(blog.author_id, id(1))
  assert.equal(blog.published_at.toISOString(), stamp.created_at.toISOString())
  assert.equal((await execute(fixtures(), destination, { apply: true })).equal, true)
  assert.equal(destination.writes, 14)
})
test('one conflict prevents every insert, including otherwise missing tables', async () => {
  const source = fixtures(), rows = rowsFor(source)
  rows.users[0].full_name = 'Admin edit'
  const destination = new FakeDestination({ users: rows.users })
  await block(source, destination, { apply: true })
  assert.equal(destination.writes, 0); assert.equal(destination.rollbacks, 1)
  assert.equal(destination.rows.users[0].full_name, 'Admin edit')
})
test('destination-only rows block apply and remain intact', async () => {
  const source = fixtures(), rows = rowsFor(source)
  rows.users.push({ ...rows.users[0], id: id(100), email: 'other@example.invalid' })
  const destination = new FakeDestination(rows)
  await block(source, destination, { apply: true })
  assert.equal(destination.rows.users.length, 2); assert.equal(destination.writes, 0)
})
test('unknown collections, including empty and system collections, halt all writes', async () => {
  for (const name of ['coupons', 'system.views', 'blog_posts']) {
    const destination = new FakeDestination()
    await block({ ...fixtures(), [name]: [] }, destination, { apply: true })
    assert.equal(destination.writes, 0)
  }
})
test('unknown fields and Mongoose __v halt; no silent metadata stripping', async () => {
  for (const field of ['legacy_field', '__v']) {
    const source = fixtures(); source.products[0][field] = 'must not be lost'
    const destination = new FakeDestination()
    await block(source, destination, { apply: true }); assert.equal(destination.writes, 0)
  }
})
test('reports include every field, nested differences and digests without source values', () => {
  const source = fixtures(), rows = rowsFor(source)
  const items = JSON.parse(rows.orders[0].items); items[0].qty = 3; rows.orders[0].items = JSON.stringify(items)
  rows.users[0].password_hash = 'different-private-fixture-hash'
  const report = planCopy(mappings, source, rows).report
  const order = report.tables.find((t) => t.table === 'orders').rows[0]
  assert.ok(order.differingPaths.includes('/items/0/qty'))
  assert.equal(order.fields.length, Object.keys(models.Order.fields).length + 3)
  assert.match(order.sourceDigest, /^[a-f0-9]{64}$/)
  assert.ok(!JSON.stringify(report).includes('private-fixture-hash'))
  assert.ok(!JSON.stringify(report).includes('Original HTML'))
  assert.equal(report.canApply, false)
})
test('canonical comparison accepts decimal/boolean/UTC representations and object key order', () => {
  const source = fixtures(), rows = rowsFor(source)
  rows.products[0].price = '68000.5000'; rows.products[0].is_featured = false
  rows.products[0].created_at = '2026-03-01 10:00:00.123'
  rows.transactions[0].metadata = '{"nested":{"a":1,"b":2}}'
  assert.equal(planCopy(mappings, source, rows).report.equal, true)
})
test('array order, timestamps, references and blog fields are reconciled, not just IDs', () => {
  for (const [table, field, value] of [['blog_posts', 'content', 'Changed HTML'], ['blog_posts', 'author_id', id(999)], ['blog_posts', 'published_at', new Date('2026-01-01T00:00:00Z')], ['orders', 'staff_notes', '[]']]) {
    const source = fixtures(), rows = rowsFor(source); rows[table][0][field] = value
    const report = planCopy(mappings, source, rows).report
    assert.equal(report.canApply, false)
    assert.ok(report.tables.find((t) => t.table === table).rows[0].differingPaths.some((p) => p === '/' + field || p.startsWith('/' + field + '/')))
  }
  const source = fixtures(); source.blogposts[0].tags = ['a', 'b']; const rows = rowsFor(source); rows.blog_posts[0].tags = '["b","a"]'
  assert.equal(planCopy(mappings, source, rows).report.canApply, false)
})
test('precision loss, unsafe BSON, invalid coercions and undefined JSON are blocked', () => {
  for (const [collection, field, value] of [
    ['products', 'price', '1.001'], ['products', 'price', '1000000000000.00'],
    ['products', 'stock_qty', 1.5], ['products', 'is_featured', 'yes'],
    ['products', 'tags', [undefined]], ['products', 'tags', [Decimal128.fromString('1.5')]],
    ['products', 'stock_qty', Long.fromString('9007199254740993')],
    ['users', 'email', 'OWNER@example.invalid'], ['orders', 'assigned_to', { id: id(1), full_name: 'must not be lost' }],
  ]) {
    const source = fixtures(); source[collection][0][field] = value
    assert.equal(planCopy(mappings, source, {}).report.canApply, false, collection + '.' + field)
  }
  assert.equal(decimal('-0.00'), '0.00'); assert.equal(decimal('1.2300'), '1.23')
})
test('unknown destination fields, missing columns and schema errors block apply', async () => {
  const source = fixtures()
  for (const mutate of [(rows) => { rows.users[0].future_field = 'existing' }, (rows) => { delete rows.users[0].password_hash }]) {
    const rows = rowsFor(source); mutate(rows)
    const destination = new FakeDestination(rows); await block(source, destination, { apply: true }); assert.equal(destination.writes, 0)
  }
  const destination = new FakeDestination({}, { schemaErrors: [{ code: 'requires_innodb', table: 'users' }] })
  await block(source, destination, { apply: true }); assert.equal(destination.writes, 0)
})
test('duplicate source IDs and conflicting identity/timestamp aliases halt', () => {
  const source = fixtures(); source.users.push(source.users[0])
  assert.equal(planCopy(mappings, source, {}).report.canApply, false)
  source.users = [source.users[0]]; source.users[0].id = id(999)
  assert.equal(planCopy(mappings, source, {}).report.canApply, false)
  delete source.users[0].id; source.users[0].createdAt = new Date('2020-01-01T00:00:00Z')
  assert.equal(planCopy(mappings, source, {}).report.canApply, false)
})
test('natural-key collision with another ID fails and rolls back earlier inserts', async () => {
  const source = fixtures(); source.users.push(doc(15, { ...source.users[0], _id: new ObjectId(id(15)) }))
  const destination = new FakeDestination()
  await assert.rejects(execute(source, destination, { apply: true }), /duplicate key/)
  assert.deepEqual(destination.rows, {}); assert.equal(destination.rollbacks, 1); assert.equal(destination.commits, 0)
})
test('constraint failures and post-insert field drift roll back the complete copy', async () => {
  for (const options of [{ failAt: 5 }, { corrupt: true }]) {
    const destination = new FakeDestination({}, options)
    await assert.rejects(execute(fixtures(), destination, { apply: true }))
    assert.deepEqual(destination.rows, {}); assert.equal(destination.commits, 0); assert.equal(destination.rollbacks, 1)
  }
})
test('failure to persist the plan prevents any inserts', async () => {
  const destination = new FakeDestination()
  await assert.rejects(execute(fixtures(), destination, { apply: true, onPlan: async () => { throw new Error('report unavailable') } }), /report unavailable/)
  assert.equal(destination.writes, 0); assert.equal(destination.rollbacks, 1)
})
test('source changes observed before commit roll back the complete copy', async () => {
  const source = fixtures(), destination = new FakeDestination()
  let reads = 0
  await assert.rejects(runCopy({ mappings, source: { snapshot: async () => {
    reads++
    if (reads === 2) return { ...source, blogposts: [{ ...source.blogposts[0], title: 'Changed during copy' }] }
    return source
  } }, destination, apply: true }), CopyBlockedError)
  assert.equal(destination.commits, 0); assert.equal(destination.rollbacks, 1); assert.deepEqual(destination.rows, {})
})

for (const change of ['disappearance', 'addition']) {
  test(`known empty collection ${change} blocks verification and rolls back every insert`, async () => {
    for (const mapping of mappings) {
      const initial = fixtures(), latest = fixtures()
      initial[mapping.collection] = []; latest[mapping.collection] = []
      if (change === 'disappearance') delete latest[mapping.collection]
      else delete initial[mapping.collection]
      // Keep an identical existing row too: rollback must preserve it, not clear everything.
      const retained = get(mapping.collection === 'users' ? 'products' : 'users')
      const original = { [retained.table]: rowsFor(initial)[retained.table] }
      const destination = new FakeDestination(original)
      let reads = 0, verified = 0
      await assert.rejects(runCopy({ mappings, source: { snapshot: async () => ++reads === 1 ? initial : latest }, destination, apply: true,
        onVerified: async () => { verified++ },
      }), (e) => {
        assert.ok(e instanceof CopyBlockedError)
        assert.equal(e.report.status, 'blocked'); assert.equal(e.report.canApply, false); assert.equal(e.report.equal, false)
        assert.ok(e.report.errors.some((error) => error.code === 'source_collection_presence_drift' && error.collection === mapping.collection))
        assert.ok(!JSON.stringify(e.report).includes('private-fixture-hash'))
        return true
      })
      assert.equal(reads, 2); assert.equal(verified, 0)
      assert.ok(destination.writes > 0); assert.equal(destination.commits, 0); assert.equal(destination.rollbacks, 1)
      assert.deepEqual(destination.rows, original)
    }
  })
}

test('collection presence is captured before a source adapter mutates its original snapshot object', async () => {
  const source = fixtures(), destination = new FakeDestination()
  source.blogposts = []
  let reads = 0
  await assert.rejects(runCopy({ mappings, source: { snapshot: async () => {
    if (++reads === 2) delete source.blogposts
    return source
  } }, destination, apply: true }), (e) => e instanceof CopyBlockedError && e.report.errors.some((error) => error.code === 'source_collection_presence_drift' && error.collection === 'blogposts'))
  assert.ok(destination.writes > 0); assert.equal(destination.commits, 0); assert.equal(destination.rollbacks, 1)
  assert.deepEqual(destination.rows, {})
})

for (const present of [true, false]) {
  test(`unchanged ${present ? 'present empty' : 'absent'} known collection permits verified apply`, async () => {
    const source = fixtures(), destination = new FakeDestination()
    if (present) source.blogposts = []
    else delete source.blogposts
    let reads = 0, verified = 0
    const result = await runCopy({ mappings, source: { snapshot: async () => { reads++; return { ...source } } }, destination, apply: true,
      onVerified: async (report) => { verified++; assert.equal(report.equal, true) },
    })
    assert.equal(result.equal, true); assert.equal(reads, 2); assert.equal(verified, 1)
    assert.equal(result.tables.find((t) => t.collection === 'blogposts').sourcePresent, present)
    assert.equal(destination.writes, 13); assert.equal(destination.commits, 1); assert.equal(destination.rollbacks, 0)
  })
}
test('failure to persist verified field reconciliation prevents commit', async () => {
  const destination = new FakeDestination()
  await assert.rejects(execute(fixtures(), destination, { apply: true, onVerified: async () => { throw new Error('verification report unavailable') } }), /verification report unavailable/)
  assert.equal(destination.commits, 0); assert.equal(destination.rollbacks, 1); assert.deepEqual(destination.rows, {})
})
test('CLI is plan-only by default and rejects every destructive/partial bypass flag', () => {
  assert.deepEqual(parseArgs(['--report=fixture.json']), { mode: 'plan', report: 'fixture.json' })
  for (const args of [[], ['--truncate', '--report=x'], ['--lenient', '--report=x'], ['--only=users', '--report=x'], ['--apply', '--dry-run', '--report=x'], ['--overwrite', '--report=x']]) assert.throws(() => parseArgs(args))
})

test('report persistence completes partial UTF-8 writes before syncing, and rejects stalled writes', async () => {
  const chunks = [], calls = [], report = { status: 'planned', fixture: 'Unicode — ₦ ✓' }
  const file = {
    truncate: async (size) => calls.push(['truncate', size]),
    write: async (bytes, offset, length, position) => {
      assert.equal(position, offset)
      const bytesWritten = Math.min(length, 7)
      chunks.push(bytes.subarray(offset, offset + bytesWritten))
      return { bytesWritten }
    },
    sync: async () => calls.push(['sync']),
  }
  await persistReport(file, report)
  assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString('utf8')), report)
  assert.deepEqual(calls, [['truncate', 0], ['sync']])
  calls.length = 0; file.write = async () => ({ bytesWritten: 0 })
  await assert.rejects(persistReport(file, report), (e) => e.code === 'report_write_incomplete')
  assert.deepEqual(calls, [['truncate', 0]])
})

test('Mongo adapter uses read APIs only, recognises unknown names and caps reads', async () => {
  const calls = []
  const db = { listCollections: () => ({ toArray: async () => [{ name: 'blogposts' }, { name: 'unknown' }] }), collection: (name) => ({ find: () => ({ limit: (limit) => ({ toArray: async () => { calls.push({ name, limit }); return fixtures().blogposts } }) }) }) }
  const source = await mongoSource(db, mappings).snapshot()
  assert.equal(source.blogposts.length, 1); assert.deepEqual(source.unknown, []); assert.deepEqual(calls, [{ name: 'blogposts', limit: 10001 }])
  await assert.rejects(mongoSource(db, mappings, 0).snapshot(), /source_row_limit/)
})
test('Maria adapter is insert-only and transactions commit or roll back explicitly', async () => {
  const calls = []
  const connection = { query: async (sql, params) => { calls.push({ sql, params }); return [[]] }, beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'), rollback: async () => calls.push('rollback') }
  const adapter = mariaDestination(connection)
  await adapter.transaction(async () => adapter.insert(get('users'), prepareDocument(get('users'), fixtures().users[0]).row))
  assert.equal(calls[0].sql, 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE'); assert.equal(calls.at(-1), 'commit')
  const insert = calls.find((c) => c.sql?.startsWith('INSERT'))
  assert.ok(!/UPDATE|IGNORE|REPLACE|DELETE|TRUNCATE/.test(insert.sql)); assert.ok(insert.params.includes('private-fixture-hash'))
  await assert.rejects(adapter.transaction(async () => { throw new Error('fixture failure') }))
  assert.equal(calls.at(-1), 'rollback')
})
test('Maria metadata/read adapter catches engine, column drift and row limits', async () => {
  const mapping = get('users'), row = prepareDocument(mapping, fixtures().users[0]).row, calls = []
  let engine = 'InnoDB', extra = false, count = 1, triggers = []
  const connection = { query: async (q) => {
    calls.push(q)
    if (q.sql.startsWith('SHOW TABLE')) return [[{ Engine: engine }]]
    if (q.sql.startsWith('SHOW TRIGGERS')) return [triggers]
    if (q.sql.startsWith('SHOW COLUMNS')) return [[...Object.keys(row).map((Field) => ({ Field })), ...(extra ? [{ Field: 'future_column' }] : [])]]
    return [Array(count).fill(row)]
  } }
  const adapter = mariaDestination(connection, 1)
  assert.equal((await adapter.snapshot([mapping], { lock: true })).errors.length, 0)
  assert.ok(calls.some((q) => q.sql.endsWith('FOR UPDATE')))
  const typeCast = calls[0].typeCast; assert.equal(typeCast({ type: 'NEWDECIMAL', string: () => '1.23' }, () => 'bad'), '1.23')
  engine = 'MyISAM'; assert.equal((await adapter.snapshot([mapping])).errors[0].code, 'requires_innodb')
  engine = 'InnoDB'; extra = true; assert.equal((await adapter.snapshot([mapping])).errors[0].code, 'schema_column_mismatch')
  extra = false; count = 2; await assert.rejects(adapter.snapshot([mapping]), /destination_row_limit/)
  count = 1; triggers = [{ Trigger: 'fixture trigger' }]; assert.equal((await adapter.snapshot([mapping])).errors[0].code, 'unreviewed_triggers')
})
test('lost commit acknowledgement and failed rollback are reported as unknown outcomes', async () => {
  const connection = { query: async () => [[]], beginTransaction: async () => {}, commit: async () => { throw new Error('lost acknowledgement') }, rollback: async () => {} }
  await assert.rejects(mariaDestination(connection).transaction(async () => ({})), (e) => e.code === 'commit_outcome_unknown')
  connection.rollback = async () => { throw new Error('rollback unavailable') }
  await assert.rejects(mariaDestination(connection).transaction(async () => { throw new Error('fixture failure') }), (e) => e.code === 'rollback_outcome_unknown')
})
test('invalid dates, fractional timestamps and explicit null source identity are refused', () => {
  for (const value of ['2026-02-30T00:00:00Z', '2026-03-01T00:00:00.1234Z', '2026-03-01']) {
    const source = fixtures(); source.users[0].created_at = value
    assert.equal(planCopy(mappings, source, {}).report.canApply, false)
  }
  const source = fixtures(); source.users[0]._id = null; source.users[0].id = id(1)
  assert.equal(planCopy(mappings, source, {}).report.canApply, false)
})

for (const [field, other] of [['created_at', 'createdAt'], ['createdAt', 'created_at'], ['updated_at', 'updatedAt'], ['updatedAt', 'updated_at']]) {
  test(`explicit null ${field} blocks all inserts, even alongside a populated alias`, async () => {
    for (const partner of ['absent', 'valid', 'null']) {
      const source = fixtures(), document = source.users[0], destination = new FakeDestination()
      delete document[field]; delete document[other]
      document[field] = null
      if (partner === 'valid') document[other] = stamp[field.startsWith('created') ? 'created_at' : 'updated_at']
      if (partner === 'null') document[other] = null
      await assert.rejects(execute(source, destination, { apply: true }), (e) => {
        assert.ok(e instanceof CopyBlockedError)
        assert.ok(e.report.errors.some((error) => error.collection === 'users' && error.code === 'null_timestamp'))
        return true
      })
      assert.equal(destination.writes, 0); assert.equal(destination.commits, 0); assert.equal(destination.rollbacks, 1)
      assert.deepEqual(destination.rows, {})
    }
  })
}

for (const [field, alias] of [['created_at', 'createdAt'], ['updated_at', 'updatedAt']]) {
  test(`conflicting non-null ${field}/${alias} aliases halt`, () => {
    const source = fixtures(); source.users[0][alias] = new Date('2020-01-01T00:00:00Z')
    const report = planCopy(mappings, source, {}).report
    assert.equal(report.canApply, false)
    assert.ok(report.errors.some((error) => error.code === 'conflicting_timestamp_alias' && error.field === field))
  })
  test(`equal or single populated ${field}/${alias} aliases preserve UTC timestamps`, () => {
    const document = fixtures().users[0], expected = stamp[field].toISOString()
    document[alias] = expected
    let prepared = prepareDocument(get('users'), document)
    assert.equal(prepared.row[field].toISOString(), expected); assert.ok(!prepared.defaulted.includes(field))
    delete document[field]
    prepared = prepareDocument(get('users'), document)
    assert.equal(prepared.row[field].toISOString(), expected); assert.ok(!prepared.defaulted.includes(field))
  })
}

test('truly absent timestamp aliases retain ObjectId/creation fallbacks and default reporting', () => {
  const document = fixtures().users[0]
  for (const field of ['created_at', 'createdAt', 'updated_at', 'updatedAt']) delete document[field]
  const prepared = prepareDocument(get('users'), document)
  assert.equal(prepared.row.created_at.toISOString(), document._id.getTimestamp().toISOString())
  assert.equal(prepared.row.updated_at.toISOString(), prepared.row.created_at.toISOString())
  assert.ok(prepared.defaulted.includes('created_at')); assert.ok(prepared.defaulted.includes('updated_at'))
})

test('null timestamp appearing in the second source snapshot blocks verification and rolls back', async () => {
  const source = fixtures(), destination = new FakeDestination()
  let reads = 0, verified = 0
  await assert.rejects(runCopy({ mappings, source: { snapshot: async () => {
    if (++reads === 1) return source
    return { ...source, users: [{ ...source.users[0], updatedAt: null }] }
  } }, destination, apply: true, onVerified: async () => { verified++ } }), (e) => e instanceof CopyBlockedError && e.report.errors.some((error) => error.code === 'null_timestamp'))
  assert.equal(reads, 2); assert.equal(verified, 0); assert.equal(destination.writes, 14)
  assert.equal(destination.commits, 0); assert.equal(destination.rollbacks, 1); assert.deepEqual(destination.rows, {})
})
test('offline suite never initialises a database pool', () => {
  assert.equal(globalThis.__maximsPool, undefined)
})

// This evaluates the actual SQL guard over fake JSON fixtures. It is not a SQL engine.
const sql = fs.readFileSync(new URL('../sql/004-site-address.sql', import.meta.url), 'utf8')
const statements = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean)
const update = statements.find((s) => s.startsWith('UPDATE'))
const insert = statements.find((s) => s.startsWith('INSERT INTO `settings`'))
const SQL_NULL = Symbol('SQL NULL')
function actualGuard(value) {
  const predicate = update.slice(update.indexOf('AND (') + 4, update.indexOf('AND NOT EXISTS')).trim()
  const object = value !== SQL_NULL && value !== null && typeof value === 'object' && !Array.isArray(value)
  const expression = predicate.replace(/`value` IS NULL/g, String(value === SQL_NULL))
    .replace(/JSON_TYPE\(`value`\) = 'OBJECT'/g, String(object))
    .replace(/JSON_CONTAINS_PATH\(`value`, 'one', '\$\.address'\) = 0/g, String(object && !Object.hasOwn(value, 'address')))
    .replace(/\bAND\b/g, '&&').replace(/\bOR\b/g, '||')
  assert.ok(/^[truefals()\s&|]+$/.test(expression), 'only the reviewed missing-address predicate may be evaluated')
  return vm.runInNewContext(expression)
}
test('migration 004 preserves every existing address, including blank/null/admin edits', () => {
  for (const value of [{ address: 'Admin edit' }, { address: '' }, { address: null }, { address: '   ' }, { address: 'No. 8 Oke Agbe Street, Garki 2, Abuja, FCT' }, null, [], 'invalid root']) assert.equal(actualGuard(value), false)
})
test('migration 004 fills only SQL NULL or an object with no address property', () => {
  assert.equal(actualGuard(SQL_NULL), true); assert.equal(actualGuard({ phone: 'fixture phone' }), true)
  const contact = { phone: 'fixture phone', hours: 'fixture hours' }
  const result = actualGuard(contact) ? { ...contact, address: 'No. 8 Oke Agbe Street, Garki 2, Abuja, FCT' } : contact
  assert.equal(result.phone, contact.phone); assert.equal(result.hours, contact.hours)
})
test('migration 004 retains ledger guard, guards fresh insert and avoids silent duplicate success', () => {
  assert.match(update, /NOT EXISTS.*schema_migrations[\s\S]*004-site-address/)
  assert.match(insert, /NOT EXISTS.*schema_migrations[\s\S]*NOT EXISTS.*settings[\s\S]*contact_info/)
  assert.ok(!insert.includes('INSERT IGNORE'))
  assert.equal(statements.length, 4)
  const contact = { address: 'Admin edit' }, applied = true
  assert.equal(!applied && actualGuard(contact), false)
})
