// Zero native filesystem/process/network/database operations; all custody data is synthetic.
import assert from 'node:assert/strict'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { BSON } from 'mongodb'
import { snapshotMongo } from '../scripts/mongo-preservation-snapshot.mjs'
import { fixtureProfile, fixtureBinaryPins, validateFixtureTarget, mongodArguments, restoreArguments, validateSnapshot,
  compareSnapshots, validateDatabaseInventory, createRestoreRunner, runPrivateProcess,
  restorePrivateMongoFixture, probeFixturePort } from '../scripts/private-mongo-restore.mjs'

const profile = fixtureProfile()
const ID = '11111111-1111-4111-8111-111111111111'
const ADMIN = '22222222-2222-4222-8222-222222222222'
const BASE = 'backup-33333333-3333-4333-8333-333333333333'
const DBPATH = path.win32.join(profile.root, 'fixture-' + ID)
const CONFIG = path.win32.join(DBPATH, 'restore-credentials.yml')
const SOURCE = 'synthetic_original_source'
const bytes = { mongod: Buffer.from('synthetic-reviewed-mongod'), mongorestore: Buffer.from('synthetic-reviewed-mongorestore') }
const pins = fixtureBinaryPins()
const oid = (n) => new BSON.ObjectId(n.toString(16).padStart(24, '0'))
const documents = () => [{ _id: oid(1), __v: new BSON.Int32(3), password_hash: 'SYNTHETIC-PRIVATE-ONLY', nullable: null,
  int: new BSON.Int32(7), double: new BSON.Double(7), date: new Date('2026-10-06T00:00:00Z'), binary: new BSON.Binary(Buffer.from([0, 255])) }]
class Cursor {
  constructor(values) { this.values = values; this.closed = false }
  sort() { return this }
  limit() { return this }
  maxTimeMS() { return this }
  async *[Symbol.asyncIterator]() { yield* this.values }
  async close() { this.closed = true }
}
function database({ entries, docs, indexes, options = {} } = {}) {
  return {
    databaseName: SOURCE,
    listCollections() { return new Cursor(entries ?? [{ name: 'users', type: 'collection', options }, { name: 'products', type: 'collection', options: {} }]) },
    collection(name) { return {
      listIndexes() { return new Cursor(indexes ?? [{ name: '_id_', v: new BSON.Int32(2), key: { _id: new BSON.Int32(1) } },
        { name: 'compound', key: { int: new BSON.Int32(1), double: new BSON.Int32(-1) }, unique: false }]) },
      find() { return new Cursor(name === 'users' ? docs ?? documents() : []) },
    } },
  }
}
async function backupFixture() {
  const archive = Buffer.alloc(40); archive[0] = 0x1f; archive[1] = 0x8b
  return { archive, manifest: {
    format: 'maxims-mongo-preservation-1', serverVersion: '8.0.34', toolsVersion: '100.19.1',
    observedStable: true, pointInTime: false, writeFreeze: false, restoreVerified: false, mediaVerified: false,
    createdAt: '2026-10-06T10:00:00Z', startedAt: '2026-10-06T09:59:00Z',
    archiveBytes: archive.length, archiveSha256: createHash('sha256').update(archive).digest('hex'),
    snapshot: await snapshotMongo(database(), BSON, createHash),
  } }
}

class FakeFS {
  constructor(events) {
    this.events = events; this.next = 100; this.fds = new Map()
    this.entries = new Map([[profile.root, { directory: true, ino: 1 }],
      [profile.mongod, { data: bytes.mongod, ino: 2 }], [profile.mongorestore, { data: bytes.mongorestore, ino: 3 }]])
  }
  stat(entry, bigint = false) { return { size: entry.data?.length ?? 0, dev: bigint ? 1n : 1, ino: bigint ? BigInt(entry.ino) : entry.ino,
    isFile: () => !entry.directory, isDirectory: () => Boolean(entry.directory), isSymbolicLink: () => Boolean(entry.link) } }
  lstatSync(name, opts = {}) { const entry = this.entries.get(name); if (!entry) throw new Error('synthetic missing file'); return this.stat(entry, opts.bigint) }
  realpathSync(name) { return this.entries.get(name)?.realpath ?? name }
  readFileSync(name) { this.events.push(['readBinary', name]); return Buffer.from(this.entries.get(name).data) }
  mkdirSync(name, opts) { this.events.push(['mkdir', name, opts]); if (this.entries.has(name)) throw new Error('synthetic existing fixture'); this.entries.set(name, { directory: true, ino: this.next++ }) }
  readdirSync(name) { return [...this.entries.keys()].filter((key) => path.win32.dirname(key) === name).map((key) => path.win32.basename(key)) }
  openSync(name, flag, mode) { this.events.push(['open', name, flag, mode]); if (flag !== 'wx' || this.entries.has(name)) throw new Error('synthetic exclusive create rejected'); const entry = { data: Buffer.alloc(0), ino: this.next++ }; this.entries.set(name, entry); this.fds.set(entry.ino, entry); return entry.ino }
  fstatSync(fd, opts = {}) { return this.stat(this.fds.get(fd), opts.bigint) }
  writeFileSync(fd, data) { this.events.push(['credentialWrite']); this.fds.get(fd).data = Buffer.from(data) }
  fsyncSync() { this.events.push(['fsync']) }
  closeSync(fd) { this.fds.delete(fd); this.events.push(['closeFile']) }
  unlinkSync(name) { this.events.push(['unlink', name]); this.entries.delete(name) }
}

function acl(directory) {
  const currentSid = 'S-1-5-21-1-2-3-1000'
  return { currentSid, ownerSid: currentSid, protected: directory, directory, reparsePoint: false,
    rules: [currentSid, 'S-1-5-18', 'S-1-5-32-544'].map((sid) => ({ sid, allow: true, fullControl: true,
      propagationNone: true, inherited: !directory, objectInherit: directory, containerInherit: directory })) }
}

class Child extends EventEmitter {
  constructor() { super(); this.pid = 7654; this.exitCode = null; this.stdout = new PassThrough(); this.stderr = new PassThrough(); this.stdin = new PassThrough(); this.kills = 0 }
  finish(code = 0) { this.exitCode = code; this.emit('close', code) }
  kill() { this.kills++; this.onKill?.(); this.finish(); return true }
}

async function harness(changes = {}) {
  const backup = await backupFixture(), events = [], fileSystem = new FakeFS(events)
  const state = { events, fs: fileSystem, backup, port: [], authenticated: false, restored: false, connections: [], child: null, configText: '', restoredDatabase: database(), before: ['admin','config','local'], after: ['admin','config','local',SOURCE] }
  const runtime = {
    platform: 'win32', fs: fileSystem, BSON,
    // Only this offline adapter maps synthetic binary bytes to the fixed pins.
    // Altered bytes still produce their real SHA and cannot pass the fixed comparison.
    hashBinary: (input) => input.equals(bytes.mongod) ? pins.mongod : input.equals(bytes.mongorestore) ? pins.mongorestore : createHash('sha256').update(input).digest('hex'),
    randomUUID: (() => { const ids = [ID, ADMIN]; return () => ids.shift() })(),
    randomBytes: () => Buffer.alloc(32, 31), delay: async (ms) => { events.push(['fakeDelay', ms]) },
    portState: async () => state.port,
    portFree: async () => state.port.length === 0,
    inspectAcl: async (filename, directory) => { events.push(['acl', filename, directory]); return acl(directory) },
    protectDirectory: async (filename) => { events.push(['protect', filename]) },
    readPrivateBackup: async (baseName) => { events.push(['readBackup', baseName]); return backup },
    spawn: (command, args, options) => {
      events.push(['spawn', command, args, options]); const child = new Child(); state.child = child
      state.port = [{ address: profile.host, pid: child.pid }]; child.onKill = () => { state.port = [] }; return child
    },
    run: async (command, args, input, options) => {
      events.push(['run', command, args, options])
      if (args[0] === '--version') return Buffer.from(command === profile.mongod ? 'db version v8.0.32\nBuild Info: synthetic' : 'mongorestore version: 100.19.1\n')
      assert.equal(command, profile.mongorestore); assert.equal(state.authenticated, true)
      assert.equal(input, backup.archive)
      state.configText = fileSystem.entries.get(CONFIG).data.toString()
      assert.ok(state.configText.includes('password:'))
      state.restored = true; return Buffer.from('SYNTHETIC-PRIVATE-NATIVE-DIAGNOSTIC')
    },
    connect: async (uri, options) => {
      events.push(['connect', uri, Boolean(options.auth)])
      assert.equal(uri, 'mongodb://127.0.0.1:33318/')
      assert.equal(options.directConnection, true)
      const connection = { closed: false, options,
        close: async () => { connection.closed = true; events.push(['clientClose']) },
        db: (name) => {
          if (name !== 'admin') { assert.equal(name, SOURCE); return state.restoredDatabase }
          return { command: async (command) => {
            const operation = Object.keys(command)[0]; events.push(['command', operation])
            if (operation === 'createUser') {
              assert.equal(options.auth, undefined)
              assert.deepEqual(command.roles, [{ role: 'root', db: 'admin' }])
              state.username = command.createUser; state.password = command.pwd; state.authenticated = true; return { ok: 1 }
            }
            assert.deepEqual(options.auth, { username: state.username, password: state.password })
            if (operation === 'serverStatus') return { pid: state.child.pid, version: '8.0.32' }
            if (operation === 'getCmdLineOpts') return { parsed: { net: { bindIp: profile.host, port: profile.port }, security: { authorization: 'enabled' }, storage: { dbPath: DBPATH } } }
            if (operation === 'listDatabases') return { databases: (state.restored ? state.after : state.before).map((name) => ({ name })) }
            if (operation === 'usersInfo') return { users: [{ user: state.username }] }
            if (operation === 'shutdown') { state.port = []; state.child.finish(); return { ok: 1 } }
            throw new Error('unexpected synthetic command')
          } }
        },
      }
      state.connections.push(connection); return connection
    },
  }
  Object.assign(runtime, changes)
  state.runtime = runtime; state.invoke = (base = BASE, ...overrides) => createRestoreRunner(runtime)(base, ...overrides)
  return state
}
async function blocked(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.name, 'PrivateMongoRestoreError')
    if (code) assert.equal(error.code, code)
    assert.equal(error.message, error.code)
    assert.equal(Object.hasOwn(error, 'cause'), false)
    assert.equal(JSON.stringify(error).includes('SYNTHETIC-PRIVATE'), false)
    return true
  })
}

test('fixture profile is fixed; every alternate host/path/port/version is rejected', () => {
  assert.equal(validateFixtureTarget(profile), true)
  for (const key of Object.keys(profile)) assert.throws(() => validateFixtureTarget({ ...profile, [key]: 'alternate' }), /restore_target_rejected/)
  assert.throws(() => validateFixtureTarget({ ...profile, service: true }), /restore_target_rejected/)
})

for (const mode of ['free','occupied','timeout']) {
  test(`vacancy probe binds exclusively to fixed IPv4 loopback (${mode}), using fake socket/clock`, async () => {
    const socket = new EventEmitter(), scheduled = new Map()
    let binding, closes = 0
    socket.listen = (options, ready) => {
      binding = options
      if (mode === 'free') ready()
      if (mode === 'occupied') socket.emit('error', new Error('synthetic EADDRINUSE'))
    }
    socket.close = (done) => { closes++; done?.() }
    const clocks = { setTimeout: (fn) => { scheduled.set(1, fn); return 1 }, clearTimeout: (id) => scheduled.delete(id) }
    const pending = probeFixturePort({ createServer: () => socket }, clocks)
    if (mode === 'timeout') scheduled.get(1)()
    assert.equal(await pending, mode === 'free')
    assert.deepEqual(binding, { host: '127.0.0.1', port: 33318, exclusive: true })
    assert.equal(scheduled.size, 0)
    if (mode !== 'occupied') assert.equal(closes, 1)
  })
}

test('executable SHA pins are exact, immutable and not the server ZIP digest', () => {
  assert.deepEqual(fixtureBinaryPins(), {
    mongod: '38f8e6dfbc496ae4089f15b8235f15287adfbd8c09eafa4f384a2e5361625522',
    mongorestore: 'cbb0d9926ad555d2d6bb1d493fc855638b00af4d5a67e2973e7245f368185ab5',
  })
  assert.equal(Object.isFrozen(pins), true)
  assert.throws(() => { pins.mongod = 'arbitrary' }, TypeError)
  assert.notEqual(pins.mongod, '5a0675fdec49b544cd5d374ad50a9a594cf5b3278b5ace658aa51cbb4df17177')
})

test('CLI arguments preserve all metadata and never enable service/drop/oplog/remapping', () => {
  assert.deepEqual(mongodArguments(DBPATH), ['--auth','--bind_ip','127.0.0.1','--port','33318','--dbpath',DBPATH,'--setParameter','diagnosticDataCollectionEnabled=false','--quiet'])
  assert.deepEqual(restoreArguments(CONFIG, SOURCE), ['--config=' + CONFIG,'--archive','--gzip','--stopOnError','--nsInclude=' + SOURCE + '.*'])
  assert.equal([...mongodArguments(DBPATH), ...restoreArguments(CONFIG, SOURCE)].some((arg) => /--(?:drop|noIndexRestore|noOptionsRestore|oplogReplay|nsFrom|nsTo|install|service|password|uri|bind_ip_all)/.test(arg)), false)
})

for (const dbpath of ['C:\\data\\db', profile.root, path.win32.join(profile.root,'fixture-existing'), path.win32.join(profile.root,'..','fixture-' + ID)]) {
  test(`non-new UUID fixture path rejected: ${path.win32.basename(dbpath)}`, () => assert.throws(() => mongodArguments(dbpath), /restore_path_rejected/))
}
for (const databaseName of ['admin','config','local','test','*','a.b','../x','mongodb://source','']) {
  test(`unsafe/reserved namespace rejected: ${databaseName || 'empty'}`, () => assert.throws(() => restoreArguments(CONFIG, databaseName), /restore_database_rejected/))
}

test('successful actual runner lifecycle returns only aggregates/profile, retains data and closes own process', async () => {
  const h = await harness(), result = await h.invoke()
  assert.deepEqual(result, { collections: 2, records: 1, fixtureServerVersion: '8.0.32', sourceServerVersion: '8.0.34', toolsVersion: '100.19.1',
    documentAndMetadataMatch: true, authenticatedFixture: true, fixtureDataRetained: true, fixtureDataEncryptedAtRest: false, pointInTime: false,
    mediaVerified: false, productionCompatibilityCertified: false, fixtureStopped: true })
  assert.ok(h.fs.entries.has(DBPATH)); assert.equal(h.fs.entries.has(CONFIG), false)
  assert.ok(h.connections.every((connection) => connection.closed)); assert.equal(h.child.exitCode, 0); assert.deepEqual(h.port, [])
  assert.ok(h.backup.archive.every((value) => value === 0))
  const output = JSON.stringify(result)
  for (const forbidden of [SOURCE, 'users', 'products', 'SYNTHETIC-PRIVATE', oid(1).toHexString(), h.password, h.backup.manifest.snapshot.collections[0].documentDigest]) assert.equal(output.includes(forbidden), false)
  const versionCalls = h.events.filter(([kind]) => kind === 'run').slice(0, 2)
  assert.ok(versionCalls.every((call) => call[2][0] === '--version'))
  assert.ok(h.events.findIndex(([kind]) => kind === 'readBackup') > h.events.indexOf(versionCalls[1]))
  const spawnCall = h.events.find(([kind]) => kind === 'spawn')
  assert.equal(spawnCall[3].windowsHide, true); assert.equal(spawnCall[3].shell, false)
  assert.equal(spawnCall[3].cwd, profile.root)
  assert.deepEqual(spawnCall[3].stdio, ['pipe','pipe','pipe'])
  assert.equal(JSON.stringify(spawnCall).includes(h.password), false)
  assert.equal(Object.hasOwn(spawnCall[3].env, 'MONGO_URI'), false)
  const credentialWrite = h.events.findIndex(([kind]) => kind === 'credentialWrite')
  assert.ok(h.events.findIndex(([kind, filename]) => kind === 'acl' && filename === CONFIG) < credentialWrite)
  assert.deepEqual(h.events.filter(([kind]) => kind === 'unlink'), [['unlink', CONFIG]])
})

for (const input of ['../backup-' + ID, BASE + '.mxb', profile.root, 'backup-existing', BASE.toUpperCase()]) {
  test('backup basename cannot select another path', async () => {
    const h = await harness(); await blocked(h.invoke(input), 'restore_request_rejected')
    assert.equal(h.events.length, 0)
  })
}

test('wrong platform or omitted adapters never fall back to native I/O', async () => {
  const h = await harness({ platform: 'linux' }); await blocked(h.invoke(), 'restore_request_rejected')
  assert.equal(h.events.length, 0)
  assert.throws(() => createRestoreRunner({}), /restore_adapter_required/)
})
test('caller-selected pins, including matching pins or undefined, reject before any I/O', async () => {
  for (const selected of [undefined, {}, pins, { ...pins, path: 'alternate' }, { ...pins, mongod: 'bad' }]) {
    const h = await harness(); await blocked(h.invoke(BASE, selected), 'restore_pin_override_rejected')
    assert.equal(h.events.length, 0)
  }
})
test('native entry point rejects pin overrides without creating a native runtime', async () => {
  await blocked(restorePrivateMongoFixture(BASE, pins), 'restore_pin_override_rejected')
  await blocked(restorePrivateMongoFixture(BASE, undefined), 'restore_pin_override_rejected')
})
test('synthetic self-selected executable hashes cannot satisfy the fixed binary pins', async () => {
  const h = await harness({ hashBinary: (input) => createHash('sha256').update(input).digest('hex') })
  await blocked(h.invoke(), 'restore_binary_rejected')
  assert.equal(h.events.some(([kind]) => ['run','readBackup','mkdir','spawn'].includes(kind)), false)
})
for (const binary of ['mongod','mongorestore']) {
  test(`${binary} binary tamper rejected before running it`, async () => {
    const h = await harness(); h.fs.entries.get(profile[binary]).data = Buffer.from('tampered')
    await blocked(h.invoke(), 'restore_binary_rejected')
    assert.equal(h.events.some(([kind]) => kind === 'run'), false)
  })
  test(`${binary} unexpected version rejected before backup read or fixture creation`, async () => {
    const h = await harness(), original = h.runtime.run
    h.runtime.run = (command, args, ...rest) => command === profile[binary] ? Buffer.from(binary === 'mongod' ? 'db version v8.0.34\n' : 'mongorestore version: 100.18.0\n') : original(command, args, ...rest)
    await blocked(h.invoke(), 'restore_binary_version_rejected')
    assert.equal(h.events.some(([kind]) => ['readBackup','mkdir','spawn'].includes(kind)), false)
  })
}
test('symlinked binary and redirected root rejected without private backup access', async () => {
  const h = await harness(); h.fs.entries.get(profile.mongod).link = true
  await blocked(h.invoke(), 'restore_binary_rejected')
  const g = await harness(); g.fs.entries.get(profile.root).realpath = 'C:\\other'
  await blocked(g.invoke(), 'restore_directory_rejected')
})
test('occupied port rejected without adopting or killing its process', async () => {
  const h = await harness(); h.port = [{ address: '0.0.0.0', pid: 999 }]
  await blocked(h.invoke(), 'restore_port_occupied')
  assert.equal(h.child, null); assert.equal(h.events.some(([kind]) => kind === 'readBackup'), false)
})
test('bind failure also blocks when port-state inspection appears empty', async () => {
  const h = await harness({ portFree: async () => false })
  await blocked(h.invoke(), 'restore_port_occupied'); assert.equal(h.child, null)
})
test('existing fixture directory is never adopted, deleted or overwritten', async () => {
  const h = await harness(); const original = { directory: true, ino: 900 }; h.fs.entries.set(DBPATH, original)
  await blocked(h.invoke(), 'restore_fixture_failed')
  assert.strictEqual(h.fs.entries.get(DBPATH), original); assert.equal(h.child, null)
  assert.equal(h.events.some(([kind]) => kind === 'unlink'), false)
})
test('unavailable parent backup API fails closed before a fixture is created', async () => {
  const h = await harness({ readPrivateBackup: async () => { throw new Error('SYNTHETIC-PRIVATE missing API') } })
  await blocked(h.invoke(), 'restore_fixture_failed'); assert.equal(h.child, null)
  assert.equal(h.fs.entries.has(DBPATH), false)
})
test('catch uses the defined error class, not a spoofed error name or a missing-class reference', async () => {
  const h = await harness({ readPrivateBackup: async () => {
    const error = new Error('SYNTHETIC-PRIVATE diagnostic')
    error.name = 'PrivateMongoRestoreError'; error.code = 'SYNTHETIC-PRIVATE forged guard'
    throw error
  } })
  await blocked(h.invoke(), 'restore_fixture_failed')
  assert.equal(h.child, null)
})

for (const [label, change] of [
  ['wrong source version', (b) => { b.manifest.serverVersion = '8.0.32' }],
  ['wrong tools', (b) => { b.manifest.toolsVersion = '100.18.0' }],
  ['wrong format', (b) => { b.manifest.format = 'other' }],
  ['PIT claim', (b) => { b.manifest.pointInTime = true }],
  ['unstable export', (b) => { b.manifest.observedStable = false }],
  ['archive SHA tamper', (b) => { b.archive[10] ^= 1 }],
  ['archive byte mismatch', (b) => { b.manifest.archiveBytes++ }],
  ['wrong gzip header', (b) => { b.archive[0] = 0 }],
  ['oversized archive', (b) => { b.archive = Buffer.alloc(64 * 1024 * 1024 + 1) }],
  ['unknown collection', (b) => { b.manifest.snapshot.collections[0].name = 'unknown' }],
  ['duplicate collection', (b) => { b.manifest.snapshot.collections.push(b.manifest.snapshot.collections[0]) }],
  ['count cap', (b) => { b.manifest.snapshot.collections[0].count = 10001 }],
  ['negative count', (b) => { b.manifest.snapshot.collections[0].count = -1 }],
  ['invalid digest', (b) => { b.manifest.snapshot.collections[0].metadataDigest = 'bad' }],
]) {
  test(`manifest/schema gate: ${label}`, async () => {
    const h = await harness(); change(h.backup)
    await blocked(h.invoke()); assert.equal(h.child, null); assert.equal(h.fs.entries.has(DBPATH), false)
  })
}
test('snapshot rejects non-array inventory, empty schema, bad database and record-valued extras', () => {
  for (const value of [null, { database: SOURCE, collections: [] }, { database: 'admin', collections: [] }, { database: SOURCE, collections: {} }]) assert.throws(() => validateSnapshot(value), /restore_snapshot_rejected/)
})

test('unexpected database before restore blocks archive consumption', async () => {
  const h = await harness(); h.before.push('unreviewed_database')
  await blocked(h.invoke(), 'restore_unexpected_database')
  assert.equal(h.restored, false); assert.equal(h.child.exitCode, 0); assert.deepEqual(h.port, [])
})
test('unexpected database after restore and missing source database cannot pass', async () => {
  const h = await harness(); h.after.push('unreviewed_database')
  await blocked(h.invoke(), 'restore_unexpected_database')
  const g = await harness(); g.after = ['admin','local']
  await blocked(g.invoke(), 'restore_database_missing')
})
test('duplicate/malformed database inventory rejected', () => {
  assert.throws(() => validateDatabaseInventory({ databases: [{ name: 'admin' }, { name: 'admin' }] }), /restore_unexpected_database/)
  assert.throws(() => validateDatabaseInventory({}), /restore_database_inventory_rejected/)
})

for (const [label, options] of [
  ['raw BSON numeric type', { docs: [{ ...documents()[0], int: new BSON.Double(7) }] }],
  ['password preservation', { docs: [{ ...documents()[0], password_hash: 'SYNTHETIC-PRIVATE-CHANGED' }] }],
  ['null preservation', { docs: documents().map((doc) => Object.fromEntries(Object.entries(doc).filter(([key]) => key !== 'nullable'))) }],
  ['document count', { docs: [...documents(), { _id: oid(2) }] }],
  ['missing empty collection', { entries: [{ name: 'users', type: 'collection', options: {} }] }],
  ['added empty collection', { entries: ['users','products','orders'].map((name) => ({ name, type: 'collection', options: {} })) }],
  ['collection options', { options: { validationLevel: 'moderate' } }],
  ['compound index order', { indexes: [{ name: '_id_', v: new BSON.Int32(2), key: { _id: new BSON.Int32(1) } }, { name: 'compound', key: { double: new BSON.Int32(-1), int: new BSON.Int32(1) }, unique: false }] }],
  ['index option', { indexes: [{ name: '_id_', v: new BSON.Int32(2), key: { _id: new BSON.Int32(1) } }, { name: 'compound', key: { int: new BSON.Int32(1), double: new BSON.Int32(-1) }, unique: true }] }],
]) {
  test(`actual snapshot comparison rejects ${label} and still cleans up`, async () => {
    const h = await harness(); h.restoredDatabase = database(options)
    await blocked(h.invoke(), 'restore_snapshot_mismatch')
    assert.equal(h.child.exitCode, 0); assert.equal(h.fs.entries.has(CONFIG), false)
    assert.ok(h.fs.entries.has(DBPATH)); assert.ok(h.connections.every((connection) => connection.closed))
  })
}
test('snapshot inventory ordering is incidental but no document/metadata mismatch is ignored', async () => {
  const b = await backupFixture(), reordered = { ...b.manifest.snapshot, collections: [...b.manifest.snapshot.collections].reverse() }
  assert.deepEqual(compareSnapshots(b.manifest.snapshot, reordered), { collections: 2, records: 1 })
})

test('unsafe ACL rejects credentials before content and removes only own transient file', async () => {
  const h = await harness(), inspect = h.runtime.inspectAcl
  h.runtime.inspectAcl = async (filename, directory) => {
    const result = await inspect(filename, directory)
    if (filename === CONFIG) result.rules[0].sid = 'S-1-1-0'
    return result
  }
  await blocked(h.invoke(), 'restore_fixture_failed')
  assert.equal(h.events.some(([kind]) => kind === 'credentialWrite'), false)
  assert.equal(h.fs.entries.has(CONFIG), false); assert.equal(h.child.exitCode, 0)
})
test('root ACL failure performs no binary execution/private read/write', async () => {
  const h = await harness({ inspectAcl: async () => ({}) })
  await blocked(h.invoke(), 'restore_fixture_failed')
  assert.equal(h.events.length, 0)
})
test('changed config-file identity is not deleted and cleanup is explicitly unverified', async () => {
  const h = await harness(), inspect = h.runtime.inspectAcl
  h.runtime.inspectAcl = async (filename, directory) => {
    const result = await inspect(filename, directory)
    if (filename === CONFIG) h.fs.entries.set(CONFIG, { data: Buffer.from('replacement'), ino: 9999 })
    return result
  }
  await blocked(h.invoke(), 'restore_cleanup_unverified')
  assert.equal(h.fs.entries.get(CONFIG).ino, 9999)
  assert.equal(h.events.some(([kind]) => kind === 'unlink'), false)
})
test('another PID on fixture port blocks bootstrap and never kills that PID', async () => {
  const h = await harness(), spawn = h.runtime.spawn
  h.runtime.spawn = (...args) => { const child = spawn(...args); h.port = [{ address: profile.host, pid: 9999 }]; return child }
  await blocked(h.invoke(), 'restore_listener_identity_rejected')
  assert.equal(h.connections.length, 0); assert.equal(h.child.kills, 1)
})
test('failed mongod spawn with no PID handles asynchronous error and never signals an unknown process', async () => {
  const h = await harness()
  h.runtime.spawn = () => {
    const child = new Child(); child.pid = undefined; h.child = child
    queueMicrotask(() => { child.emit('error', new Error('SYNTHETIC-PRIVATE spawn error')); child.finish(1) })
    return child
  }
  await blocked(h.invoke(), 'restore_startup_failed')
  assert.equal(h.connections.length, 0); assert.equal(h.child.kills, 0)
  assert.equal(h.child.exitCode, 1)
})
test('unexpected runtime PID/auth/dbpath/binding is rejected before archive consumption', async () => {
  const h = await harness(), connect = h.runtime.connect
  h.runtime.connect = async (...args) => {
    const client = await connect(...args), get = client.db
    client.db = (name) => {
      const db = get(name); if (name !== 'admin') return db
      const command = db.command; db.command = (input) => input.getCmdLineOpts ? { parsed: { net: { bindIp: '0.0.0.0', port: 33318 } } } : command(input)
      return db
    }; return client
  }
  await blocked(h.invoke(), 'restore_runtime_identity_rejected'); assert.equal(h.restored, false)
  assert.equal(h.events.some(([kind, operation]) => kind === 'command' && operation === 'shutdown'), false)
  assert.equal(h.child.kills, 1)
  assert.ok(h.connections.every((connection) => connection.closed))
})
test('changed listener PID at cleanup skips shutdown, closes clients and signals only owned child', async () => {
  const h = await harness(), portState = h.runtime.portState
  h.runtime.portState = async () => {
    const finalUsersChecked = h.events.filter(([kind, operation]) => kind === 'command' && operation === 'usersInfo').length === 2
    if (finalUsersChecked) return [{ address: profile.host, pid: 9999 }]
    return portState()
  }
  await blocked(h.invoke(), 'restore_cleanup_unverified')
  assert.equal(h.restored, true)
  assert.equal(h.events.some(([kind, operation]) => kind === 'command' && operation === 'shutdown'), false)
  assert.equal(h.child.pid, 7654); assert.equal(h.child.kills, 1)
  assert.ok(h.connections.every((connection) => connection.closed))
})
test('native restore failure is redacted, stops own fixture and removes its credentials', async () => {
  const h = await harness(), run = h.runtime.run
  h.runtime.run = (command, args, ...rest) => args[0] === '--version' ? run(command, args, ...rest) : Promise.reject(new Error('SYNTHETIC-PRIVATE-URI diagnostics'))
  await blocked(h.invoke(), 'restore_fixture_failed')
  assert.equal(h.child.exitCode, 0); assert.equal(h.fs.entries.has(CONFIG), false)
})
test('unclosed port prevents a successful result even after exact digest comparison', async () => {
  const h = await harness(), connect = h.runtime.connect
  h.runtime.connect = async (...args) => {
    const client = await connect(...args), db = client.db
    client.db = (name) => { const selected = db(name); if (name !== 'admin') return selected
      const command = selected.command; selected.command = async (input) => { const result = await command(input); if (input.shutdown) h.port = [{ address: profile.host, pid: 9999 }]; return result }; return selected }
    return client
  }
  await blocked(h.invoke(), 'restore_cleanup_unverified')
})

function processHarness(action) {
  const child = new Child(), timers = new Map(), timeouts = []; let next = 0, selected
  child.stdin.end = (input) => { selected.input = input; action(child, timers) }
  return { child, timers, timeouts, selected: () => selected, dependencies: {
    spawn: (command, args, options) => { selected = { command, args, options }; return child },
    setTimeout: (fn, ms) => { const id = ++next; timers.set(id, fn); timeouts.push(ms); return id },
    clearTimeout: (id) => timers.delete(id),
  } }
}
test('private process adapter captures bounded output without forwarding diagnostics', async () => {
  const h = processHarness((child) => { child.stdout.write('version'); child.stderr.write('SYNTHETIC-PRIVATE diagnostics'); child.finish() })
  const result = await runPrivateProcess(profile.mongorestore, ['--version'], Buffer.alloc(0), h.dependencies)
  assert.equal(result.toString(), 'version'); assert.equal(h.timers.size, 0)
  assert.equal(h.selected().options.windowsHide, true); assert.equal(h.selected().options.shell, false)
  assert.equal(h.selected().options.cwd, profile.root)
})
for (const [label, action] of [
  ['nonzero exit', (child) => { child.stderr.write('SYNTHETIC-PRIVATE'); child.finish(1) }],
  ['stdout bound', (child) => { child.stdout.write(Buffer.alloc(65537)) }],
  ['stderr bound', (child) => { child.stderr.write(Buffer.alloc(65537)) }],
  ['stdin EPIPE', (child) => { child.stdin.emit('error', new Error('SYNTHETIC-PRIVATE EPIPE')) }],
  ['spawn error', (child) => { child.emit('error', new Error('SYNTHETIC-PRIVATE spawn')) }],
  ['timeout', (child, timers) => { [...timers.values()][0]() }],
]) {
  test(`private process adapter fails closed on ${label} using fake clocks`, async () => {
    const h = processHarness(action)
    await blocked(runPrivateProcess(profile.mongorestore, ['--version'], Buffer.alloc(0), h.dependencies), 'restore_process_failed')
    assert.equal(h.timers.size, 0)
  })
}
test('synchronous spawn failure is sanitised without native execution', async () => {
  const h = processHarness(() => {}); h.dependencies.spawn = () => { throw new Error('SYNTHETIC-PRIVATE') }
  await blocked(runPrivateProcess(profile.mongorestore, [], Buffer.alloc(0), h.dependencies), 'restore_process_failed')
})

for (const mode of ['false','throws']) {
  test(`abort kill ${mode} without close reports unverified cleanup; repeated errors never retry kill`, async () => {
    const h = processHarness(() => {})
    h.child.kill = () => { h.child.kills++; if (mode === 'throws') throw new Error('SYNTHETIC-PRIVATE kill'); return false }
    const pending = runPrivateProcess(profile.mongorestore, ['--version'], Buffer.alloc(0), h.dependencies)
    const abort = [...h.timers.values()][0]
    abort()
    h.child.emit('error', new Error('SYNTHETIC-PRIVATE error after abort'))
    h.child.stdin.emit('error', new Error('SYNTHETIC-PRIVATE EPIPE after abort'))
    abort()
    assert.equal(h.child.kills, 1)
    assert.deepEqual(h.timeouts, [240000, 10000])
    assert.equal(h.timers.size, 1)
    ;[...h.timers.values()][0]()
    await blocked(pending, 'restore_cleanup_unverified')
    assert.equal(h.timers.size, 0)
    // A later close cannot retroactively turn unverified cleanup into ordinary failure.
    h.child.finish(1)
    await blocked(pending, 'restore_cleanup_unverified')
  })
}

test('kill emits error recursively but closes: abort happens once and ordinary failure is preserved', async () => {
  const h = processHarness((child) => child.stdin.emit('error', new Error('SYNTHETIC-PRIVATE EPIPE')))
  h.child.kill = () => {
    h.child.kills++
    h.child.emit('error', new Error('SYNTHETIC-PRIVATE error during kill'))
    h.child.finish(1)
    return true
  }
  await blocked(runPrivateProcess(profile.mongorestore, ['--version'], Buffer.alloc(0), h.dependencies), 'restore_process_failed')
  assert.equal(h.child.kills, 1); assert.equal(h.timers.size, 0)
})

test('kill throws but a confirmed close arrives: ordinary process failure, not unknown cleanup', async () => {
  const h = processHarness(() => {})
  h.child.kill = () => { h.child.kills++; throw new Error('SYNTHETIC-PRIVATE kill') }
  const pending = runPrivateProcess(profile.mongorestore, ['--version'], Buffer.alloc(0), h.dependencies)
  ;[...h.timers.values()][0]()
  h.child.finish(1)
  await blocked(pending, 'restore_process_failed')
  assert.equal(h.child.kills, 1); assert.equal(h.timers.size, 0)
})

test('runner preserves controlled unverified-cleanup code from a hung restore subprocess', async () => {
  const h = await harness(), run = h.runtime.run, process = processHarness(() => {})
  process.child.kill = () => { process.child.kills++; return false }
  h.runtime.run = (command, args, ...rest) => {
    if (args[0] === '--version') return run(command, args, ...rest)
    const pending = runPrivateProcess(command, args, rest[0], process.dependencies)
    ;[...process.timers.values()][0]()
    ;[...process.timers.values()][0]()
    return pending
  }
  await blocked(h.invoke(), 'restore_cleanup_unverified')
  assert.equal(process.child.kills, 1); assert.equal(process.child.exitCode, null)
  assert.equal(h.child.exitCode, 0); assert.equal(h.fs.entries.has(CONFIG), false)
  assert.ok(h.connections.every((connection) => connection.closed))
})
