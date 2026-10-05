// Dependency compatibility/security fixtures only. No app, env, sockets, DB or mail.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import test from 'node:test'
import express from 'express'
import bodyParser from 'body-parser'
import morgan from 'morgan'
import qs from 'qs'
import { nanoid } from 'nanoid'
import { nanoid as nonSecureId, customAlphabet } from 'nanoid/non-secure'

const require = createRequire(import.meta.url)

async function parse(parser, content, type) {
  const bytes = Buffer.from(content)
  const req = Readable.from([bytes])
  req.headers = { 'content-type': type, 'content-length': String(bytes.length) }
  const error = await new Promise((resolve) => parser(req, {}, resolve))
  return { req, error }
}

test('secure upload ID API still returns unique URL-safe 12-character names', () => {
  const names = Array.from({ length: 100 }, () => nanoid(12))
  assert.equal(new Set(names).size, names.length)
  for (const name of names) assert.match(name, /^[\w-]{12}$/)
})

test('patched non-secure generators terminate on negative sizes', () => {
  assert.equal(nonSecureId(-1), '')
  assert.equal(customAlphabet('abc')(-1), '')
  assert.equal(customAlphabet('abc')(12).length, 12)
})

test('Express 4 router and internal Layer API used by the async wrapper remain available', async () => {
  const Layer = require('express/lib/router/layer.js')
  assert.equal(typeof Layer.prototype.handle_request, 'function')
  const router = express.Router()
  const received = await new Promise((resolve, reject) => {
    router.get('/fixture/:id', (req) => resolve(req.params.id))
    router.handle({ method: 'GET', url: '/fixture/known', headers: {} }, {}, (error) => reject(error || new Error('Route did not match')))
  })
  assert.equal(received, 'known')
})

test('JSON parsing preserves raw webhook bytes and the existing 1mb limit API', async () => {
  const content = '{"amount":69000,"reference":"offline-fixture"}'
  const parser = express.json({ limit: '1mb', verify: (req, _res, bytes) => { req.rawBody = Buffer.from(bytes) } })
  const { req, error } = await parse(parser, content, 'application/json')
  assert.equal(error, undefined)
  assert.deepEqual(req.body, { amount: 69000, reference: 'offline-fixture' })
  assert.equal(req.rawBody.toString('utf8'), content)
})

test('body-parser rejects invalid limit options and enforces valid size limits', async () => {
  assert.throws(() => bodyParser.json({ limit: 'not-a-size' }))
  const { error } = await parse(bodyParser.json({ limit: 16 }), JSON.stringify({ value: 'x'.repeat(64) }), 'application/json')
  assert.equal(error?.status, 413)
  assert.equal(error?.type, 'entity.too.large')
})

test('extended form and query parsing preserve nested fields and repeated arrays', async () => {
  const content = 'customer[name]=Fixture&items[]=a&items[]=b'
  const { req, error } = await parse(express.urlencoded({ extended: true }), content, 'application/x-www-form-urlencoded')
  assert.equal(error, undefined)
  assert.deepEqual(req.body, { customer: { name: 'Fixture' }, items: ['a', 'b'] })
  assert.deepEqual(qs.parse(content), req.body)
  // Exercise Express's actual query configuration, not qs's stricter raw defaults.
  const app = express()
  const values = Array.from({ length: 30 }, (_, n) => String(n))
  const parsed = await new Promise((resolve, reject) => {
    app.get('/fixture', (request) => resolve(request.query.a))
    const request = new IncomingMessage(null)
    request.method = 'GET'; request.url = '/fixture?' + values.map((n) => `a=${n}`).join('&')
    app.handle(request, new ServerResponse(request), (failure) => reject(failure || new Error('Route did not match')))
  })
  assert.deepEqual(parsed, values)
})

test('qs guards attacker-controlled isBuffer and bracket-key comma array limits', () => {
  const hostile = qs.parse('a[constructor][isBuffer]=1', { allowPrototypes: true })
  assert.doesNotThrow(() => qs.stringify(hostile))
  assert.throws(() => qs.parse('a[]=1,2,3,4', { comma: true, arrayLimit: 3, throwOnLimitExceeded: true }), RangeError)
})

test('Morgan keeps its token API while escaping Unicode separators, quotes and CRLF', () => {
  const req = { method: 'GET', originalUrl: '/fixture', headers: { 'user-agent': 'fixture"\r\n\u0085\u2028\u2029\\end' } }
  const token = morgan.req(req, {}, 'user-agent')
  for (const character of ['\r', '\n', '\u0085', '\u2028', '\u2029']) assert.ok(!token.includes(character))
  for (const escaped of ['\\"', '\\r', '\\n', '\\u0085', '\\u2028', '\\u2029', '\\\\']) assert.ok(token.includes(escaped))
  assert.equal(morgan.compile(':method :url')(morgan, req, {}), 'GET /fixture')
})

test('dependency fixtures never initialise a database pool', () => {
  assert.equal(globalThis.__maximsPool, undefined)
})
