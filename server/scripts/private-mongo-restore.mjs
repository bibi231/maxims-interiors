// Explicitly invoked fixture-only rehearsal. Importing this module performs no I/O.
// Never reads source configuration, connects to the source or selects a Windows service.
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { BSON, MongoClient } from 'mongodb'
import { snapshotMongo } from './mongo-preservation-snapshot.mjs'
import { validatePrivateAcl } from './backup-guards.mjs'

const ROOT = 'C:\\Users\\bgadz\\.private\\maxims-preservation-20261006'
const TOOLS = 'C:\\Users\\bgadz\\deploy-infra\\maxims-mongo-tools-20261006'
const MONGOD = TOOLS + '\\mongo-8.0.32\\mongodb-win32-x86_64-windows-8.0.32\\bin\\mongod.exe'
const RESTORE = TOOLS + '\\windows\\mongodb-database-tools-windows-x86_64-100.19.1\\bin\\mongorestore.exe'
// Parent-supplied executable digests from the verified official distributions.
// Never accept manifest-, argument-, environment- or operator-selected pins.
const BINARY_PINS = Object.freeze({
  mongod: '38f8e6dfbc496ae4089f15b8235f15287adfbd8c09eafa4f384a2e5361625522',
  mongorestore: 'cbb0d9926ad555d2d6bb1d493fc855638b00af4d5a67e2973e7245f368185ab5',
})
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
const HOST = '127.0.0.1', PORT = 33318, URI = 'mongodb://127.0.0.1:33318/'
const MAX = 64 * 1024 * 1024
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const SHA = /^[a-f0-9]{64}$/
const NAMES = new Set(['users','products','orders','bulkrequests','appointments','messages','galleries',
  'testimonials','teammembers','settings','activities','newsletters','transactions','blogposts'])
const INTERNAL = new Set(['admin','config','local'])
const PRIVATE_ENV = Object.freeze({ SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows',
  TEMP: ROOT, TMP: ROOT, PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules' })
const CHILD_OPTIONS = () => ({ windowsHide: true, shell: false, cwd: ROOT, stdio: ['pipe','pipe','pipe'], env: { ...PRIVATE_ENV } })
class RestoreError extends Error {
  constructor(code) { super(code); this.name = 'PrivateMongoRestoreError'; this.code = code }
}
const failure = (code) => new RestoreError(code)
const reject = (code) => { throw failure(code) }

export function fixtureProfile() {
  return { root: ROOT, host: HOST, port: PORT, mongod: MONGOD, mongorestore: RESTORE,
    fixtureServerVersion: '8.0.32', sourceServerVersion: '8.0.34', toolsVersion: '100.19.1' }
}

export function fixtureBinaryPins() { return Object.freeze({ ...BINARY_PINS }) }

// Injected socket/clock keep the native vacancy check offline-testable.
export function probeFixturePort(network, clocks) {
  return new Promise((resolve) => {
    let server, timer, settled = false
    const finish = (free) => {
      if (settled) return
      settled = true; clocks.clearTimeout(timer); resolve(free)
    }
    try {
      server = network.createServer()
      server.once('error', () => finish(false))
      timer = clocks.setTimeout(() => {
        try { server.close() } catch { /* an unbound probe cannot certify vacancy */ }
        finish(false)
      }, 3000)
      server.listen({ host: HOST, port: PORT, exclusive: true }, () => {
        server.close((error) => finish(!error))
      })
    } catch {
      try { server?.close() } catch { /* no successful vacancy result */ }
      finish(false)
    }
  })
}

export function validateFixtureTarget(target) {
  const expected = fixtureProfile()
  if (!target || Object.keys(expected).some((key) => target[key] !== expected[key]) ||
      Object.keys(target).some((key) => !Object.hasOwn(expected, key))) reject('restore_target_rejected')
  return true
}

function fixturePath(id) {
  if (!UUID.test(id)) reject('restore_identifier_rejected')
  return path.win32.join(ROOT, 'fixture-' + id)
}

export function mongodArguments(dbpath) {
  const leaf = path.win32.basename(dbpath)
  if (path.win32.dirname(dbpath) !== ROOT || !leaf.startsWith('fixture-') || !UUID.test(leaf.slice(8))) reject('restore_path_rejected')
  return ['--auth','--bind_ip',HOST,'--port',String(PORT),'--dbpath',dbpath,
    '--setParameter','diagnosticDataCollectionEnabled=false','--quiet']
}

export function restoreArguments(configFile, database) {
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(database || '') || INTERNAL.has(database) || database === 'test') reject('restore_database_rejected')
  mongodArguments(path.win32.dirname(configFile))
  if (path.win32.basename(configFile) !== 'restore-credentials.yml') reject('restore_config_path_rejected')
  return ['--config=' + configFile,'--archive','--gzip','--stopOnError','--nsInclude=' + database + '.*']
}

export function validateSnapshot(snapshot) {
  if (!snapshot || !/^[A-Za-z0-9_-]{1,63}$/.test(snapshot.database || '') ||
      INTERNAL.has(snapshot.database) || snapshot.database === 'test' || !Array.isArray(snapshot.collections) ||
      snapshot.collections.length < 1 || snapshot.collections.length > 14) reject('restore_snapshot_rejected')
  const names = new Set()
  let records = 0
  for (const entry of snapshot.collections) {
    if (!NAMES.has(entry?.name) || names.has(entry.name) || !Number.isSafeInteger(entry.count) ||
        entry.count < 0 || entry.count > 10000 || !SHA.test(entry.documentDigest || '') ||
        !SHA.test(entry.metadataDigest || '') ||
        Object.keys(entry).some((key) => !['name','count','documentDigest','metadataDigest'].includes(key))) reject('restore_snapshot_rejected')
    names.add(entry.name); records += entry.count
  }
  return { collections: names.size, records }
}

export function validateRestoreInput(manifest, archive) {
  const result = validateSnapshot(manifest?.snapshot)
  if (manifest?.format !== 'maxims-mongo-preservation-1' || manifest.serverVersion !== '8.0.34' ||
      manifest.toolsVersion !== '100.19.1' || manifest.observedStable !== true ||
      manifest.pointInTime !== false || manifest.writeFreeze !== false || manifest.restoreVerified !== false ||
      manifest.mediaVerified !== false || !Number.isFinite(Date.parse(manifest.createdAt)) ||
      !Number.isFinite(Date.parse(manifest.startedAt)) || !Buffer.isBuffer(archive) || archive.length < 32 ||
      archive.length > MAX || archive[0] !== 0x1f || archive[1] !== 0x8b ||
      manifest.archiveBytes !== archive.length || !SHA.test(manifest.archiveSha256 || '') ||
      createHash('sha256').update(archive).digest('hex') !== manifest.archiveSha256) reject('restore_manifest_rejected')
  return result
}

export function compareSnapshots(expected, actual) {
  const totals = validateSnapshot(expected)
  validateSnapshot(actual)
  if (actual.database !== expected.database || actual.collections.length !== expected.collections.length) reject('restore_snapshot_mismatch')
  const received = new Map(actual.collections.map((entry) => [entry.name, entry]))
  for (const entry of expected.collections) {
    const match = received.get(entry.name)
    if (!match || match.count !== entry.count || match.documentDigest !== entry.documentDigest ||
        match.metadataDigest !== entry.metadataDigest) reject('restore_snapshot_mismatch')
  }
  return totals
}

export function validateDatabaseInventory(result, source = null) {
  if (!Array.isArray(result?.databases)) reject('restore_database_inventory_rejected')
  const seen = new Set()
  for (const entry of result.databases) {
    if (typeof entry?.name !== 'string' || seen.has(entry.name) ||
        (!INTERNAL.has(entry.name) && entry.name !== source)) reject('restore_unexpected_database')
    seen.add(entry.name)
  }
  if (source && !seen.has(source)) reject('restore_database_missing')
}

// This adapter captures diagnostics privately; no native output is forwarded.
export function runPrivateProcess(command, args, input, dependencies, { timeout = 240000, limit = 65536 } = {}) {
  return new Promise((resolve, rejectPromise) => {
    let child
    try { child = dependencies.spawn(command, args, CHILD_OPTIONS()) }
    catch { rejectPromise(failure('restore_process_failed')); return }
    const chunks = []; let outputBytes = 0, diagnosticBytes = 0, failed = false
    let timer, killTimer, settled = false, aborting = false
    const clear = () => { dependencies.clearTimeout(timer); dependencies.clearTimeout(killTimer) }
    const finish = (errorCode, value) => {
      if (settled) return
      settled = true; clear()
      for (const chunk of chunks) chunk.fill(0)
      if (errorCode) rejectPromise(failure(errorCode)); else resolve(value)
    }
    const abort = () => {
      if (settled || aborting) return
      aborting = true
      failed = true
      dependencies.clearTimeout(timer)
      // Arm before kill: kill may synchronously emit error/close. Only close proves cleanup.
      killTimer = dependencies.setTimeout(() => finish('restore_cleanup_unverified'), 10000)
      try { child.kill() } catch { /* no retry/fallback target; wait for close or unverified cleanup */ }
    }
    child.stdout.on('data', (data) => {
      const chunk = Buffer.from(data); outputBytes += chunk.length
      if (outputBytes > limit) { chunk.fill(0); abort() } else chunks.push(chunk)
    })
    child.stderr.on('data', (data) => { diagnosticBytes += data.length; if (diagnosticBytes > limit) abort() })
    child.on('error', abort); child.stdin.on('error', abort)
    child.on('close', (code) => {
      if (settled) return
      const errorCode = failed || code !== 0 ? 'restore_process_failed' : null
      finish(errorCode, errorCode ? null : Buffer.concat(chunks))
    })
    timer = dependencies.setTimeout(abort, timeout)
    try { child.stdin.end(input) } catch { abort() }
  })
}

function verifyBinary(runtime, filename, pin) {
  if (!SHA.test(pin || '')) reject('restore_binary_pin_required')
  const stat = runtime.fs.lstatSync(filename)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 512 * 1024 * 1024 ||
      path.win32.resolve(runtime.fs.realpathSync(filename)).toLowerCase() !== filename.toLowerCase()) reject('restore_binary_rejected')
  const bytes = runtime.fs.readFileSync(filename)
  if (bytes.length !== stat.size || runtime.hashBinary(bytes) !== pin) reject('restore_binary_rejected')
}

function verifyDirectory(runtime, directory) {
  const stat = runtime.fs.lstatSync(directory)
  if (!stat.isDirectory() || stat.isSymbolicLink() ||
      path.win32.resolve(runtime.fs.realpathSync(directory)).toLowerCase() !== directory.toLowerCase()) reject('restore_directory_rejected')
}
const sameFile = (a, b) => typeof a.ino === 'bigint' && a.ino > 0n && a.dev === b.dev &&
  a.ino === b.ino && b.isFile() && !b.isSymbolicLink()

function watchMongod(child) {
  // Failed spawn can have no PID but still emit error/close asynchronously.
  // Always attach listeners, and never signal a process without a valid owned PID.
  const state = { child, exited: false, failed: !Number.isSafeInteger(child.pid) || child.pid <= 0 }
  state.closed = new Promise((resolve) => child.once('close', () => { state.exited = true; resolve() }))
  let bytes = 0
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => {
    bytes += chunk.length
    if (bytes > 1024 * 1024 && !state.exited) {
      state.failed = true
      try { if (Number.isSafeInteger(child.pid) && child.pid > 0) child.kill() } catch { /* cleanup must verify exit */ }
    }
  })
  child.on('error', () => { state.failed = true })
  child.stdin.on('error', () => { state.failed = true })
  child.stdin.end()
  return state
}

async function assertOwner(runtime, state) {
  const listeners = await runtime.portState()
  if (state.exited || state.failed || state.child.exitCode !== null || listeners.length !== 1 ||
      listeners[0].address !== HOST || listeners[0].pid !== state.child.pid) reject('restore_listener_identity_rejected')
}

// All adapters are required: offline tests cannot accidentally fall through to native I/O.
export function createRestoreRunner(runtime) {
  for (const key of ['fs','run','spawn','portState','portFree','inspectAcl','protectDirectory','connect',
    'readPrivateBackup','randomUUID','randomBytes','delay','BSON','hashBinary']) {
    if (!runtime?.[key]) reject('restore_adapter_required')
  }
  return async function restoreFixture(baseName) {
    let state, bootstrap, client, archive, credentialBytes, credentialIdentity, configFile, dbpath
    let result, problem, cleanupFailed = false, runtimeIdentityConfirmed = false
    const privateAcl = async (filename, directory) => validatePrivateAcl(await runtime.inspectAcl(filename, directory), directory)
    try {
      if (arguments.length !== 1) reject('restore_pin_override_rejected')
      if (runtime.platform !== 'win32' || typeof baseName !== 'string' || !baseName.startsWith('backup-') ||
          !UUID.test(baseName.slice(7))) reject('restore_request_rejected')
      verifyDirectory(runtime, ROOT); await privateAcl(ROOT, true)
      verifyBinary(runtime, MONGOD, BINARY_PINS.mongod); verifyBinary(runtime, RESTORE, BINARY_PINS.mongorestore)
      for (const [binary, pattern] of [[MONGOD, /^db version v8\.0\.32(?:\r?\n|$)/],
        [RESTORE, /^mongorestore version: 100\.19\.1(?:\r?\n|$)/]]) {
        const version = await runtime.run(binary, ['--version'], Buffer.alloc(0), { timeout: 15000 })
        try { if (!pattern.test(version.toString('utf8'))) reject('restore_binary_version_rejected') } finally { version.fill(0) }
      }
      if ((await runtime.portState()).length || !await runtime.portFree()) reject('restore_port_occupied')
      const backup = await runtime.readPrivateBackup(baseName)
      archive = backup?.archive
      validateRestoreInput(backup?.manifest, archive)
      const expected = backup.manifest.snapshot
      dbpath = fixturePath(runtime.randomUUID()); configFile = path.win32.join(dbpath, 'restore-credentials.yml')
      // mkdir is non-recursive and exclusive: never adopt a previous fixture.
      runtime.fs.mkdirSync(dbpath, { recursive: false, mode: 0o700 })
      await runtime.protectDirectory(dbpath)
      verifyDirectory(runtime, dbpath); await privateAcl(dbpath, true)
      if (runtime.fs.readdirSync(dbpath).length) reject('restore_fixture_not_empty')
      if ((await runtime.portState()).length || !await runtime.portFree()) reject('restore_port_occupied')
      verifyBinary(runtime, MONGOD, BINARY_PINS.mongod)
      state = watchMongod(runtime.spawn(MONGOD, mongodArguments(dbpath), CHILD_OPTIONS()))
      for (let attempt = 0; attempt < 90; attempt++) {
        if (state.exited || state.failed) reject('restore_startup_failed')
        if ((await runtime.portState()).length) break
        if (attempt === 89) reject('restore_startup_timeout')
        await runtime.delay(500)
      }
      await assertOwner(runtime, state)
      const username = 'fixture-' + runtime.randomUUID()
      if (!UUID.test(username.slice(8))) reject('restore_identifier_rejected')
      credentialBytes = runtime.randomBytes(32)
      if (!Buffer.isBuffer(credentialBytes) || credentialBytes.length !== 32) reject('restore_credentials_rejected')
      const password = credentialBytes.toString('base64url')
      const connectionOptions = { directConnection: true, serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000, socketTimeoutMS: 10000, maxPoolSize: 1, promoteValues: false, bsonRegExp: true }
      bootstrap = await runtime.connect(URI, connectionOptions)
      await assertOwner(runtime, state)
      await bootstrap.db('admin').command({ createUser: username, pwd: password,
        roles: [{ role: 'root', db: 'admin' }], maxTimeMS: 10000, writeConcern: { w: 1 } })
      await bootstrap.close(); bootstrap = null
      client = await runtime.connect(URI, { ...connectionOptions, authSource: 'admin', auth: { username, password } })
      const admin = client.db('admin')
      await assertOwner(runtime, state)
      const status = await admin.command({ serverStatus: 1, maxTimeMS: 10000 })
      const options = await admin.command({ getCmdLineOpts: 1, maxTimeMS: 10000 })
      if (String(status.pid) !== String(state.child.pid) || status.version !== '8.0.32' ||
          options.parsed?.net?.bindIp !== HOST || String(options.parsed.net.port) !== String(PORT) ||
          options.parsed?.security?.authorization !== 'enabled' || options.parsed?.storage?.dbPath !== dbpath ||
          options.parsed?.processManagement?.windowsService || options.parsed?.net?.bindIpAll) reject('restore_runtime_identity_rejected')
      runtimeIdentityConfirmed = true
      validateDatabaseInventory(await admin.command({ listDatabases: 1, nameOnly: true, maxTimeMS: 10000 }))
      // First successful authentication also proves the localhost exception has closed.
      const users = await admin.command({ usersInfo: 1, maxTimeMS: 10000 })
      if (users.users?.length !== 1 || users.users[0].user !== username) reject('restore_fixture_users_rejected')
      const fd = runtime.fs.openSync(configFile, 'wx', 0o600)
      try {
        credentialIdentity = runtime.fs.fstatSync(fd, { bigint: true })
        await privateAcl(configFile, false)
        if (!sameFile(credentialIdentity, runtime.fs.lstatSync(configFile, { bigint: true }))) reject('restore_config_identity_rejected')
        const yaml = Buffer.from('uri: ' + JSON.stringify('mongodb://' + username + '@127.0.0.1:33318/?authSource=admin&directConnection=true') +
          '\npassword: ' + JSON.stringify(password) + '\n', 'utf8')
        try { runtime.fs.writeFileSync(fd, yaml); runtime.fs.fsyncSync(fd) } finally { yaml.fill(0) }
        await privateAcl(configFile, false)
        if (!sameFile(credentialIdentity, runtime.fs.lstatSync(configFile, { bigint: true }))) reject('restore_config_identity_rejected')
      } finally { runtime.fs.closeSync(fd) }
      await assertOwner(runtime, state)
      verifyBinary(runtime, RESTORE, BINARY_PINS.mongorestore)
      const nativeResult = await runtime.run(RESTORE, restoreArguments(configFile, expected.database), archive, { timeout: 240000 })
      nativeResult.fill(0)
      await assertOwner(runtime, state)
      validateDatabaseInventory(await admin.command({ listDatabases: 1, nameOnly: true, maxTimeMS: 10000 }), expected.database)
      const observed = await snapshotMongo(client.db(expected.database), runtime.BSON, createHash)
      const totals = compareSnapshots(expected, observed)
      validateDatabaseInventory(await admin.command({ listDatabases: 1, nameOnly: true, maxTimeMS: 10000 }), expected.database)
      const finalUsers = await admin.command({ usersInfo: 1, maxTimeMS: 10000 })
      if (finalUsers.users?.length !== 1 || finalUsers.users[0].user !== username) reject('restore_fixture_users_rejected')
      result = { ...totals, fixtureServerVersion: '8.0.32', sourceServerVersion: '8.0.34', toolsVersion: '100.19.1',
        documentAndMetadataMatch: true, authenticatedFixture: true, fixtureDataRetained: true,
        // The protected fixture directory holds plaintext database files, not GCM ciphertext.
        fixtureDataEncryptedAtRest: false,
        pointInTime: false, mediaVerified: false, productionCompatibilityCertified: false }
    } catch (error) {
      problem = error instanceof RestoreError ? error : failure('restore_fixture_failed')
    } finally {
      archive?.fill(0); credentialBytes?.fill(0)
      if (configFile && credentialIdentity) {
        try {
          if (!sameFile(credentialIdentity, runtime.fs.lstatSync(configFile, { bigint: true }))) reject('restore_config_identity_rejected')
          runtime.fs.unlinkSync(configFile)
        } catch { cleanupFailed = true }
      }
      if (client && state && !state.exited && runtimeIdentityConfirmed) {
        let ownerConfirmed = false
        try { await assertOwner(runtime, state); ownerConfirmed = true } catch { cleanupFailed = true }
        if (ownerConfirmed) {
          try { await client.db('admin').command({ shutdown: 1, force: false, timeoutSecs: 5 }) } catch { /* shutdown closes its connection */ }
        }
      }
      for (const connection of [bootstrap, client]) if (connection) {
        try { await connection.close() } catch { cleanupFailed = true }
      }
      if (state) {
        try {
          if (!state.exited && state.child.exitCode === null && Number.isSafeInteger(state.child.pid) && state.child.pid > 0) state.child.kill()
          if (!state.exited) await Promise.race([state.closed, runtime.delay(10000).then(() => reject('restore_exit_unverified'))])
          if ((await runtime.portState()).length || !await runtime.portFree()) reject('restore_port_not_closed')
        } catch { cleanupFailed = true }
      }
    }
    if (cleanupFailed) reject('restore_cleanup_unverified')
    if (problem) throw problem
    return { ...result, fixtureStopped: true }
  }
}

function nativeRuntime() {
  const processes = { spawn, setTimeout, clearTimeout }
  const run = (command, args, input, options) => runPrivateProcess(command, args, input, processes, options)
  const powershell = async (script) => {
    const buffer = await run(POWERSHELL, ['-NoProfile','-NonInteractive','-Command', "$ErrorActionPreference='Stop'; try { " + script + ' } catch { exit 1 }'], Buffer.alloc(0), { timeout: 15000, limit: 16384 })
    try { return buffer.toString('utf8') } finally { buffer.fill(0) }
  }
  const checkedPath = (filename) => {
    if (filename !== ROOT && path.win32.dirname(filename) !== ROOT && path.win32.dirname(path.win32.dirname(filename)) !== ROOT) reject('restore_path_rejected')
    if (filename.includes("'") || filename.includes('..')) reject('restore_path_rejected')
    return filename
  }
  return {
    platform: process.platform, fs, spawn, run, BSON, randomUUID, randomBytes,
    hashBinary: (bytes) => createHash('sha256').update(bytes).digest('hex'),
    delay: (ms) => new Promise((resolve) => { const timer = setTimeout(resolve, ms); timer.unref() }),
    readPrivateBackup: async (baseName) => {
      const backup = await import('./private-mongo-backup.mjs')
      if (typeof backup.readPrivateBackup !== 'function') reject('restore_backup_api_unavailable')
      return backup.readPrivateBackup(baseName)
    },
    connect: async (uri, options) => {
      const client = new MongoClient(uri, options)
      try { await client.connect(); return client } catch { await client.close(); throw failure('restore_connection_failed') }
    },
    portFree: () => probeFixturePort(net, { setTimeout, clearTimeout }),
    portState: async () => JSON.parse(await powershell(`$items=@(Get-NetTCPConnection -ErrorAction Stop | Where-Object { $_.LocalPort -eq ${PORT} -and $_.State -eq 'Listen' } | ForEach-Object { @{address=$_.LocalAddress;pid=[int]$_.OwningProcess} }); [Console]::Out.Write((ConvertTo-Json -InputObject $items -Compress))`)),
    protectDirectory: async (filename) => {
      checkedPath(filename)
      if (path.win32.dirname(filename) !== ROOT || !UUID.test(path.win32.basename(filename).slice(8))) reject('restore_path_rejected')
      await powershell(`$p='${filename}'; $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User; $acl=New-Object Security.AccessControl.DirectorySecurity; $acl.SetOwner($sid); $acl.SetAccessRuleProtection($true,$false); foreach($s in @($sid.Value,'S-1-5-18','S-1-5-32-544')) { $id=New-Object Security.Principal.SecurityIdentifier($s); $r=New-Object Security.AccessControl.FileSystemAccessRule($id,'FullControl','ContainerInherit,ObjectInherit','None','Allow'); $acl.AddAccessRule($r) }; Set-Acl -LiteralPath $p -AclObject $acl`)
    },
    inspectAcl: async (filename) => {
      checkedPath(filename)
      return JSON.parse(await powershell(`$p='${filename}'; $item=Get-Item -LiteralPath $p -Force; $acl=Get-Acl -LiteralPath $p; $rules=@(foreach($r in $acl.Access) { @{sid=$r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value;allow=($r.AccessControlType -eq 'Allow');fullControl=($r.FileSystemRights -eq 'FullControl');propagationNone=($r.PropagationFlags -eq 'None');inherited=$r.IsInherited;objectInherit=[bool]($r.InheritanceFlags -band [Security.AccessControl.InheritanceFlags]::ObjectInherit);containerInherit=[bool]($r.InheritanceFlags -band [Security.AccessControl.InheritanceFlags]::ContainerInherit)} }); [Console]::Out.Write((@{currentSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;ownerSid=$acl.GetOwner([Security.Principal.SecurityIdentifier]).Value;rules=$rules;protected=$acl.AreAccessRulesProtected;directory=$item.PSIsContainer;reparsePoint=[bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint)} | ConvertTo-Json -Depth 5 -Compress))`))
    },
  }
}

// No CLI auto-run. Fixed pins are built in; extra arguments reject before native I/O.
export async function restorePrivateMongoFixture(baseName) {
  if (arguments.length !== 1) reject('restore_pin_override_rejected')
  return createRestoreRunner(nativeRuntime())(baseName)
}
