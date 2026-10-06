// Buffer-only backup framing. No filesystem, environment or network access.
// Keys must be caller-supplied 32-byte Buffers; key custody and manifest contents
// belong to the runner. This module does not inspect or collect configuration.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { TextDecoder } from 'node:util'

const MAGIC = Buffer.from('MXBK1', 'ascii')
const IV_BYTES = 12
const TAG_BYTES = 16
const FRAME_BYTES = MAGIC.length + IV_BYTES + TAG_BYTES
const MAX_BYTES = 64 * 1024 * 1024
const MAX_MANIFEST_BYTES = 1024 * 1024
const plainObject = (value) => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value))
const validKey = (key) => Buffer.isBuffer(key) && key.length === 32
const validBuffer = (value) => Buffer.isBuffer(value) && value.length <= MAX_BYTES
const payloadError = () => new Error('Invalid backup payload')
const envelopeError = () => new Error('Invalid backup envelope')

export function encryptBuffer(plain, key32) {
  try {
    if (!validBuffer(plain) || !validKey(key32)) throw envelopeError()
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv('aes-256-gcm', key32, iv, { authTagLength: TAG_BYTES })
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])
    return Buffer.concat([MAGIC, iv, ciphertext, cipher.getAuthTag()])
  } catch {
    throw envelopeError()
  }
}

export function decryptBuffer(envelope, key32) {
  let pending, final
  try {
    if (!Buffer.isBuffer(envelope) || !validKey(key32)
      || envelope.length < FRAME_BYTES || envelope.length > MAX_BYTES + FRAME_BYTES
      || !envelope.subarray(0, MAGIC.length).equals(MAGIC)) throw envelopeError()
    const ivEnd = MAGIC.length + IV_BYTES
    const tagStart = envelope.length - TAG_BYTES
    const decipher = createDecipheriv('aes-256-gcm', key32,
      envelope.subarray(MAGIC.length, ivEnd), { authTagLength: TAG_BYTES })
    decipher.setAuthTag(envelope.subarray(tagStart))
    pending = decipher.update(envelope.subarray(ivEnd, tagStart))
    // update() produces unauthenticated bytes. Keep them private until final()
    // authenticates the complete frame; never expose them through a callback.
    final = decipher.final()
    return Buffer.concat([pending, final])
  } catch {
    throw envelopeError()
  } finally {
    // Clear intermediate plaintext, including on authentication failure. Caller
    // input/output Buffers are deliberately untouched; this is not process-wide
    // zeroisation and callers remain responsible for their plaintext lifetime.
    pending?.fill(0)
    final?.fill(0)
  }
}

export function packPayload(manifest, archive) {
  try {
    if (!plainObject(manifest) || !validBuffer(archive)) throw payloadError()
    const json = JSON.stringify(manifest)
    if (typeof json !== 'string') throw payloadError()
    const length = Buffer.byteLength(json, 'utf8')
    if (length > MAX_MANIFEST_BYTES || length + 4 + archive.length > MAX_BYTES
      || !plainObject(JSON.parse(json))) throw payloadError()
    const header = Buffer.alloc(4)
    header.writeUInt32BE(length)
    return Buffer.concat([header, Buffer.from(json, 'utf8'), archive])
  } catch {
    throw payloadError()
  }
}

export function unpackPayload(payload) {
  try {
    if (!validBuffer(payload) || payload.length < 4) throw payloadError()
    const length = payload.readUInt32BE(0)
    if (length > MAX_MANIFEST_BYTES || length > payload.length - 4) throw payloadError()
    const json = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
      .decode(payload.subarray(4, 4 + length))
    const manifest = JSON.parse(json)
    if (!plainObject(manifest)) throw payloadError()
    return { manifest, archive: Buffer.from(payload.subarray(4 + length)) }
  } catch {
    throw payloadError()
  }
}
