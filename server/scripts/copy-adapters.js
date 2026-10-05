// Explicit drivers; no environment loading, source writes, upserts or deletes.
import { GuardError } from './copy-core.js'

const MAX_ROWS = 10000
const quote = (name) => {
  if (!/^[a-z_]+$/.test(name)) throw new GuardError('invalid_identifier')
  return '`' + name + '`'
}

export function mongoSource(db, mappings, maxRows = MAX_ROWS) {
  return { async snapshot() {
    const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name)
    const known = new Set(mappings.map((m) => m.collection))
    const result = Object.fromEntries(names.map((n) => [n, []]))
    for (const name of names.filter((n) => known.has(n))) {
      result[name] = await db.collection(name).find({}).limit(maxRows + 1).toArray()
      if (result[name].length > maxRows) throw new GuardError('source_row_limit')
    }
    return result
  } }
}

export function mariaDestination(connection, maxRows = MAX_ROWS) {
  const read = async (sql, params = []) => {
    const [rows] = await connection.query({ sql, typeCast: (field, next) => field.type === 'NEWDECIMAL' ? field.string() : next() }, params)
    return rows
  }
  return {
    async snapshot(mappings, { lock = false } = {}) {
      const rows = {}, errors = []
      for (const m of mappings) {
        const table = quote(m.table)
        const status = await read('SHOW TABLE STATUS WHERE Name = ?', [m.table])
        if (status.length !== 1 || status[0].Engine !== 'InnoDB') errors.push({ table: m.table, code: 'requires_innodb' })
        const triggers = await read('SHOW TRIGGERS WHERE `Table` = ?', [m.table])
        if (triggers.length) errors.push({ table: m.table, code: 'unreviewed_triggers' })
        const fields = await read(`SHOW COLUMNS FROM ${table}`)
        const expected = ['id', ...Object.keys(m.model.fields), 'created_at', 'updated_at']
        const actual = fields.map((f) => f.Field)
        if (expected.some((c) => !actual.includes(c)) || actual.some((c) => !expected.includes(c))) {
          errors.push({ table: m.table, code: 'schema_column_mismatch' })
          rows[m.table] = []
          continue
        }
        rows[m.table] = await read(`SELECT * FROM ${table} ORDER BY id LIMIT ${maxRows + 1}${lock ? ' FOR UPDATE' : ''}`)
        if (rows[m.table].length > maxRows) throw new GuardError('destination_row_limit')
      }
      return { rows, errors }
    },
    async insert(mapping, row) {
      const keys = Object.keys(row)
      await connection.query(`INSERT INTO ${quote(mapping.table)} (${keys.map(quote).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, keys.map((k) => row[k]))
    },
    async transaction(work) {
      await connection.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE')
      await connection.beginTransaction()
      let commitStarted = false
      try {
        const result = await work()
        commitStarted = true
        await connection.commit()
        return result
      } catch (e) {
        // A lost COMMIT acknowledgement must not be reported as a proven rollback.
        try { await connection.rollback() } catch { throw new GuardError('rollback_outcome_unknown') }
        if (commitStarted) throw new GuardError('commit_outcome_unknown')
        throw e
      }
    },
  }
}
