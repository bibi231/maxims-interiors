// server/src/db/applySchema.js
// Applies every sql/*.sql file in name order. Every file must be safe to re-run:
// CREATE TABLE IF NOT EXISTS, INSERT IGNORE, guarded UPDATEs. ALTER TABLE ... ADD
// COLUMN / ADD INDEX is written plainly (MySQL 8 has no ADD COLUMN IF NOT EXISTS,
// MariaDB does); "already exists" errors from those statements are skipped here.
// Run: npm run db:schema
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { query, closeDB } from '../config/db.js'

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../sql')

async function run() {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
      .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    const statements = sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean)
    let skipped = 0
    for (const st of statements) {
      try {
        await query(st)
      } catch (e) {
        // 1060 duplicate column, 1061 duplicate key name, 1091 can't drop (already gone)
        if (/^ALTER\s+TABLE/i.test(st) && [1060, 1061, 1091].includes(e.errno)) { skipped++; continue }
        throw e
      }
    }
    if (skipped) console.log(`  (${file}: ${skipped} ALTER statement(s) already applied)`)
    console.log(`✓ ${file} (${statements.length} statements)`)
  }
  const tables = await query('SHOW TABLES')
  console.log(`✓ ${tables.length} tables present`)
  await closeDB()
}

run().catch(async (e) => { console.error('Schema failed:', e.message); await closeDB().catch(() => {}); process.exit(1) })
