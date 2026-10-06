// Synthetic buffers only: no application imports, env, files, sockets or backups.
import assert from 'node:assert/strict'
import test from 'node:test'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import * as api from '../scripts/backup-envelope.mjs'

const { encryptBuffer, decryptBuffer, packPayload, unpackPayload } = api
const MAX = 64 * 1024 * 1024
const MANIFEST_MAX = 1024 * 1024
const FRAME = 33
const key = () => randomBytes(32)
const rejectsEnvelope = (work) => assert.throws(work, (e) =>
  e instanceof Error && e.message === 'Invalid backup envelope' && e.cause === undefined)
const rejectsPayload = (work) => assert.throws(work, (e) =>
  e instanceof Error && e.message === 'Invalid backup payload' && e.cause === undefined)
function rawPayload(json, archive = Buffer.alloc(0)) {
  const bytes = Buffer.isBuffer(json) ? json : Buffer.from(json)
  const header = Buffer.alloc(4)
  header.writeUInt32BE(bytes.length)
  return Buffer.concat([header, bytes, archive])
}
function chunks(buffer) {
  const result = []
  for (let start = 0; start < buffer.length; start += 997) result.push(buffer.subarray(start, start + 997))
  return result
}

test('exports exactly the four buffer APIs', () => {
  assert.deepEqual(Object.keys(api).sort(), ['decryptBuffer', 'encryptBuffer', 'packPayload', 'unpackPayload'])
})

for (const size of [0, 1, 15, 16, 17, 4096, 1024 * 1024]) {
  test(`random synthetic plaintext roundtrip: ${size} bytes`, () => {
    const plain = randomBytes(size), k = key(), before = Buffer.from(plain), keyBefore = Buffer.from(k)
    const envelope = encryptBuffer(plain, k), envelopeBefore = Buffer.from(envelope)
    assert.equal(envelope.length, size + FRAME)
    assert.equal(envelope.subarray(0, 5).toString('ascii'), 'MXBK1')
    const decoded = decryptBuffer(Buffer.concat(chunks(envelope)), k)
    assert.deepEqual(decoded, plain)
    assert.deepEqual(plain, before); assert.deepEqual(k, keyBefore); assert.deepEqual(envelope, envelopeBefore)
    decoded.fill(0)
    assert.deepEqual(plain, before)
  })
}

test('identical plaintext and key receive fresh 12-byte random IVs', () => {
  const k = key(), plain = randomBytes(128), ivs = new Set()
  for (let n = 0; n < 32; n++) {
    const envelope = encryptBuffer(plain, k)
    ivs.add(envelope.subarray(5, 17).toString('hex'))
    assert.deepEqual(decryptBuffer(envelope, k), plain)
  }
  assert.equal(ivs.size, 32)
})

test('wire frame interoperates with independent chunked AES-256-GCM', () => {
  const plain = randomBytes(65539), k = key(), envelope = encryptBuffer(Buffer.concat(chunks(plain)), k)
  const reader = createDecipheriv('aes-256-gcm', k, envelope.subarray(5, 17), { authTagLength: 16 })
  reader.setAuthTag(envelope.subarray(-16))
  const read = chunks(envelope.subarray(17, -16)).map((chunk) => reader.update(chunk))
  read.push(reader.final())
  assert.deepEqual(Buffer.concat(read), plain)
  const iv = randomBytes(12), writer = createCipheriv('aes-256-gcm', k, iv, { authTagLength: 16 })
  const encrypted = chunks(plain).map((chunk) => writer.update(chunk))
  encrypted.push(writer.final())
  const external = Buffer.concat([Buffer.from('MXBK1'), iv, ...encrypted, writer.getAuthTag()])
  assert.deepEqual(decryptBuffer(external, k), plain)
})

for (const part of ['magic', 'iv', 'body', 'tag']) {
  test(`tampered ${part} returns only a generic error, never plaintext`, () => {
    const plain = randomBytes(256), k = key(), envelope = encryptBuffer(plain, k)
    const offset = { magic: 0, iv: 5, body: 17, tag: envelope.length - 1 }[part]
    envelope[offset] ^= 1
    let returned
    rejectsEnvelope(() => { returned = decryptBuffer(envelope, k) })
    assert.equal(returned, undefined)
  })
}

test('wrong key, truncation, appended bytes and short frames all reject', () => {
  const k = key(), envelope = encryptBuffer(randomBytes(128), k)
  rejectsEnvelope(() => decryptBuffer(envelope, key()))
  for (let length = 0; length < FRAME; length++) rejectsEnvelope(() => decryptBuffer(Buffer.alloc(length), k))
  for (const length of [FRAME, envelope.length - 1, envelope.length - 16]) {
    rejectsEnvelope(() => decryptBuffer(envelope.subarray(0, length), k))
  }
  rejectsEnvelope(() => decryptBuffer(Buffer.concat([envelope, Buffer.from([0])]), k))
})

test('non-Buffers and keys other than exactly 32 bytes reject', () => {
  const k = key(), envelope = encryptBuffer(Buffer.alloc(0), k)
  for (const invalid of [null, undefined, '', 'private-synthetic-key', new Uint8Array(32), Buffer.alloc(0), Buffer.alloc(31), Buffer.alloc(33)]) {
    rejectsEnvelope(() => encryptBuffer(Buffer.alloc(0), invalid))
    rejectsEnvelope(() => decryptBuffer(envelope, invalid))
  }
  for (const invalid of [null, undefined, 'synthetic-plaintext', new Uint8Array(16), {}]) {
    rejectsEnvelope(() => encryptBuffer(invalid, k))
    rejectsEnvelope(() => decryptBuffer(invalid, k))
  }
})

test('full metadata/archive roundtrip preserves profiles and private synthetic digests', () => {
  for (const profile of ['mariadb-10.11-fixture', 'mariadb-10.6-fixture']) {
    const manifest = { profile, collections: [{ name: 'fixture_documents', count: 85, digest: randomBytes(32).toString('hex') }], title: 'Synthetic — ₦ 🛋️', optional: null }
    const archive = randomBytes(1024), archiveBefore = Buffer.from(archive), k = key()
    const payload = packPayload(manifest, archive)
    assert.equal(payload.readUInt32BE(0), Buffer.byteLength(JSON.stringify(manifest)))
    const packedBefore = Buffer.from(payload)
    const restored = unpackPayload(decryptBuffer(encryptBuffer(payload, k), k))
    assert.deepEqual(restored, { manifest, archive })
    restored.archive.fill(0)
    assert.deepEqual(archive, archiveBefore); assert.deepEqual(payload, packedBefore)
  }
})

test('empty archive and null-prototype input manifest are valid plain-object payloads', () => {
  const manifest = Object.assign(Object.create(null), { profile: 'synthetic' })
  assert.deepEqual(unpackPayload(packPayload(manifest, Buffer.alloc(0))), { manifest: { profile: 'synthetic' }, archive: Buffer.alloc(0) })
})

test('manifest lengths use UTF-8 bytes, not character count; archive remains byte-exact', () => {
  const manifest = { title: '✓₦🛋️' }, archive = Buffer.from([0, 255, 128, 4])
  const payload = packPayload(manifest, archive)
  assert.equal(payload.readUInt32BE(0), Buffer.byteLength(JSON.stringify(manifest), 'utf8'))
  assert.ok(payload.readUInt32BE(0) > JSON.stringify(manifest).length)
  assert.deepEqual(unpackPayload(payload), { manifest, archive })
})

test('malformed JSON, invalid UTF-8 and non-object JSON manifests reject', () => {
  for (const json of ['', '{', '{"private-synthetic-value":', 'null', '[]', '"scalar"', '123', 'true', '{} trailing']) {
    rejectsPayload(() => unpackPayload(rawPayload(json)))
  }
  rejectsPayload(() => unpackPayload(rawPayload(Buffer.from([123, 34, 120, 34, 58, 34, 255, 34, 125]))))
  rejectsPayload(() => unpackPayload(rawPayload('\ufeff{}')))
})

test('pack rejects non-object manifests, broken serialisation and invalid archive types generically', () => {
  const cycle = {}; cycle.self = cycle
  const explosive = { toJSON() { throw new Error('private-synthetic-value') } }
  for (const manifest of [null, undefined, [], 'scalar', 123, new Date(), cycle, { value: 1n }, explosive, { toJSON: () => [] }, { toJSON: () => undefined }]) {
    rejectsPayload(() => packPayload(manifest, Buffer.alloc(0)))
  }
  for (const archive of [null, undefined, 'archive', new Uint8Array(2), {}]) rejectsPayload(() => packPayload({}, archive))
})

test('short payloads, impossible length prefixes and truncated manifests reject', () => {
  for (let size = 0; size < 4; size++) rejectsPayload(() => unpackPayload(Buffer.alloc(size)))
  for (const length of [0, 1, 3, MANIFEST_MAX + 1, 0xffffffff]) {
    const payload = Buffer.alloc(6); payload.writeUInt32BE(length); payload.write('{}', 4)
    rejectsPayload(() => unpackPayload(payload))
  }
  for (const invalid of [null, undefined, '{}', new Uint8Array(4), {}]) rejectsPayload(() => unpackPayload(invalid))
})

test('manifest bound is inclusive at 1 MiB and rejects one byte over', () => {
  const overhead = Buffer.byteLength(JSON.stringify({ padding: '' }))
  const manifest = { padding: 'x'.repeat(MANIFEST_MAX - overhead) }
  const packed = packPayload(manifest, Buffer.alloc(0))
  assert.equal(packed.readUInt32BE(0), MANIFEST_MAX)
  assert.deepEqual(unpackPayload(packed).manifest, manifest)
  rejectsPayload(() => packPayload({ padding: manifest.padding + 'x' }, Buffer.alloc(0)))
  rejectsPayload(() => unpackPayload(rawPayload(JSON.stringify({ padding: manifest.padding + 'x' }))))
})

test('64 MiB plaintext/payload limits and 33-byte frame overhead are inclusive', () => {
  const k = key(), plain = Buffer.alloc(MAX)
  // Random synthetic samples within a large boundary fixture; no real archive.
  randomBytes(64).copy(plain, 0); randomBytes(64).copy(plain, MAX - 64)
  const envelope = encryptBuffer(plain, k)
  assert.equal(envelope.length, MAX + FRAME)
  assert.deepEqual(decryptBuffer(envelope, k), plain)
  const archive = plain.subarray(0, MAX - 6), packed = packPayload({}, archive)
  assert.equal(packed.length, MAX)
  const restored = unpackPayload(packed)
  assert.deepEqual(restored.manifest, {}); assert.deepEqual(restored.archive, archive)
})

test('oversized buffers reject before crypto or payload parsing', () => {
  const oversized = Buffer.alloc(MAX + FRAME + 1), k = key()
  rejectsEnvelope(() => encryptBuffer(oversized.subarray(0, MAX + 1), k))
  rejectsEnvelope(() => decryptBuffer(oversized, k))
  rejectsPayload(() => packPayload({}, oversized.subarray(0, MAX - 5)))
  rejectsPayload(() => packPayload({}, oversized.subarray(0, MAX + 1)))
  rejectsPayload(() => unpackPayload(oversized.subarray(0, MAX + 1)))
})
