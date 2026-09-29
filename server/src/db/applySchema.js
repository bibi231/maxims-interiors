// server/src/db/applySchema.js
// Applies every sql/*.sql file in name order (idempotent CREATE TABLE IF NOT EXISTS).
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
    for (const st of statements) await query(st)
    console.log(`✓ ${file} (${statements.length} statements)`)
  }
  const tables = await query('SHOW TABLES')
  console.log(`✓ ${tables.length} tables present`)
  await closeDB()
}

run().catch(async (e) => { console.error('Schema failed:', e.message); await closeDB().catch(() => {}); process.exit(1) })
