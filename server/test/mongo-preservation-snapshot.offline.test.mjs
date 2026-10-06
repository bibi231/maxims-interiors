// Synthetic BSON and fake cursors only: no MongoClient, config, environment or sockets.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import vm from 'node:vm'
import { BSON } from 'mongodb'
import { snapshotMongo } from '../scripts/mongo-preservation-snapshot.mjs'

const names = [
  'users', 'products', 'orders', 'bulkrequests', 'appointments', 'messages',
  'galleries', 'testimonials', 'teammembers', 'settings', 'activities',
  'newsletters', 'transactions', 'blogposts',
]
const oid = (n) => new BSON.ObjectId(n.toString(16).padStart(24, '0'))
const document = (n = 1, extra = {}) => ({ _id: oid(n), __v: new BSON.Int32(0), ...extra })
const index = (name = '_id_', extra = {}) => ({ v: new BSON.Int32(2), key: { _id: new BSON.Int32(1) }, name, ...extra })
const descriptor = (name, extra = {}) => ({ name, type: 'collection', options: {}, ...extra })

class FakeCursor {
  constructor(values, record, fault = {}) { this.values = values; this.record = record; this.fault = fault; this.cap = Infinity; this.closed = 0; this.visited = 0 }
  sort(value) { this.record.push(['sort', value]); this.order = value; return this }
  limit(value) { this.record.push(['limit', value]); this.cap = value; return this }
  maxTimeMS(value) { this.record.push(['maxTimeMS', value]); return this }
  async *[Symbol.asyncIterator]() {
    if (this.fault.iterate) throw this.fault.iterate
    const values = this.order ? [...this.values].sort((a, b) => a._id.toHexString().localeCompare(b._id.toHexString())) : this.values
    for (const value of values.slice(0, this.cap)) { this.visited++; yield value }
  }
  async close() { this.closed++; if (this.fault.close) throw this.fault.close }
}

function fixture({ entries = [descriptor('users')], docs = {}, indexes = {}, faults = {} } = {}) {
  const calls = [], cursors = []
  function cursor(values, stage) {
    const result = new FakeCursor(values, calls, faults[stage])
    result.stage = stage; cursors.push(result); return result
  }
  return {
    calls, cursors,
    databaseName: 'synthetic_preservation_fixture',
    listCollections(filter, options) { calls.push(['listCollections', filter, options]); return cursor(entries, 'collections') },
    collection(name) {
      calls.push(['collection', name])
      return {
        listIndexes(options) { calls.push(['listIndexes', name, options]); return cursor(indexes[name] ?? [index()], `indexes:${name}`) },
        find(filter, options) { calls.push(['find', name, filter, options]); return cursor(docs[name] ?? [], `documents:${name}`) },
      }
    },
  }
}
const snapshot = (options) => snapshotMongo(fixture(options), BSON, createHash)
const summary = async (options) => (await snapshot(options)).collections[0]
function documentDigest(documents) {
  const hash = createHash('sha256')
  for (const doc of documents) {
    const bytes = BSON.serialize(doc), prefix = Buffer.alloc(4)
    prefix.writeUInt32BE(bytes.length); hash.update(prefix).update(bytes)
  }
  return hash.digest('hex')
}
async function guarded(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.name, 'MongoPreservationSnapshotError')
    assert.equal(error.code, code); assert.equal(error.message, code)
    assert.equal(Object.hasOwn(error, 'cause'), false)
    assert.equal(Object.hasOwn(error, 'collections'), false)
    return true
  })
}

test('exact fourteen names, stable inventory order, no data returned and no write surface', async () => {
  const db = fixture({ entries: [...names].reverse().map((name) => descriptor(name)), docs: { users: [document(1, { password_hash: 'synthetic-private-only', nullable: null })] } })
  const result = await snapshotMongo(db, BSON, createHash)
  assert.deepEqual(Object.keys(result), ['database', 'collections'])
  assert.equal(result.database, db.databaseName)
  assert.deepEqual(result.collections.map((collection) => collection.name), names)
  for (const collection of result.collections) {
    assert.deepEqual(Object.keys(collection), ['name', 'count', 'documentDigest', 'metadataDigest'])
    assert.match(collection.documentDigest, /^[a-f0-9]{64}$/)
    assert.match(collection.metadataDigest, /^[a-f0-9]{64}$/)
  }
  assert.equal(JSON.stringify(result).includes('synthetic-private-only'), false)
  assert.equal(JSON.stringify(result).includes(oid(1).toHexString()), false)
  assert.ok(db.cursors.every((cursor) => cursor.closed === 1))
})

test('all reads are bounded, document values unpromoted, full-document find sorted by _id', async () => {
  const db = fixture({ docs: { users: [document(2), document(1)] } })
  const result = await snapshotMongo(db, BSON, createHash)
  assert.deepEqual(db.calls, [
    ['listCollections', {}, { nameOnly: false, maxTimeMS: 10000 }],
    ['collection', 'users'], ['listIndexes', 'users', { maxTimeMS: 10000 }],
    ['find', 'users', {}, { promoteValues: false, bsonRegExp: true }],
    ['sort', { _id: 1 }], ['limit', 10001], ['maxTimeMS', 10000],
  ])
  assert.equal(result.collections[0].documentDigest, documentDigest([document(1), document(2)]))
})

test('document digest is SHA-256 of uint32-BE length-prefixed raw BSON, not JSON', async () => {
  const docs = [document(1, { nullValue: null, int: new BSON.Int32(7), double: new BSON.Double(7), binary: new BSON.Binary(Buffer.from([0, 255])), when: new Date('2026-10-06T00:00:00Z') }), document(2)]
  const result = await summary({ docs: { users: docs } })
  assert.equal(result.count, 2); assert.equal(result.documentDigest, documentDigest(docs))
  assert.notEqual(result.documentDigest, createHash('sha256').update(Buffer.concat(docs.map((doc) => BSON.serialize(doc)))).digest('hex'))
})

for (const [label, before, after] of [
  ['Int32 versus Double', new BSON.Int32(7), new BSON.Double(7)],
  ['ObjectId versus string', oid(9), oid(9).toHexString()],
  ['date versus string', new Date('2026-10-06T00:00:00Z'), '2026-10-06T00:00:00.000Z'],
  ['binary content', new BSON.Binary(Buffer.from([1, 2])), new BSON.Binary(Buffer.from([1, 3]))],
  ['binary subtype', new BSON.Binary(Buffer.from([1]), 0), new BSON.Binary(Buffer.from([1]), 128)],
  ['Long versus Double', BSON.Long.fromString('9007199254740993'), new BSON.Double(9007199254740992)],
  ['Decimal128 precision', BSON.Decimal128.fromString('1.00'), BSON.Decimal128.fromString('1.01')],
  ['BSON regex', new BSON.BSONRegExp('a', 'i'), new BSON.BSONRegExp('b', 'i')],
  ['array ordering', [1, 2], [2, 1]],
  ['nested BSON field ordering', { a: 1, b: 2 }, { b: 2, a: 1 }],
]) {
  test(`raw document hash detects ${label}`, async () => {
    const a = await summary({ docs: { users: [document(1, { value: before })] } })
    const b = await summary({ docs: { users: [document(1, { value: after })] } })
    assert.notEqual(a.documentDigest, b.documentDigest)
    assert.equal(a.metadataDigest, b.metadataDigest)
  })
}

for (const [label, before, after] of [
  ['__v', document(1), document(1, { __v: new BSON.Int32(1) })],
  ['password field', document(1, { password_hash: 'synthetic-a' }), document(1, { password_hash: 'synthetic-b' })],
  ['null versus absent', document(1, { optional: null }), document(1)],
  ['_id', document(1), document(2)],
  ['top-level BSON field order', { _id: oid(1), a: 1, b: 2 }, { _id: oid(1), b: 2, a: 1 }],
]) {
  test(`no document filtering: ${label} changes digest`, async () => {
    assert.notEqual((await summary({ docs: { users: [before] } })).documentDigest, (await summary({ docs: { users: [after] } })).documentDigest)
  })
}

test('cursor order changes do not change digests when _id sort is applied', async () => {
  assert.deepEqual(await snapshot({ docs: { users: [document(2), document(1)] } }), await snapshot({ docs: { users: [document(1), document(2)] } }))
})

test('metadata ignores object key and index enumeration order but preserves definitions', async () => {
  const a = await summary({ entries: [descriptor('users', { options: { validator: { a: { $type: 'string' }, b: { $gte: new BSON.Int32(1) } }, collation: { locale: 'en', strength: 2 } } })], indexes: { users: [index('z', { unique: true }), index()] } })
  const b = await summary({ entries: [descriptor('users', { options: { collation: { strength: 2, locale: 'en' }, validator: { b: { $gte: new BSON.Int32(1) }, a: { $type: 'string' } } } })], indexes: { users: [{ name: '_id_', key: { _id: new BSON.Int32(1) }, v: new BSON.Int32(2) }, { unique: true, name: 'z', key: { _id: new BSON.Int32(1) }, v: new BSON.Int32(2) }] } })
  assert.equal(a.metadataDigest, b.metadataDigest)
})

test('compound-index key order changes metadata digest; incidental outer ordering does not', async () => {
  const key = { customer: new BSON.Int32(1), created_at: new BSON.Int32(-1) }
  const original = { name: 'customer_created', key, unique: true, partialFilterExpression: { active: true, verified: false }, v: new BSON.Int32(2) }
  const reorderedOuter = { v: new BSON.Int32(2), partialFilterExpression: { verified: false, active: true }, unique: true, key, name: 'customer_created' }
  const reversedKey = { ...reorderedOuter, key: { created_at: new BSON.Int32(-1), customer: new BSON.Int32(1) } }
  const a = await summary({ indexes: { users: [original] } })
  const b = await summary({ indexes: { users: [reorderedOuter] } })
  const c = await summary({ indexes: { users: [reversedKey] } })
  assert.equal(a.metadataDigest, b.metadataDigest)
  assert.notEqual(a.metadataDigest, c.metadataDigest)
  assert.equal(a.documentDigest, c.documentDigest)
  assert.strictEqual(original.key, key)
  assert.deepEqual(Object.keys(original.key), ['customer', 'created_at'])
})

test('metadata uses canonical non-relaxed EJSON before sorting keys', async () => {
  const options = { validator: { value: { $gte: new BSON.Int32(7) } } }
  const result = await summary({ entries: [descriptor('users', { options })] })
  const canonical = '{"indexes":[{"key":[["_id",{"$numberInt":"1"}]],"name":"_id_","v":{"$numberInt":"2"}}],"options":{"validator":{"value":{"$gte":{"$numberInt":"7"}}}},"type":"collection"}'
  assert.equal(result.metadataDigest, createHash('sha256').update(canonical).digest('hex'))
})

for (const [label, a, b] of [
  ['options', { entries: [descriptor('users', { options: { capped: true, size: new BSON.Int32(1000) } })] }, { entries: [descriptor('users', { options: { capped: true, size: new BSON.Int32(2000) } })] }],
  ['metadata numeric BSON type', { entries: [descriptor('users', { options: { size: new BSON.Int32(7) } })] }, { entries: [descriptor('users', { options: { size: new BSON.Double(7) } })] }],
  ['metadata arrays', { entries: [descriptor('users', { options: { validator: { $and: [{ a: 1 }, { b: 2 }] } } })] }, { entries: [descriptor('users', { options: { validator: { $and: [{ b: 2 }, { a: 1 }] } } })] }],
  ['index uniqueness', { indexes: { users: [index('email', { unique: true })] } }, { indexes: { users: [index('email', { unique: false })] } }],
  ['index key direction', { indexes: { users: [index('value', { key: { value: new BSON.Int32(1) } })] } }, { indexes: { users: [index('value', { key: { value: new BSON.Int32(-1) } })] } }],
  ['index partial filter', { indexes: { users: [index('value', { partialFilterExpression: { active: true } })] } }, { indexes: { users: [index('value', { partialFilterExpression: { active: false } })] } }],
  ['index added', { indexes: { users: [index()] } }, { indexes: { users: [index(), index('other')] } }],
  ['index removed', { indexes: { users: [index()] } }, { indexes: { users: [] } }],
]) {
  test(`metadata digest detects ${label}`, async () => {
    const before = await summary(a), after = await summary(b)
    assert.notEqual(before.metadataDigest, after.metadataDigest)
    assert.equal(before.documentDigest, after.documentDigest)
  })
}

test('present empty collection differs from absence; disappearance/addition remains observable', async () => {
  const absent = await snapshot({ entries: [] }), present = await snapshot({ entries: [descriptor('users')] })
  assert.deepEqual(absent.collections, [])
  assert.equal(present.collections[0].count, 0)
  assert.equal(present.collections[0].documentDigest, createHash('sha256').digest('hex'))
  assert.notDeepEqual(absent, present)
  assert.notDeepEqual(await snapshot({ entries: [descriptor('users'), descriptor('orders')] }), present)
})

for (const [label, entries, code] of [
  ['unknown', [descriptor('unmapped_private_fixture')], 'snapshot_unknown_collection'],
  ['view', [descriptor('users', { type: 'view' })], 'snapshot_noncollection'],
  ['missing type', [{ name: 'users', options: {} }], 'snapshot_noncollection'],
  ['duplicate', [descriptor('users'), descriptor('users')], 'snapshot_duplicate_collection'],
  ['case mismatch', [descriptor('Users')], 'snapshot_unknown_collection'],
]) {
  test(`${label} collection fails before any collection reads and closes cursor`, async () => {
    const db = fixture({ entries })
    await guarded(snapshotMongo(db, BSON, createHash), code)
    assert.equal(db.calls.some(([kind]) => kind === 'collection'), false)
    assert.equal(db.cursors[0].closed, 1)
  })
}

test('10,000 documents accepted; 10,001 rejected without serialising overflow', async () => {
  const docs = Array.from({ length: 10001 }, (_, i) => document(i + 1))
  assert.equal((await summary({ docs: { users: docs.slice(0, 10000) } })).count, 10000)
  const db = fixture({ docs: { users: docs } }); let serialised = 0
  const realBSON = { ...BSON, serialize(doc) { serialised++; return BSON.serialize(doc) } }
  await guarded(snapshotMongo(db, realBSON, createHash), 'snapshot_count_limit')
  assert.equal(serialised, 10000)
  assert.equal(db.cursors.find((cursor) => cursor.stage === 'documents:users').closed, 1)
})

test('64 MiB cap includes metadata and framing; exact boundary accepted, next byte rejected', async () => {
  const empty = { type: 'collection', options: {}, indexes: [{ ...index(), key: Object.entries(index().key) }] }
  const metadataBytes = Buffer.byteLength(JSON.stringify(BSON.EJSON.serialize(empty, { relaxed: false })))
  const available = 64 * 1024 * 1024 - metadataBytes - 4
  // Fake oversized serializer output checks the exact resource boundary without a real DB.
  const bytes = Buffer.alloc(available)
  const codec = { ...BSON, serialize: () => bytes }
  assert.equal((await snapshotMongo(fixture({ docs: { users: [document()] } }), codec, createHash)).collections[0].count, 1)
  await guarded(snapshotMongo(fixture({ docs: { users: [document(), document(2)] } }), { ...codec, serialize: (doc) => doc._id.equals(oid(1)) ? bytes : Buffer.alloc(1) }, createHash), 'snapshot_byte_limit')
  await guarded(snapshotMongo(fixture({ docs: { users: [document()] } }), { ...codec, serialize: () => Buffer.alloc(available + 1) }, createHash), 'snapshot_byte_limit')
})

test('byte cap aggregates across collections using real BSON, not a per-collection limit', async () => {
  const payload = new BSON.Binary(Buffer.alloc(8 * 1024 * 1024))
  const db = fixture({ entries: [descriptor('users'), descriptor('orders')], docs: { users: Array.from({ length: 4 }, (_, i) => document(i + 1, { payload })), orders: Array.from({ length: 4 }, (_, i) => document(i + 1, { payload })) } })
  await guarded(snapshotMongo(db, BSON, createHash), 'snapshot_byte_limit')
  assert.ok(db.cursors.every((cursor) => cursor.closed === 1))
})

for (const stage of ['collections', 'indexes:users', 'documents:users']) {
  for (const operation of ['iterate', 'close']) {
    test(`${stage} ${operation} failure is redacted, closes cursor and returns no partial inventory`, async () => {
      const db = fixture({ docs: { users: [document()] }, faults: { [stage]: { [operation]: new Error('synthetic-private-URI document-id password') } } })
      await guarded(snapshotMongo(db, BSON, createHash), 'snapshot_read_failed')
      assert.ok(db.cursors.every((cursor) => cursor.closed === 1))
    })
  }
}

test('serializer and hash failures never expose original error or partial data', async () => {
  const failure = () => { throw new Error('synthetic-private-password') }
  await guarded(snapshotMongo(fixture({ docs: { users: [document()] } }), { ...BSON, serialize: failure }, createHash), 'snapshot_read_failed')
  await guarded(snapshotMongo(fixture(), { ...BSON, EJSON: { serialize: failure } }, createHash), 'snapshot_read_failed')
  await guarded(snapshotMongo(fixture(), BSON, failure), 'snapshot_read_failed')
})

test('missing hash/codec/db dependencies reject; no implicit imports or defaults', async () => {
  await guarded(snapshotMongo(fixture(), BSON), 'snapshot_dependencies_invalid')
  await guarded(snapshotMongo(fixture(), {}, createHash), 'snapshot_dependencies_invalid')
  await guarded(snapshotMongo(null, BSON, createHash), 'snapshot_dependencies_invalid')
})

test('invalid or duplicate index names reject', async () => {
  await guarded(snapshot({ indexes: { users: [index(), index()] } }), 'snapshot_index_invalid')
  await guarded(snapshot({ indexes: { users: [{ key: { a: 1 } }] } }), 'snapshot_index_invalid')
})

test('function.toString executes independently with only injected db/BSON/hash and Buffer', async () => {
  const transported = vm.runInNewContext(`(${snapshotMongo.toString()})`, { Buffer })
  const options = { entries: [descriptor('users', { options: { validator: { nested: { $gte: new BSON.Int32(1) } } } })], docs: { users: [document(1, { password_hash: 'synthetic-private-only', nested: [null, new BSON.Double(4)] })] } }
  const actual = await transported(fixture(options), BSON, createHash)
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), await snapshot(options))
})
