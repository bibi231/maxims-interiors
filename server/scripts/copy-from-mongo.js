// server/scripts/copy-from-mongo.js
// One-off copy of the live MongoDB data into MariaDB.
//
//   MONGODB_URI=mongodb+srv://...  DATABASE_URL=mysql://...  npm run db:copy-from-mongo [-- flags]
//
// - Reads with the official `mongodb` driver (optional dependency; the app itself
//   no longer uses MongoDB). Writes through the model layer's casting.
// - Keeps every ObjectId as the row id (24-hex), keeps created_at / updated_at,
//   bcrypt password hashes as-is (staff keep their passwords), roles, order line
//   items, status history, staff notes, settings values, etc.
// - Idempotent: INSERT ... ON DUPLICATE KEY UPDATE by id. Safe to re-run.
// - Lists unknown collections and unknown fields instead of dropping them silently.
// - Ends with a Mongo vs MariaDB comparison per table; exits 1 on any mismatch,
//   failed row, or row in MariaDB that does not exist in Mongo.
//
// Flags:
//   --dry-run     read + validate only; prints counts, unknown fields, failures. No writes.
//   --lenient     do not enforce enum/required rules (NOT NULL columns still apply)
//   --truncate    empty the target tables first (use if seed/staff were run on MariaDB
//                 before the copy, so seeded rows do not collide with the real data)
//   --only=a,b    limit to these tables (e.g. --only=orders,users)
import 'dotenv/config'
import { query, closeDB } from '../src/config/db.js'
import * as models from '../src/models.js'

const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const LENIENT = args.includes('--lenient')
const TRUNCATE = args.includes('--truncate')
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)

// Mongo collection (Mongoose pluralised model name) -> model
const MAP = [
  ['users', models.User],
  ['products', models.Product],
  ['orders', models.Order],
  ['bulkrequests', models.BulkRequest],
  ['appointments', models.Appointment],
  ['messages', models.Message],
  ['galleries', models.Gallery],
  ['testimonials', models.Testimonial],
  ['teammembers', models.TeamMember],
  ['settings', models.Setting],
  ['activities', models.Activity],
  ['newsletters', models.Newsletter],
  ['transactions', models.Transaction],
].filter(([, M]) => !ONLY.length || ONLY.includes(M.table))

const IGNORED_FIELDS = new Set(['_id', '__v', 'id', 'created_at', 'updated_at', 'createdAt', 'updatedAt'])
const qi = (c) => '`' + c + '`'

// BSON -> plain JS (ObjectId -> hex, Decimal128/Long -> number), recursively.
function plain(v) {
  if (v === null || v === undefined) return v
  if (v instanceof Date) return v
  const t = v._bsontype
  if (t === 'ObjectId' || t === 'ObjectID') return v.toHexString()
  if (t === 'Decimal128') return Number(v.toString())
  if (t === 'Long' || t === 'Int32' || t === 'Double') return Number(v.valueOf())
  if (Array.isArray(v)) return v.map(plain)
  if (typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
  return v
}

function toSource(doc) {
  const d = plain(doc)
  const id = d._id
  d.id = id
  // Mongoose used snake_case timestamps; fall back to camelCase or the ObjectId time.
  d.created_at = d.created_at || d.createdAt || (doc._id?.getTimestamp ? doc._id.getTimestamp() : undefined)
  d.updated_at = d.updated_at || d.updatedAt || d.created_at
  return d
}

async function upsert(M, rows) {
  const keys = Object.keys(rows[0])
  const sql = `INSERT INTO ${qi(M.table)} (${keys.map(qi).join(', ')}) VALUES ? ` +
    `ON DUPLICATE KEY UPDATE ${keys.filter((k) => k !== 'id').map((k) => `${qi(k)} = VALUES(${qi(k)})`).join(', ')}`
  await query(sql, [rows.map((r) => keys.map((k) => r[k]))])
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set')
  let MongoClient
  try { ({ MongoClient } = await import('mongodb')) } catch {
    throw new Error('The `mongodb` package is missing. Run `npm install` in server/ (it is an optional dependency).')
  }
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  await client.connect()
  const db = client.db(process.env.MONGODB_DB || undefined)
  console.log(`Source: MongoDB database "${db.databaseName}"${DRY ? '   (DRY RUN — nothing is written)' : ''}\n`)

  // Unknown collections
  const present = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name)
  const known = new Set(MAP.map(([c]) => c))
  const unknownCols = present.filter((c) => !known.has(c) && !c.startsWith('system.'))
  if (unknownCols.length && !ONLY.length) {
    console.log('UNKNOWN collections (not copied — no table for them):')
    for (const c of unknownCols) console.log(`  - ${c}: ${await db.collection(c).countDocuments()} documents`)
    console.log('')
  }

  if (TRUNCATE && !DRY) {
    for (const [, M] of MAP) await query(`DELETE FROM ${qi(M.table)}`)
    console.log(`Emptied ${MAP.length} target tables (--truncate)\n`)
  }

  const summary = []
  let problems = 0
  for (const [coll, M] of MAP) {
    const exists = present.includes(coll)
    const docs = exists ? await db.collection(coll).find({}).toArray() : []
    const unknownFields = new Map()
    const failures = []
    const rows = []
    for (const doc of docs) {
      const src = toSource(doc)
      for (const k of Object.keys(src)) {
        if (!IGNORED_FIELDS.has(k) && !M.fields[k]) unknownFields.set(k, (unknownFields.get(k) || 0) + 1)
      }
      try { rows.push(M.toRow(src, { strict: !LENIENT })) } catch (e) { failures.push([src.id, e.message]) }
    }

    // Write in batches; if a batch fails, retry row by row to pinpoint the bad rows.
    if (!DRY) {
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100)
        try { await upsert(M, batch) } catch {
          for (const r of batch) {
            try { await upsert(M, [r]) } catch (e) { failures.push([r.id, e.sqlMessage || e.message]) }
          }
        }
      }
    }

    const srcIds = docs.map((d) => plain(d._id))
    const target = Number((await query(`SELECT COUNT(*) AS n FROM ${qi(M.table)}`))[0].n)
    const matched = srcIds.length
      ? Number((await query(`SELECT COUNT(*) AS n FROM ${qi(M.table)} WHERE ${qi('id')} IN (?)`, [srcIds]))[0].n)
      : 0
    const extra = target - matched
    summary.push({ table: M.table, collection: exists ? coll : `${coll} (absent)`, mongo: docs.length, mariadb: target, missing: docs.length - matched, extra, failed: failures.length })

    if (unknownFields.size) {
      console.log(`${coll}: UNKNOWN fields (not copied): ${[...unknownFields].map(([k, n]) => `${k} (${n})`).join(', ')}`)
    }
    if (failures.length) {
      console.log(`${coll}: ${failures.length} document(s) FAILED:`)
      for (const [id, msg] of failures.slice(0, 50)) console.log(`  - ${id}: ${msg}`)
      if (failures.length > 50) console.log(`  … ${failures.length - 50} more`)
    }
    if (failures.length || (!DRY && (docs.length !== matched || extra))) problems++
  }

  console.log('\nTable            Mongo  MariaDB  missing  extra  failed')
  for (const s of summary) {
    const ok = DRY ? !s.failed : !s.failed && !s.missing && !s.extra
    console.log(`${s.table.padEnd(16)} ${String(s.mongo).padStart(5)}  ${String(s.mariadb).padStart(7)}  ${String(s.missing).padStart(7)}  ${String(s.extra).padStart(5)}  ${String(s.failed).padStart(6)}  ${ok ? 'OK' : 'CHECK'}`)
  }
  if (DRY) console.log('\nDry run: MariaDB columns show the CURRENT target state; missing is expected before the real copy.')
  await client.close()
  return problems
}

main()
  .then(async (problems) => {
    await closeDB()
    if (problems) { console.error(`\n✗ ${problems} table(s) need attention (see above).`); process.exit(1) }
    console.log(DRY ? '\n✓ Dry run complete: every document validates.' : '\n✓ Copy complete: every table matches.')
  })
  .catch(async (e) => { console.error('Copy failed:', e.message); await closeDB().catch(() => {}); process.exit(1) })
