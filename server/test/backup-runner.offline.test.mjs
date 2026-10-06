// Synthetic dependencies only. Never call main(), native spawn, SSH, DPAPI or a DB.
import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'
import { createHash, randomBytes } from 'node:crypto'
import { verifyToolIntegrity, validatePrivateAcl, readBoundedPrivateFile } from '../scripts/backup-guards.mjs'
import { validateManifest, boundedProcess, readPrivateBackup } from '../scripts/private-mongo-backup.mjs'
import { buildRemoteSource, memoryConfigBridge } from '../scripts/backup-remote.mjs'
import { unpackPayload, packPayload, encryptBuffer, decryptBuffer } from '../scripts/backup-envelope.mjs'

const ROOT = '/home/gadzamac/.local/maxims-backup-tools-20261006'
const FOLDER = ROOT + '/mongodb-database-tools-rhel88-x86_64-100.19.1'
const TOOL = FOLDER + '/bin/mongodump'
const PACKAGE_HASH = '6c04444b5bcc3d4a1a02ec5f93d29386aa374aab70cd00ebaba334e4f0f2e77c'
const TOOL_HASH = 'e2b1ef87ad7a6eed8d62afe5c4e85098d1e3d4d4cb22b5242ee6a1f6ff2dca33'
const MAX = 64 * 1024 * 1024
const PACKAGE_MAX = 128 * 1024 * 1024
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
const PS5_MODULES = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'
const SID = 'S-1-5-21-100-200-300-1001'
const PRIVATE = 'synthetic-private-diagnostic'
const names = ['users', 'products', 'orders', 'bulkrequests', 'appointments', 'messages',
  'galleries', 'testimonials', 'teammembers', 'settings', 'activities', 'newsletters', 'transactions']
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const generic = (action, message) => assert.throws(action, (error) =>
  error instanceof Error && error.message === message && error.cause === undefined)

function toolFixture() {
  const files = new Map([[ROOT + '/tools.tgz', Buffer.from('synthetic-package')], [TOOL, Buffer.from('synthetic-executable')]])
  const paths = [ROOT, FOLDER, FOLDER + '/bin', ROOT + '/tools.tgz', TOOL]
  const stats = new Map(paths.map((p) => [p, {
    uid: 1001, mode: files.has(p) ? 0o100755 : 0o40755, size: files.get(p)?.length || 0,
    isSymbolicLink: () => false, isFile: () => files.has(p), isDirectory: () => !files.has(p),
  }]))
  const reads = [], hashes = []
  const fs = {
    statSync(p) { if (p === '/home/gadzamac') return { uid: 1001 }; return stats.get(p) },
    lstatSync(p) { if (!stats.has(p)) throw new Error(PRIVATE); return stats.get(p) },
    readFileSync(p) { reads.push(p); if (!files.has(p)) throw new Error(PRIVATE); return files.get(p) },
  }
  const hash = (algorithm) => {
    assert.equal(algorithm, 'sha256')
    let bytes
    return {
      update(value) { bytes = value; hashes.push(value); return this },
      digest(format) {
        assert.equal(format, 'hex')
        if (bytes.equals(Buffer.from('synthetic-package'))) return PACKAGE_HASH
        if (bytes.equals(Buffer.from('synthetic-executable'))) return TOOL_HASH
        return '0'.repeat(64)
      },
    }
  }
  return { fs, hash, files, stats, reads, hashes, paths }
}

test('tool guard binds package and executable fingerprints with injected fs/hash only', () => {
  const f = toolFixture()
  assert.equal(verifyToolIntegrity(f.fs, f.hash), TOOL)
  assert.deepEqual(f.reads, [ROOT + '/tools.tgz', TOOL])
  assert.equal(f.hashes.length, 2)
})

for (const [label, mutate] of [
  ['symlink', (s) => { s.isSymbolicLink = () => true }],
  ['wrong owner', (s) => { s.uid = 9999 }],
  ['group writable', (s) => { s.mode |= 0o020 }],
  ['world writable', (s) => { s.mode |= 0o002 }],
  ['wrong object type', (s) => { s.isFile = () => false; s.isDirectory = () => false }],
]) {
  test(`every checked tool path rejects ${label} before reading bytes`, () => {
    for (const p of toolFixture().paths) {
      const f = toolFixture(); mutate(f.stats.get(p))
      generic(() => verifyToolIntegrity(f.fs, f.hash), 'Backup tool rejected')
      assert.equal(f.reads.length, 0)
    }
  })
}

test('non-executable tool rejects before hashing', () => {
  const f = toolFixture(); f.stats.get(TOOL).mode &= ~0o111
  generic(() => verifyToolIntegrity(f.fs, f.hash), 'Backup tool rejected')
  assert.equal(f.reads.length, 0)
})

for (const p of [ROOT + '/tools.tgz', TOOL]) {
  test(`changed bytes reject despite other fingerprint remaining valid: ${p === TOOL ? 'executable' : 'package'}`, () => {
    const f = toolFixture(); f.files.set(p, Buffer.from('synthetic-replaced-bytes'))
    generic(() => verifyToolIntegrity(f.fs, f.hash), 'Backup tool rejected')
  })
}

test('oversized stat sizes reject before reading package/executable bytes', () => {
  for (const p of [ROOT + '/tools.tgz', TOOL]) {
    const f = toolFixture(); f.stats.get(p).size = (p === TOOL ? MAX : PACKAGE_MAX) + 1
    generic(() => verifyToolIntegrity(f.fs, f.hash), 'Backup tool rejected')
    assert.equal(f.reads.length, 0); assert.equal(f.hashes.length, 0)
  }
})

test('post-read size check also rejects growth beyond package/executable bounds', () => {
  for (const p of [ROOT + '/tools.tgz', TOOL]) {
    const f = toolFixture(); f.files.set(p, { length: (p === TOOL ? MAX : PACKAGE_MAX) + 1 })
    generic(() => verifyToolIntegrity(f.fs, f.hash), 'Backup tool rejected')
    assert.equal(f.hashes.length, 0)
  }
})

test('vendor package stat size 77873288 and inclusive stat ceilings are allowed', () => {
  for (const packageSize of [77873288, PACKAGE_MAX]) {
    const f = toolFixture(); f.stats.get(ROOT + '/tools.tgz').size = packageSize
    f.stats.get(TOOL).size = MAX
    assert.equal(verifyToolIntegrity(f.fs, f.hash), TOOL)
  }
})

function aclFixture(directory) {
  return { currentSid: SID, ownerSid: SID, reparsePoint: false, directory, protected: directory,
    rules: [SID, 'S-1-5-18', 'S-1-5-32-544'].map((sid) => ({ sid, allow: true, fullControl: true,
      propagationNone: true, inherited: !directory, objectInherit: directory, containerInherit: directory })) }
}

test('directory and inherited-file ACL profiles pass with exact distinct principals', () => {
  for (const directory of [true, false]) assert.equal(validatePrivateAcl(aclFixture(directory), directory), true)
})

for (const [label, mutate] of [
  ['owner mismatch', (a) => { a.ownerSid = 'S-1-5-18' }],
  ['invalid current SID', (a) => { a.currentSid = 'S-1-5-18' }],
  ['reparse point', (a) => { a.reparsePoint = true }],
  ['wrong object type', (a) => { a.directory = !a.directory }],
  ['wrong protection', (a) => { a.protected = !a.protected }],
  ['extra principal', (a) => { a.rules.push({ ...a.rules[0], sid: 'S-1-1-0' }) }],
  ['missing principal', (a) => { a.rules.pop() }],
  ['duplicate principal', (a) => { a.rules[1].sid = a.rules[0].sid }],
  ['untrusted principal', (a) => { a.rules[1].sid = 'S-1-1-0' }],
  ['deny entry', (a) => { a.rules[0].allow = false }],
  ['partial rights', (a) => { a.rules[0].fullControl = false }],
  ['propagation restriction', (a) => { a.rules[0].propagationNone = false }],
  ['wrong inherited flag', (a) => { a.rules[0].inherited = !a.rules[0].inherited }],
  ['wrong file inheritance', (a) => { a.rules[0].objectInherit = !a.rules[0].objectInherit }],
  ['wrong directory inheritance', (a) => { a.rules[0].containerInherit = !a.rules[0].containerInherit }],
]) {
  test(`ACL profiles reject ${label}`, () => {
    for (const directory of [true, false]) {
      const acl = aclFixture(directory); mutate(acl)
      generic(() => validatePrivateAcl(acl, directory), 'Private folder rejected')
    }
  })
}

function manifestFixture() {
  const archive = randomBytes(128); archive[0] = 0x1f; archive[1] = 0x8b
  const manifest = { format: 'maxims-mongo-preservation-1', createdAt: '2026-10-06T12:00:00.000Z',
    startedAt: '2026-10-06T11:59:00.000Z', serverVersion: '8.0.34', toolsVersion: '100.19.1',
    observedStable: true, pointInTime: false, writeFreeze: false, restoreVerified: false, mediaVerified: false,
    snapshot: { database: 'synthetic_fixture', collections: names.map((name) => ({ name, count: 1,
      documentDigest: '1'.repeat(64), metadataDigest: '2'.repeat(64) })) },
    archiveBytes: archive.length, archiveSha256: sha(archive) }
  return { manifest, archive }
}

function privateFileFixture(hooks = {}) {
  const filename = '/synthetic-private-file'
  const state = { content: randomBytes(8), fd: 42, opened: false, reads: 0, closed: [],
    lstats: 0, fstats: 0, scratch: null, aclCalls: 0 }
  state.file = { dev: 7, ino: 11, size: 8, mtimeMs: 1000, ctimeMs: 2000,
    isFile: () => true, isSymbolicLink: () => false }
  state.atPath = state.file
  const fs = {
    lstatSync(p) {
      assert.equal(p, filename); state.lstats++
      hooks.lstat?.(state)
      return { ...state.atPath }
    },
    openSync(p, flags) {
      assert.equal(p, filename); assert.equal(flags, 'r')
      hooks.open?.(state); state.opened = true
      return state.fd
    },
    fstatSync(fd) {
      assert.equal(fd, state.fd); assert.equal(state.opened, true)
      state.fstats++; hooks.fstat?.(state)
      return { ...state.file }
    },
    readSync(fd, target, offset, length, position) {
      assert.equal(fd, state.fd); assert.equal(state.opened, true)
      state.reads++; state.scratch = target
      assert.ok(target.length <= 9); assert.equal(position, offset)
      hooks.read?.(state)
      const size = Math.max(0, Math.min(length, hooks.chunkSize || 3, state.content.length - position))
      state.content.copy(target, offset, position, position + size)
      return size
    },
    closeSync(fd) { assert.equal(fd, state.fd); state.closed.push(fd); state.opened = false },
    readFileSync() { throw new Error('Path-based reads are forbidden in this synthetic fixture') },
  }
  const checkAcl = async (p, directory) => {
    assert.equal(p, filename); assert.equal(directory, false); assert.equal(state.opened, true)
    state.aclCalls++; await hooks.acl?.(state)
  }
  return { fs, state, filename, checkAcl }
}

const privateFileError = (e) => e instanceof Error && e.message === 'Private backup file rejected' && e.cause === undefined
const assertClosedAndWiped = (state) => {
  assert.deepEqual(state.closed, [state.fd]); assert.equal(state.opened, false)
  if (state.scratch) assert.deepEqual(state.scratch, Buffer.alloc(state.scratch.length))
}

test('held-file read returns independent exact bytes with short reads and wipes scratch on success', async () => {
  const f = privateFileFixture(), original = Buffer.from(f.state.content)
  const result = await readBoundedPrivateFile(f.fs, f.filename, 8, f.checkAcl)
  assert.deepEqual(result, original); assert.equal(f.state.aclCalls, 1)
  assert.ok(f.state.reads > 1); assert.equal(f.state.scratch.length, 9)
  assertClosedAndWiped(f.state)
  result.fill(0); assert.deepEqual(f.state.content, original)
})

test('held-file limit and initial file validation reject before opening', async () => {
  for (const limit of [0, -1, 1.5, NaN, MAX + 34]) {
    const f = privateFileFixture()
    await assert.rejects(readBoundedPrivateFile(f.fs, f.filename, limit, f.checkAcl), privateFileError)
    assert.equal(f.state.opened, false); assert.equal(f.state.lstats, 0); assert.equal(f.state.closed.length, 0)
  }
  for (const mutate of [
    (s) => { s.size = 0 }, (s) => { s.size = 9 }, (s) => { s.size = 1.5 },
    (s) => { s.isFile = () => false }, (s) => { s.isSymbolicLink = () => true },
  ]) {
    const f = privateFileFixture(); mutate(f.state.file)
    await assert.rejects(readBoundedPrivateFile(f.fs, f.filename, 8, f.checkAcl), privateFileError)
    assert.equal(f.state.aclCalls, 0); assert.equal(f.state.reads, 0); assert.equal(f.state.closed.length, 0)
  }
})

for (const [label, hooks] of [
  ['replacement during open', { open: (s) => { s.file = { ...s.file, ino: 22 }; s.atPath = s.file } }],
  ['growth during ACL check', { acl: (s) => { s.file.size++ } }],
  ['truncation during ACL check', { acl: (s) => { s.file.size-- } }],
  ['path replacement during ACL check', { acl: (s) => { s.atPath = { ...s.file, ino: 22 } } }],
  ['symlink replacement during ACL check', { acl: (s) => { s.atPath = { ...s.file, isSymbolicLink: () => true } } }],
  ['ACL failure', { acl: () => { throw new Error(PRIVATE) } }],
]) {
  test(`held-file ${label} rejects before reading and closes descriptor`, async () => {
    const f = privateFileFixture(hooks)
    await assert.rejects(readBoundedPrivateFile(f.fs, f.filename, 8, f.checkAcl), privateFileError)
    assert.equal(f.state.reads, 0); assertClosedAndWiped(f.state)
  })
}

for (const [label, mutate] of [
  ['growth', (s) => { s.content = Buffer.concat([s.content, Buffer.from([123])]); s.file.size++ }],
  ['truncation', (s) => { s.content = s.content.subarray(0, 5); s.file.size = 5 }],
  ['path replacement', (s) => { s.atPath = { ...s.file, ino: 22 } }],
  ['same-size mtime change', (s) => { s.file.mtimeMs++ }],
  ['same-size ctime change', (s) => { s.file.ctimeMs++ }],
  ['native read failure', () => { throw new Error(PRIVATE) }],
]) {
  test(`held-file ${label} during reads rejects and wipes partial bytes`, async () => {
    const f = privateFileFixture({ read: (state) => { if (state.reads === 2) mutate(state) } })
    await assert.rejects(readBoundedPrivateFile(f.fs, f.filename, 16, f.checkAcl), privateFileError)
    assert.ok(f.state.reads >= 2); assertClosedAndWiped(f.state)
  })
}

test('held-file open failure is generic and does not close an unacquired descriptor', async () => {
  const f = privateFileFixture({ open: () => { throw new Error(PRIVATE) } })
  await assert.rejects(readBoundedPrivateFile(f.fs, f.filename, 8, f.checkAcl), privateFileError)
  assert.equal(f.state.closed.length, 0); assert.equal(f.state.aclCalls, 0)
})

test('held-file descriptor zero is still closed on rejection', async () => {
  const f = privateFileFixture({ acl: () => { throw new Error(PRIVATE) } }); f.state.fd = 0
  await assert.rejects(readBoundedPrivateFile(f.fs, f.filename, 8, f.checkAcl), privateFileError)
  assertClosedAndWiped(f.state)
})

for (const field of ['size', 'mtimeMs', 'ctimeMs']) {
  test(`held-file rejects final path ${field} drift after descriptor inspection`, async () => {
    const f = privateFileFixture({ lstat: (state) => {
      if (state.lstats === 3) state.atPath = { ...state.file, [field]: state.file[field] + 1 }
    } })
    await assert.rejects(readBoundedPrivateFile(f.fs, f.filename, 16, f.checkAcl), privateFileError)
    assertClosedAndWiped(f.state)
  })
}

async function privateReaderFixture({ basename = 'backup-11111111-1111-4111-8111-111111111111', tamper = false, badDigest = false, rootFailure = false } = {}) {
  const { manifest, archive } = manifestFixture(), key = randomBytes(32)
  if (badDigest) manifest.archiveSha256 = '0'.repeat(64)
  const encrypted = encryptBuffer(packPayload(manifest, archive), key)
  if (tamper) encrypted[17] ^= 1
  const reads = [], captured = { key: null, plain: null, archive: null, roots: 0 }
  const root = '/synthetic-private-root', fs = {}, checkAcl = () => {}
  const isolated = new vm.Script('(' + readPrivateBackup.toString() + ')').runInNewContext({
    ROOT: root, MAX, fs, path: { join: (...parts) => parts.join('/') }, checkPrivateAcl: checkAcl,
    fail: () => new Error('Private backup operation failed'),
    checkPrivateRoot: async () => { captured.roots++; if (rootFailure) throw new Error(PRIVATE) },
    readBoundedPrivateFile: async (passedFs, filename, limit, passedAcl) => {
      assert.equal(passedFs, fs); assert.equal(passedAcl, checkAcl)
      reads.push({ filename, limit })
      if (filename.endsWith('.key.dpapi')) return Buffer.from('synthetic-sealed-key')
      return Buffer.from(encrypted)
    },
    protectKey: async (sealed, unprotect) => {
      assert.equal(sealed.toString(), 'synthetic-sealed-key'); assert.equal(unprotect, true)
      captured.key = Buffer.from(key); return captured.key
    },
    decryptBuffer: (bytes, suppliedKey) => {
      captured.plain = decryptBuffer(bytes, suppliedKey); return captured.plain
    },
    unpackPayload: (plain) => {
      const result = unpackPayload(plain); captured.archive = result.archive; return result
    },
    validateManifest,
  })
  return { promise: isolated(basename), reads, captured, manifest, archive }
}

test('private reader uses both bounded guards, returns private archive independently and wipes key/plain', async () => {
  const f = await privateReaderFixture(), result = await f.promise
  assert.deepEqual(result.manifest, f.manifest); assert.deepEqual(result.archive, f.archive)
  assert.deepEqual(f.reads.map((r) => r.limit), [8192, MAX + 33])
  assert.equal(f.captured.roots, 1)
  assert.deepEqual(f.captured.key, Buffer.alloc(32)); assert.deepEqual(f.captured.plain, Buffer.alloc(f.captured.plain.length))
})

for (const [label, options] of [['authentication failure', { tamper: true }], ['archive digest mismatch', { badDigest: true }]]) {
  test(`private reader ${label} returns nothing and wipes assigned sensitive buffers`, async () => {
    const f = await privateReaderFixture(options)
    await assert.rejects(f.promise, (e) => e.message === 'Private backup operation failed' && e.cause === undefined)
    assert.deepEqual(f.captured.key, Buffer.alloc(32))
    if (f.captured.plain) assert.deepEqual(f.captured.plain, Buffer.alloc(f.captured.plain.length))
    if (f.captured.archive) assert.deepEqual(f.captured.archive, Buffer.alloc(f.captured.archive.length))
  })
}

test('private reader rejects traversal, paths, extensions and root ACL failure before reading', async () => {
  for (const basename of [null, '../backup-11111111-1111-4111-8111-111111111111', '/absolute', 'backup-invalid', 'backup-11111111-1111-4111-8111-111111111111.mxb']) {
    const f = await privateReaderFixture({ basename })
    await assert.rejects(f.promise, (e) => e.message === 'Private backup operation failed')
    assert.equal(f.captured.roots, 0); assert.equal(f.reads.length, 0)
  }
  const f = await privateReaderFixture({ rootFailure: true })
  await assert.rejects(f.promise, (e) => e.message === 'Private backup operation failed')
  assert.equal(f.reads.length, 0)
})

test('valid manifest returns only public summary, not inventory/digests/documents', () => {
  const { manifest, archive } = manifestFixture(), before = structuredClone(manifest)
  assert.deepEqual(validateManifest(manifest, archive), { collections: 13, records: 13, archiveBytes: 128,
    serverVersion: '8.0.34', observedStable: true, pointInTime: false, restoreVerified: false, mediaVerified: false })
  assert.deepEqual(manifest, before)
})

test('manifest format/version/acceptance flags/date/database gates fail closed', () => {
  const mutations = [
    (m) => { m.format = 'unknown' }, (m) => { m.serverVersion = 'other' }, (m) => { m.toolsVersion = 'other' },
    ...['observedStable', 'pointInTime', 'writeFreeze', 'restoreVerified', 'mediaVerified'].map((field) => (m) => { m[field] = !m[field] }),
    (m) => { m.createdAt = 'invalid' }, (m) => { m.startedAt = 'invalid' },
    ...['admin', 'config', 'local', 'test', 'invalid/name', ''].map((database) => (m) => { m.snapshot.database = database }),
  ]
  for (const mutate of mutations) {
    const { manifest, archive } = manifestFixture(); mutate(manifest)
    generic(() => validateManifest(manifest, archive), 'Private backup operation failed')
  }
})

test('manifest unknown/duplicate collections, counts and malformed digests reject', () => {
  const mutations = [
    (m) => { m.snapshot.collections.pop() }, (m) => { m.snapshot.collections = null },
    (m) => { m.snapshot.collections[0].name = 'unknown' }, (m) => { m.snapshot.collections[1].name = 'users' },
    (m) => { m.snapshot.collections[0] = null },
    ...[-1, 10001, 1.5, Number.MAX_SAFE_INTEGER + 1, '1'].map((count) => (m) => { m.snapshot.collections[0].count = count }),
    (m) => { for (const c of m.snapshot.collections) c.count = 0 },
    (m) => { m.snapshot.collections[0].documentDigest = PRIVATE },
    (m) => { m.snapshot.collections[0].metadataDigest = 'A'.repeat(64) },
  ]
  for (const mutate of mutations) {
    const { manifest, archive } = manifestFixture(); mutate(manifest)
    generic(() => validateManifest(manifest, archive), 'Private backup operation failed')
  }
  const { manifest, archive } = manifestFixture(); manifest.snapshot.collections[0].count = 10000
  assert.equal(validateManifest(manifest, archive).records, 10012)
})

test('archive bounds/magic/length/fingerprint gates reject, without claiming gzip restore validity', () => {
  for (const change of ['body', 'magic', 'length', 'digest', 'short', 'nonbuffer']) {
    const fixture = manifestFixture()
    if (change === 'body') fixture.archive[32] ^= 1
    if (change === 'magic') fixture.archive[0] = 0
    if (change === 'length') fixture.manifest.archiveBytes++
    if (change === 'digest') fixture.manifest.archiveSha256 = '0'.repeat(64)
    if (change === 'short') fixture.archive = Buffer.alloc(31)
    if (change === 'nonbuffer') fixture.archive = new Uint8Array(128)
    generic(() => validateManifest(fixture.manifest, fixture.archive), 'Private backup operation failed')
  }
})

function fakeChild(plan = {}) {
  const child = new EventEmitter(), calls = { killed: 0, input: null }
  child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.stdin = new EventEmitter()
  child.kill = () => { calls.killed++; queueMicrotask(() => child.emit('close', null)); return true }
  child.stdin.end = (input) => {
    calls.input = Buffer.from(input)
    queueMicrotask(() => {
      for (const chunk of plan.stdout || []) child.stdout.emit('data', chunk)
      for (const chunk of plan.stderr || []) child.stderr.emit('data', chunk)
      if (plan.error) child.emit('error', new Error(PRIVATE))
      if (plan.stdinError) child.stdin.emit('error', new Error(PRIVATE))
      if (!plan.neverClose) child.emit('close', plan.code === undefined ? 0 : plan.code)
    })
  }
  return { child, calls }
}

async function syntheticProcess(plan, options, verify, command = 'synthetic-never-executed') {
  const fake = fakeChild(plan)
  const environment = { PSModulePath: 'synthetic-PS7-modules', FIXTURE_ONLY: 'synthetic' }
  const before = { ...environment }
  let spawned = 0
  const spawn = (calledCommand, args, configuration) => {
    spawned++
    assert.equal(calledCommand, command); assert.deepEqual(args, ['fixture'])
    assert.deepEqual(Array.from(configuration.stdio), ['pipe', 'pipe', 'pipe'])
    assert.equal(configuration.windowsHide, true)
    // Only inspect synthetic properties. Never assert/dump a real process env.
    assert.deepEqual(Object.fromEntries(Object.entries(configuration.env)), {
      ...before, PSModulePath: command === POWERSHELL ? PS5_MODULES : before.PSModulePath,
    })
    return fake.child
  }
  // Exercise the actual function body with every ambient capability replaced.
  // No global monkeypatches, native spawn or real process/environment inspection.
  const isolated = new vm.Script('(' + boundedProcess.toString() + ')').runInNewContext({
    spawn, MAX, POWERSHELL, Buffer, setTimeout, clearTimeout, process: { env: environment },
    fail: () => new Error('Private backup operation failed'),
  })
  await verify(isolated(command, ['fixture'], Buffer.from([0, 255, 128]), options), fake)
  assert.equal(spawned, 1); assert.deepEqual(fake.calls.input, Buffer.from([0, 255, 128]))
  assert.deepEqual(environment, before)
}

test('boundedProcess preserves binary chunks exactly and never forwards private stderr', async () => {
  const first = Buffer.from([0, 255]), second = Buffer.from([128, 13, 10]), expected = Buffer.concat([first, second])
  await syntheticProcess({ stdout: [first, second], stderr: [Buffer.from(PRIVATE)] }, { limit: 5 }, async (result) => {
    assert.deepEqual(await result, expected)
    assert.deepEqual(first, Buffer.alloc(2)); assert.deepEqual(second, Buffer.alloc(3))
  })
})

for (const [label, plan, options] of [
  ['stdout overflow', { stdout: [Buffer.alloc(4), Buffer.alloc(2)] }, { limit: 5 }],
  ['stderr overflow', { stderr: [Buffer.alloc(65536), Buffer.from([1])] }, {}],
  ['nonzero exit', { stdout: [Buffer.from(PRIVATE)], code: 3 }, {}],
  ['signal exit', { code: null }, {}],
  ['spawn error', { error: true }, {}],
  ['stdin error', { stdinError: true }, {}],
  ['timeout', { neverClose: true }, { timeout: 5 }],
]) {
  test(`boundedProcess rejects ${label} generically`, async () => {
    await syntheticProcess(plan, options, async (result, fake) => {
      await assert.rejects(result, (e) => e.message === 'Private backup operation failed' && e.cause === undefined)
      for (const chunk of plan.stdout || []) assert.deepEqual(chunk, Buffer.alloc(chunk.length))
      if (label.includes('overflow') || label === 'timeout') assert.ok(fake.calls.killed > 0)
    })
  })
}

test('boundedProcess accepts exact stderr bound but returns only binary stdout', async () => {
  await syntheticProcess({ stdout: [Buffer.from([255])], stderr: [Buffer.alloc(65536, 65)] }, {}, async (result) => {
    assert.deepEqual(await result, Buffer.from([255]))
  })
})

test('pinned Windows PS5 receives its own module path without changing synthetic parent env', async () => {
  await syntheticProcess({ stdout: [Buffer.from('fixture')] }, {}, async (result) => {
    assert.equal((await result).toString(), 'fixture')
  }, POWERSHELL)
})

test('buildRemoteSource rejects invalid modes/dependencies and emits parseable source', () => {
  for (const value of [null, {}, 'function']) generic(() => buildRemoteSource(value), 'Invalid backup request')
  for (const mode of ['', 'restore', '--export', null]) generic(() => buildRemoteSource(async function () {}, mode), 'Invalid backup request')
  for (const mode of ['preflight', 'export']) {
    const source = buildRemoteSource(async function fixtureSnapshot() {}, mode)
    assert.doesNotThrow(() => new vm.Script(source))
    assert.ok(source.indexOf('if(verifyToolIntegrity(fs,crypto.createHash)!==TOOL)') < source.indexOf('await run(TOOL'))
  }
  assert.match(memoryConfigBridge, /memfd_create/)
  assert.match(memoryConfigBridge, /--config=\/proc\/self\/fd\//)
  assert.doesNotMatch(memoryConfigBridge, /mkstemp|NamedTemporaryFile|--uri=/)
})

async function remoteFixture({ mode = 'preflight', toolTampered = false, probeInvalid = false, drift = false, dumpCode = 0 } = {}) {
  const tool = toolFixture(), { manifest, archive } = manifestFixture()
  if (toolTampered) tool.files.set(TOOL, Buffer.from('synthetic-replaced-bytes'))
  const output = [], diagnostics = [], launches = [], cleared = [], clients = { connected: 0, closed: 0 }
  let inventories = 0, configReads = 0, appImports = 0
  const fs = { ...tool.fs, readFileSync(p) {
    if (p.endsWith('/server/.env')) { configReads++; return Buffer.from('synthetic-config-only') }
    return tool.fs.readFileSync(p)
  } }
  const hash = (algorithm) => {
    let value
    return { update(bytes) { value = bytes; return this }, digest(format) {
      if (Buffer.isBuffer(value) && value.equals(Buffer.from('synthetic-package'))) return PACKAGE_HASH
      if (Buffer.isBuffer(value) && value.equals(Buffer.from('synthetic-executable'))) return TOOL_HASH
      return createHash(algorithm).update(value).digest(format)
    } }
  }
  class MongoClient {
    async connect() { clients.connected++ }
    async close() { clients.closed++ }
    db() { return { databaseName: 'synthetic_fixture', admin: () => ({ command: async () => ({ version: '8.0.34' }) }),
      fixtureSnapshot: async () => {
        const snapshot = structuredClone(manifest.snapshot)
        if (++inventories > 1 && drift) snapshot.collections[0].count++
        return snapshot
      } } }
  }
  const spawn = (command, args) => {
    launches.push({ command, args })
    const plan = args[0] === '--version'
      ? { stdout: [Buffer.from('mongodump version: 100.19.1')] }
      : launches.length === 2
        ? { code: 1, stderr: [Buffer.from(probeInvalid ? PRIVATE : 'connection refused')] }
        : { code: dumpCode, stdout: [Buffer.from(archive)], stderr: [Buffer.from(PRIVATE)] }
    const fake = fakeChild(plan); cleared.push(fake)
    return fake.child
  }
  const process = { exitCode: 0, stdout: { write: (bytes) => output.push(Buffer.from(bytes)) },
    stderr: { write: (bytes) => diagnostics.push(String(bytes)) } }
  const require = (name) => {
    if (name === 'node:fs') return fs
    if (name === 'node:crypto') return { createHash: hash }
    if (name === 'node:child_process') return { spawn }
    if (name === 'node:module') return { createRequire: () => (module) => {
      appImports++
      if (module === 'mongodb') return { MongoClient, BSON: {} }
      if (module === 'dotenv') return { parse: () => ({ MONGODB_URI: 'mongodb://synthetic.invalid/synthetic_fixture' }) }
      throw new Error('Unexpected synthetic import')
    } }
    throw new Error('Unexpected synthetic import')
  }
  const source = buildRemoteSource(async function fixtureSnapshot(db) { return db.fixtureSnapshot() }, mode)
  await new vm.Script(source).runInNewContext({ require, Buffer, process, setTimeout, clearTimeout })
  return { output: Buffer.concat(output), diagnostics: diagnostics.join(''), process, launches,
    inventories, configReads, appImports, clients, archive, cleared }
}

test('remote preflight uses only fake tool/config probe; never reads source configuration or DB', async () => {
  const f = await remoteFixture()
  assert.equal(f.process.exitCode, 0)
  assert.deepEqual(JSON.parse(f.output), { tool: '100.19.1', memoryConfig: true })
  assert.equal(f.configReads, 0); assert.equal(f.appImports, 0); assert.equal(f.clients.connected, 0)
  assert.equal(f.launches.length, 2); assert.equal(f.diagnostics, '')
})

test('remote executable mismatch stops before every launch/config/DB access', async () => {
  const f = await remoteFixture({ mode: 'export', toolTampered: true })
  assert.equal(f.process.exitCode, 1); assert.equal(f.output.length, 0)
  assert.equal(f.launches.length, 0); assert.equal(f.configReads, 0); assert.equal(f.clients.connected, 0)
  assert.equal(f.diagnostics, 'Private backup aborted at tool-integrity\n')
})

test('remote probe diagnostics remain private and failed probe never reads source configuration', async () => {
  const f = await remoteFixture({ mode: 'export', probeInvalid: true })
  assert.equal(f.process.exitCode, 1); assert.equal(f.output.length, 0); assert.equal(f.configReads, 0)
  assert.equal(f.diagnostics, 'Private backup aborted at memory-config\n')
  assert.ok(!f.diagnostics.includes(PRIVATE))
})

test('synthetic remote export preserves binary framing, digest and non-certification flags', async () => {
  const f = await remoteFixture({ mode: 'export' })
  assert.equal(f.process.exitCode, 0); assert.equal(f.diagnostics, '')
  const { manifest, archive } = unpackPayload(f.output)
  assert.deepEqual(archive, f.archive); assert.equal(manifest.archiveSha256, sha(archive))
  assert.equal(validateManifest(manifest, archive).records, 13)
  assert.equal(f.inventories, 2); assert.equal(f.clients.closed, 1)
  const dump = f.launches[2]
  assert.equal(dump.command, 'python3'); assert.ok(dump.args.includes('--archive')); assert.ok(dump.args.includes('--gzip'))
  assert.ok(dump.args.includes('--readPreference=primary')); assert.ok(dump.args.includes('--numParallelCollections=1'))
  assert.ok(!JSON.stringify(f.launches).includes('mongodb://synthetic.invalid'))
  assert.match(f.cleared[2].calls.input.toString(), /^uri: /)
})

for (const [label, options, stage] of [
  ['source drift', { drift: true }, 'source-comparison'],
  ['failed dump with partial binary output', { dumpCode: 4 }, 'source-export'],
]) {
  test(`synthetic remote ${label} returns no payload or native diagnostic`, async () => {
    const f = await remoteFixture({ mode: 'export', ...options })
    assert.equal(f.process.exitCode, 1); assert.equal(f.output.length, 0)
    assert.equal(f.diagnostics, `Private backup aborted at ${stage}\n`)
    assert.ok(!f.diagnostics.includes(PRIVATE)); assert.equal(f.clients.closed, 1)
  })
}
