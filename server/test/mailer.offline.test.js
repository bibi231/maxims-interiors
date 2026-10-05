// Run: node --experimental-vm-modules --test server/test/mailer.offline.test.js
// Execute unchanged production modules with synthetic config/imports. No real env,
// DB, SMTP, HTTP, DNS or mail delivery. Stream transport emits MIME in memory only.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import net from 'node:net'
import tls from 'node:tls'
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import http2 from 'node:http2'
import dgram from 'node:dgram'
import { before, after, mock, test } from 'node:test'
import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'
import express from 'express'

const sourceRoot = new URL('../src/', import.meta.url)
const allowed = new Set(['utils/mailer.js', 'utils/templates.js', 'utils/notify.js', 'utils/staffInvite.js', 'routes/auth.js'])
const fixtureSecret = 'offline-fixture-key-not-a-production-secret'
const user = { id: '000000000000000000000123', email: 'fixture@example.invalid', full_name: 'Zoë<& Fixture', role: 'content_editor', is_active: true, password_version: 5 }
let networkAttempts = 0
let fileAttempts = 0
const forbidden = () => { networkAttempts++; throw new Error('Offline fixture forbids network and database access') }

before(() => {
  for (const [object, methods] of [[net.Socket.prototype, ['connect']], [net.Server.prototype, ['listen']], [net, ['connect', 'createConnection']], [tls, ['connect']], [dns, Object.keys(dns).filter((key) => /^(lookup|resolve|reverse)/.test(key) && typeof dns[key] === 'function')], [dns.promises, Object.keys(dns.promises).filter((key) => /^(lookup|resolve|reverse)/.test(key) && typeof dns.promises[key] === 'function')], [http, ['request', 'get']], [https, ['request', 'get']], [http2, ['connect']], [dgram, ['createSocket']]]) {
    for (const method of methods) mock.method(object, method, forbidden)
  }
  if (typeof globalThis.fetch === 'function') mock.method(globalThis, 'fetch', forbidden)
  // Source/package reads remain allowed. Never open an env file or content stream.
  for (const object of [fs, fs.promises]) {
    for (const method of ['readFile', ...(object === fs ? ['readFileSync'] : [])]) {
      const original = object[method]
      mock.method(object, method, function (path, ...args) {
        if (/(?:^|[\\/])\.env(?:[.\\/]|$)/i.test(String(path))) {
          fileAttempts++; throw new Error('Offline fixture forbids env-file reads')
        }
        return original.call(this, path, ...args)
      })
    }
  }
  mock.method(fs, 'createReadStream', () => { fileAttempts++; throw new Error('Offline fixture forbids file content streams') })
})
after(() => {
  try { assert.equal(networkAttempts, 0); assert.equal(fileAttempts, 0) }
  finally { mock.restoreAll() }
})

async function harness(env = {}, behaviour = {}) {
  const configuration = { JWT_SECRET: fixtureSecret, APP_URL: 'https://maxims.example.invalid/', ...env }
  const options = [], payloads = [], messages = [], logs = [], cache = new Map()
  let verifies = 0, reads = 0
  const context = vm.createContext({
    process: { env: configuration }, Buffer, URL, encodeURIComponent,
    console: { warn: (...args) => logs.push(args), error: (...args) => logs.push(args) },
  })
  const fakeNodemailer = { createTransport(config) {
    options.push(config)
    if (behaviour.createError) throw behaviour.createError
    // Real SMTP constructor/API compatibility only; send/verify are never invoked.
    const smtp = nodemailer.createTransport(config)
    assert.equal(typeof smtp.sendMail, 'function'); assert.equal(typeof smtp.verify, 'function')
    // Fixture-only access restrictions, not a claim about production configuration.
    const memory = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows', disableFileAccess: true, disableUrlAccess: true })
    return {
      async sendMail(payload) {
        payloads.push(payload)
        if (behaviour.sendError) throw behaviour.sendError
        const result = await memory.sendMail(payload)
        messages.push(result)
        return result
      },
      async verify() { verifies++; if (behaviour.verifyError) throw behaviour.verifyError; return true },
    }
  } }
  const externals = {
    nodemailer: { default: fakeNodemailer }, jsonwebtoken: { default: jwt },
    express: { Router: express.Router }, 'express-rate-limit': { default: () => (_req, _res, next) => next() },
    bcryptjs: { default: { hash: forbidden, compare: forbidden } }, 'node:crypto': { default: { randomBytes: forbidden } },
    models: { User: { async findOne(query) { reads++; assert.equal(query.email, user.email); return behaviour.absent ? null : behaviour.inactive ? { ...user, is_active: false } : user }, create: forbidden, findById: forbidden } },
    auth: { signToken: forbidden, requireAuth: forbidden, requireOwner: forbidden, ROLE_PERMISSIONS: {} },
    activity: { logActivity: forbidden },
  }
  function synthetic(key) {
    if (cache.has(key)) return cache.get(key)
    const values = externals[key]
    if (!values) throw new Error('Unreviewed fixture import: ' + key)
    const module = new vm.SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value)
    }, { context, identifier: 'offline:' + key })
    cache.set(key, module)
    return module
  }
  function source(url) {
    if (cache.has(url.href)) return cache.get(url.href)
    const relative = url.href.slice(sourceRoot.href.length)
    if (!allowed.has(relative)) throw new Error('Unreviewed source module: ' + relative)
    const module = new vm.SourceTextModule(fs.readFileSync(url, 'utf8'), { context, identifier: url.href })
    cache.set(url.href, module)
    return module
  }
  async function linker(specifier, parent) {
    if (!specifier.startsWith('.')) return synthetic(specifier)
    const url = new URL(specifier, parent.identifier)
    if (url.href.endsWith('/models.js')) return synthetic('models')
    if (url.href.endsWith('/middleware/auth.js')) return synthetic('auth')
    if (url.href.endsWith('/utils/activity.js')) return synthetic('activity')
    return source(url)
  }
  async function load(relative) {
    const module = source(new URL(relative, sourceRoot))
    if (module.status === 'unlinked') await module.link(linker)
    if (module.status === 'linked') await module.evaluate()
    return module.namespace
  }
  const mailer = await load('utils/mailer.js')
  return { mailer, load, options, payloads, messages, logs, get verifies() { return verifies }, get reads() { return reads } }
}

const input = { to: 'recipient@example.invalid', subject: 'Fixture — ₦ café ✓', html: '<p>Fixture — ₦ café ✓</p>' }
function decodedHeader(value) {
  // RFC 2047: folding whitespace BETWEEN adjacent encoded words is not content.
  // Preserve whitespace encoded inside each word and ordinary subject whitespace.
  return value.replace(/\r\n[ \t]+/g, ' ')
    .replace(/(=\?UTF-8\?[BQ]\?[^?]*\?=)[ \t]+(?==\?UTF-8\?[BQ]\?)/gi, '$1')
    .replace(/=\?UTF-8\?B\?([^?]+)\?=/gi, (_m, text) => Buffer.from(text, 'base64').toString('utf8'))
    .replace(/=\?UTF-8\?Q\?([^?]+)\?=/gi, (_m, text) => Buffer.from(text.replace(/_/g, ' ').replace(/=([a-f\d]{2})/gi, (_n, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1').toString('utf8'))
}
function decoded(info) {
  const raw = info.message.toString('utf8'), split = raw.indexOf('\r\n\r\n')
  const headers = raw.slice(0, split), body = raw.slice(split + 4)
  let html = body
  if (/Content-Transfer-Encoding: base64/i.test(headers)) html = Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8')
  if (/Content-Transfer-Encoding: quoted-printable/i.test(headers)) html = Buffer.from(body.replace(/=\r\n/g, '').replace(/=([a-f\d]{2})/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1').toString('utf8')
  const subject = decodedHeader(headers.replace(/\r\n[ \t]+/g, ' ').match(/^Subject: (.*)$/m)?.[1] || '')
  return { raw, headers, html, subject }
}

test('fixture decoder handles adjacent folded encoded words without hiding real whitespace changes', () => {
  assert.equal(decodedHeader('=?UTF-8?Q?caf=C3=A9_?=\r\n\t=?UTF-8?B?4pyT?='), 'café ✓')
  assert.equal(decodedHeader('plain   subject'), 'plain   subject')
})

test('default SMTP config, timeouts, sender and success/boolean contracts remain intact', async () => {
  const h = await harness()
  assert.deepEqual({ ...await h.mailer.sendMailResult(input) }, { ok: true })
  assert.equal(await h.mailer.sendMail(input), true)
  assert.equal(h.options.length, 1)
  assert.deepEqual({ ...h.options[0] }, { host: 'mail.maximsinterior.com.ng', port: 465, secure: true, auth: undefined, connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000 })
  assert.equal(h.payloads[0].from, 'Maxims Interiors <info@maximsinterior.com.ng>')
  assert.deepEqual(h.messages[0].envelope.to, ['recipient@example.invalid'])
})

test('explicit 465 and 587 preserve TLS/auth settings without disabling certificate validation', async () => {
  for (const [port, secure] of [[465, true], [587, false]]) {
    const h = await harness({ SMTP_HOST: 'smtp.example.invalid', SMTP_PORT: String(port), SMTP_SECURE: String(secure), SMTP_USER: 'fixture-user', SMTP_PASS: 'fixture-password', MAIL_FROM: 'Fixture <sender@example.invalid>' })
    assert.equal(await h.mailer.sendMail(input), true)
    assert.equal(h.options[0].port, port); assert.equal(h.options[0].secure, secure)
    assert.equal(h.options[0].auth.user, 'fixture-user'); assert.equal(h.options[0].auth.pass, 'fixture-password')
    assert.equal(h.options[0].tls, undefined); assert.equal(h.options[0].ignoreTLS, undefined)
    assert.equal(h.payloads[0].from, 'Fixture <sender@example.invalid>')
  }
})

test('587 without explicit SMTP_SECURE retains the existing true default, documenting its configuration gate', async () => {
  const h = await harness({ SMTP_PORT: '587' })
  await h.mailer.sendMail(input)
  assert.equal(h.options[0].secure, true)
  assert.equal(h.options[0].requireTLS, undefined)
})

test('to arrays, cc and replyTo survive MIME/envelope compilation; extra message options stay excluded', async () => {
  const h = await harness()
  await h.mailer.sendMail({ ...input, to: ['one@example.invalid', 'two@example.invalid'], cc: 'copy@example.invalid', replyTo: 'Reply <reply@example.invalid>', raw: '/never-read', attachments: [{ path: '/never-read' }], headers: { Bcc: 'unexpected@example.invalid' } })
  assert.deepEqual(h.messages[0].envelope.to, ['one@example.invalid', 'two@example.invalid', 'copy@example.invalid'])
  assert.match(decoded(h.messages[0]).headers, /Reply-To: Reply <reply@example.invalid>/)
  assert.equal(h.payloads[0].raw, undefined); assert.equal(h.payloads[0].attachments, undefined); assert.equal(h.payloads[0].headers, undefined)
})

test('UTF-8 subjects and branded HTML round trip through real stream transport', async () => {
  const h = await harness(), templates = await h.load('utils/templates.js')
  const html = templates.emailShell({ heading: 'Fixture café', body: '<p>₦69,000 — Zoë ✓</p>' })
  await h.mailer.sendMail({ ...input, html })
  const message = decoded(h.messages[0])
  assert.equal(message.subject, input.subject)
  assert.equal(message.html.replace(/\r\n/g, '\n').trim(), html.replace(/\r\n/g, '\n').trim())
  assert.match(message.headers, /Content-Type: text\/html; charset=utf-8/i)
})

test('stream fixture rejects file/URL content without reading a file or making a request', async () => {
  for (const html of [{ path: 'offline-forbidden-file' }, { href: 'https://never.example.invalid/blocked' }]) {
    const h = await harness()
    const result = await h.mailer.sendMailResult({ ...input, html })
    assert.equal(result.ok, false)
    assert.match(result.error, /access rejected/i)
    assert.equal(h.messages.length, 0)
  }
  assert.equal(fileAttempts, 0); assert.equal(networkAttempts, 0)
})

test('CRLF in subject/display-name cannot introduce a new Bcc header or recipient', async () => {
  const h = await harness()
  await h.mailer.sendMail({ ...input, subject: 'Fixture\r\nBcc: injected@example.invalid', replyTo: { name: 'Fixture\r\nBcc: injected@example.invalid', address: 'reply@example.invalid' } })
  const { headers } = decoded(h.messages[0])
  assert.ok(!/^Bcc:/mi.test(headers))
  assert.deepEqual(h.messages[0].envelope.to, ['recipient@example.invalid'])
})

test('transport creation/send failures preserve structured and boolean failure returns', async () => {
  for (const [code, behaviour] of [['EAUTH', 'sendError'], ['ENOAUTH', 'sendError'], ['ETLS', 'createError']]) {
    const error = Object.assign(new Error('offline failure'), { code })
    const h = await harness({}, { [behaviour]: error })
    assert.deepEqual({ ...await h.mailer.sendMailResult(input) }, { ok: false, error: code + ': offline failure' })
    assert.equal(await h.mailer.sendMail(input), false)
  }
  const h = await harness({}, { sendError: new Error('offline failure') })
  assert.deepEqual({ ...await h.mailer.sendMailResult(input) }, { ok: false, error: 'offline failure' })
})

test('verify success/failure stays stubbed and never compiles or sends a message', async () => {
  const h = await harness()
  assert.deepEqual({ ...await h.mailer.verifySmtp() }, { ok: true })
  assert.equal(h.verifies, 1); assert.equal(h.payloads.length, 0)
  const failed = await harness({}, { verifyError: Object.assign(new Error('offline login failure'), { code: 'EAUTH' }) })
  assert.deepEqual({ ...await failed.mailer.verifySmtp() }, { ok: false, error: 'EAUTH: offline login failure' })
  assert.equal(failed.payloads.length, 0)
})

test('unsupported provider still warns once and uses the same SMTP config', async () => {
  const h = await harness({ EMAIL_PROVIDER: 'unsupported-offline' })
  await h.mailer.sendMail(input); await h.mailer.sendMail(input)
  assert.equal(h.logs.length, 1); assert.equal(h.options.length, 1)
})

test('actual staff invite helper preserves escaped payload, 72h signed link and success/failure URL', async () => {
  for (const failure of [false, true]) {
    const h = await harness({}, failure ? { sendError: Object.assign(new Error('offline failure'), { code: 'EAUTH' }) } : {})
    const invite = await h.load('utils/staffInvite.js')
    const result = await invite.sendSetupEmail(user, { invitedBy: 'Owner<&' })
    assert.equal(result.ok, !failure)
    const url = new URL(result.url), token = jwt.verify(url.searchParams.get('token'), fixtureSecret)
    assert.equal(url.hostname, 'maxims.example.invalid'); assert.equal(url.searchParams.get('welcome'), '1')
    assert.equal(token.id, user.id); assert.equal(token.pv, 5); assert.equal(token.purpose, 'pwreset'); assert.equal(token.exp - token.iat, 72 * 3600)
    assert.equal(h.payloads[0].to, user.email); assert.equal(h.payloads[0].subject, 'Your Maxims admin account is ready')
    assert.ok(h.payloads[0].html.includes('Owner&lt;&amp;')); assert.ok(h.payloads[0].html.includes('Zoë&lt;&amp;'))
    assert.ok(h.payloads[0].html.includes(result.url)); assert.ok(h.payloads[0].html.includes('Set my password'))
    if (!failure) assert.ok(decoded(h.messages[0]).html.includes(result.url))
  }
})

test('actual forgot-password handler preserves 1h reset payload and non-enumerating result even on mail failure', async () => {
  for (const behaviour of [{}, { sendError: Object.assign(new Error('offline failure'), { code: 'EAUTH' }) }, { absent: true }, { inactive: true }]) {
    const h = await harness({}, behaviour), auth = await h.load('routes/auth.js')
    const handler = auth.default.stack.find((layer) => layer.route?.path === '/forgot-password').route.stack.at(-1).handle
    let response
    await handler({ body: { email: user.email } }, { json(value) { response = value } }, (error) => { throw error })
    assert.equal(response.ok, true); assert.equal(h.reads, 1)
    assert.equal(response.message, 'If that email belongs to a staff account, a reset link is on its way. Check your inbox and spam folder.')
    if (behaviour.absent || behaviour.inactive) { assert.equal(h.payloads.length, 0); continue }
    assert.equal(h.payloads[0].subject, 'Reset your Maxims admin password')
    assert.ok(h.payloads[0].html.includes('Hello Zoë&lt;&amp;'))
    const url = new URL(h.payloads[0].html.match(/href="([^"]*\/admin\/reset-password\?token=[^"]*)"/)[1])
    const token = jwt.verify(url.searchParams.get('token'), fixtureSecret)
    assert.equal(token.id, user.id); assert.equal(token.pv, 5); assert.equal(token.purpose, 'pwreset'); assert.equal(token.exp - token.iat, 3600)
    assert.equal(url.searchParams.has('welcome'), false)
  }
})

test('actual staff notification helper preserves recipient defaults and custom recipients', async () => {
  for (const configured of [false, true]) {
    const h = await harness(configured ? { BUSINESS_NOTIFY_EMAILS: 'one@example.invalid,two@example.invalid,one@example.invalid' } : {})
    const notify = await h.load('utils/notify.js')
    assert.equal(await notify.notifyStaff({ subject: input.subject, heading: 'Fixture', body: input.html, replyTo: 'reply@example.invalid', adminPath: '/admin/orders' }), true)
    assert.deepEqual(Array.from(h.payloads[0].to), configured ? ['one@example.invalid', 'two@example.invalid'] : ['info@maximsinterior.com.ng', 'support@maximsinterior.com.ng', 'christinegadzama@maximsinterior.com.ng'])
    assert.equal(h.payloads[0].replyTo, 'reply@example.invalid')
    assert.ok(h.payloads[0].html.includes('https://maxims.example.invalid/admin/orders'))
  }
})

test('offline fixture did not open network access or a database pool', () => {
  assert.equal(networkAttempts, 0); assert.equal(fileAttempts, 0); assert.equal(globalThis.__maximsPool, undefined)
})
