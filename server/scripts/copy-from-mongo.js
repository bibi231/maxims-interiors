// Read-only by default; no environment file loading or implicit overwrite mode.
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createMappings, CopyBlockedError, GuardError, runCopy } from './copy-core.js'
import { mongoSource, mariaDestination } from './copy-adapters.js'

export function parseArgs(args) {
  let mode = 'plan', report = null, selectedMode = false
  if (args.length === 1 && args[0] === '--help') return { help: true }
  for (const arg of args) {
    if (['--apply', '--dry-run', '--reconcile'].includes(arg)) {
      if (selectedMode) throw new Error('Choose one mode.')
      selectedMode = true
      mode = arg === '--apply' ? 'apply' : arg === '--reconcile' ? 'reconcile' : 'plan'
    } else if (arg.startsWith('--report=') && !report && arg.slice(9)) report = arg.slice(9)
    else throw new Error('Unsupported argument; truncate, lenient and partial copies are forbidden.')
  }
  if (!report) throw new Error('A new --report=PATH is required.')
  return { mode, report }
}

export async function persistReport(file, report) {
  const bytes = Buffer.from(JSON.stringify(report, null, 2) + '\n', 'utf8')
  await file.truncate(0)
  let offset = 0
  while (offset < bytes.length) {
    const { bytesWritten } = await file.write(bytes, offset, bytes.length - offset, offset)
    if (!bytesWritten) throw new GuardError('report_write_incomplete')
    offset += bytesWritten
  }
  await file.sync()
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args)
  if (options.help) {
    console.log('Usage: node scripts/copy-from-mongo.js [--dry-run|--reconcile|--apply] --report=NEW.json\nDefault: read-only plan. Reports never overwrite files. Configuration must be supplied by the caller; no .env is loaded.')
    return 0
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be supplied by the caller.')
  let planFile, resultFile, ackFile, client, connection, pool, committed = false
  const write = persistReport
  try {
    // Reserve both metadata-only reports before any database work; never overwrite.
    planFile = await fs.open(options.report, 'wx', 0o600)
    resultFile = await fs.open(options.report + '.result.json', 'wx', 0o600)
    if (options.mode === 'apply') ackFile = await fs.open(options.report + '.commit.json', 'wx', 0o600)
    const [{ MongoClient }, models, db] = await Promise.all([
      import('mongodb'), import('../src/models.js'), import('../src/config/db.js'),
    ])
    const mappings = createMappings(models)
    client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
    await client.connect()
    pool = db.getPool()
    connection = await pool.getConnection()
    const report = await runCopy({
      mappings, source: mongoSource(client.db(process.env.MONGODB_DB || undefined), mappings),
      destination: mariaDestination(connection), apply: options.mode === 'apply',
      onPlan: (r) => write(planFile, { ...r, mode: options.mode }),
      onVerified: (r) => write(resultFile, { ...r, status: 'verified_before_commit', mode: options.mode, committed: null }),
    })
    committed = options.mode === 'apply'
    if (committed) await write(ackFile, { status: 'committed', committed: true })
    else await write(resultFile, { ...report, mode: options.mode, committed: false })
    console.log(JSON.stringify({ status: report.status, equal: report.equal, mode: options.mode, committed }))
    return options.mode === 'reconcile' && !report.equal ? 1 : 0
  } catch (e) {
    const failure = e instanceof CopyBlockedError ? e.report : {
      status: committed ? 'committed_report_failed' : 'failed',
      error: e instanceof GuardError ? e.code : 'operation_failed', committed: e?.code?.endsWith('outcome_unknown') ? null : committed,
      detail: 'No driver error text or data values are emitted; use authorised secure diagnostics.',
    }
    if (committed) console.error(JSON.stringify({ status: 'committed_report_failed', committed: true }))
    const failureFile = committed ? ackFile : resultFile
    if (failureFile) await write(failureFile, failure)
    throw e instanceof CopyBlockedError ? e : new Error('Copy failed; inspect the reserved report and configuration privately.')
  } finally {
    connection?.release()
    if (pool) await pool.end()
    await client?.close()
    await planFile?.close()
    await resultFile?.close()
    await ackFile?.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((code) => { process.exitCode = code }).catch(() => {
    console.error('Copy blocked or failed; no source or destination values are printed.')
    process.exitCode = 1
  })
}
