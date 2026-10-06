// Pure, offline-testable planning and reconciliation. No drivers, env or I/O.
import { createHash } from 'node:crypto'

const ID = /^[a-f0-9]{24}$/
const META = new Set(['_id', 'id', 'created_at', 'updated_at', 'createdAt', 'updatedAt'])
const MODEL_MAP = [
  ['users', 'User'], ['products', 'Product'], ['orders', 'Order'],
  ['bulkrequests', 'BulkRequest'], ['appointments', 'Appointment'], ['messages', 'Message'],
  ['galleries', 'Gallery'], ['testimonials', 'Testimonial'], ['teammembers', 'TeamMember'],
  ['settings', 'Setting'], ['activities', 'Activity'], ['newsletters', 'Newsletter'],
  ['transactions', 'Transaction'], ['blogposts', 'BlogPost'],
]

export class GuardError extends Error {
  constructor(code, field = null) { super(code); this.code = code; this.field = field }
}
export class CopyBlockedError extends Error {
  constructor(report) { super('Copy blocked; inspect the reconciliation report.'); this.report = report }
}

export function createMappings(models) {
  const mappings = MODEL_MAP.map(([collection, name]) => {
    const model = models[name]
    if (!model?.table || !model.fields || !model.toRow) throw new GuardError('missing_model')
    return { collection, model, table: model.table }
  })
  const mapped = new Set(mappings.map((m) => m.model))
  if (Object.values(models).some((m) => m?.table && m?.toRow && !mapped.has(m))) throw new GuardError('unmapped_model')
  return mappings
}

// SQL DECIMAL(14,2): compare exact cents, never round excess precision.
export function decimal(value) {
  const text = String(value)
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(text)
  if (!match) throw new GuardError('invalid_decimal')
  const fraction = match[3] || ''
  if (fraction.slice(2).replace(/0/g, '')) throw new GuardError('decimal_precision_loss')
  const cents = BigInt(match[2]) * 100n + BigInt((fraction + '00').slice(0, 2))
  if (cents > 99999999999999n) throw new GuardError('decimal_out_of_range')
  return `${match[1] && cents ? '-' : ''}${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}

function bson(value, allowDecimal = false) {
  if (value === undefined) throw new GuardError('undefined_value')
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) throw new GuardError('unsafe_number')
    return value
  }
  if (value instanceof Date) return value
  if (value?._bsontype) {
    if (['ObjectId', 'ObjectID'].includes(value._bsontype)) return value.toHexString()
    if (value._bsontype === 'Decimal128' && allowDecimal) return value.toString()
    if (['Long', 'Int32', 'Double'].includes(value._bsontype)) {
      const text = value.toString(), n = Number(text)
      if (!Number.isFinite(n) || (Number.isInteger(n) && (!Number.isSafeInteger(n) || BigInt(n).toString() !== text))) throw new GuardError('bson_precision_loss')
      return n
    }
    throw new GuardError('unsupported_bson')
  }
  if (Array.isArray(value)) return value.map((v) => bson(v))
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) throw new GuardError('unsupported_value')
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, bson(v)]))
}

function timestamp(value) {
  if (typeof value === 'string') {
    const dateParts = /^(\d{4})-(\d\d)-(\d\d)[T ]/.exec(value)
    if (!dateParts || Number(dateParts[2]) < 1 || Number(dateParts[2]) > 12 || Number(dateParts[3]) < 1 || Number(dateParts[3]) > new Date(Date.UTC(Number(dateParts[1]), Number(dateParts[2]), 0)).getUTCDate()) throw new GuardError('invalid_timestamp')
    if (/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d{1,3})?$/.test(value)) value = value.replace(' ', 'T') + 'Z'
    if (!/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)) throw new GuardError('ambiguous_timestamp')
    const fraction = /\.(\d+)(?:Z|[+-]\d\d:\d\d)$/.exec(value)?.[1] || ''
    if (fraction.slice(3).replace(/0/g, '')) throw new GuardError('timestamp_precision_loss')
  } else if (!(value instanceof Date)) throw new GuardError('invalid_timestamp')
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) throw new GuardError('invalid_timestamp')
  return d.toISOString()
}

function jsonTree(value) {
  if (value instanceof Date) return timestamp(value)
  if (Array.isArray(value)) return value.map(jsonTree)
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, jsonTree(value[k])]))
  if (value !== null && !['string', 'boolean', 'number'].includes(typeof value)) throw new GuardError('invalid_json_value')
  if (typeof value === 'number' && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) throw new GuardError('invalid_json_value')
  return value
}

function fieldValue(type, value) {
  if (value === undefined) throw new GuardError('missing_column')
  if (value === null) return null
  if (type === 'date') return timestamp(value)
  if (type === 'number') return decimal(value)
  if (type === 'int') {
    const n = Number(value)
    if (!/^-?\d+$/.test(String(value)) || !Number.isSafeInteger(n) || n < -2147483648 || n > 2147483647) throw new GuardError('invalid_integer')
    return n
  }
  if (type === 'bool') {
    if ([true, 1, '1', 'true'].includes(value)) return true
    if ([false, 0, '0', 'false'].includes(value)) return false
    throw new GuardError('invalid_boolean')
  }
  if (type === 'json') {
    let decoded = value
    if (typeof value === 'string') {
      try { decoded = JSON.parse(value) } catch { throw new GuardError('invalid_json') }
    }
    return jsonTree(decoded)
  }
  if (type === 'ref') {
    if (typeof value !== 'string' || !ID.test(value)) throw new GuardError('invalid_reference')
    return value
  }
  if (typeof value !== 'string') throw new GuardError('invalid_string')
  return value
}

function stable(value) { return JSON.stringify(jsonTree(value)) }
const digest = (value) => createHash('sha256').update(stable(value)).digest('hex')
const columns = (m) => ['id', ...Object.keys(m.model.fields), 'created_at', 'updated_at']

export function canonicalRow(mapping, row) {
  if (typeof row.id !== 'string' || !ID.test(row.id)) throw new GuardError('invalid_id', 'id')
  const expected = columns(mapping)
  for (const key of Object.keys(row)) if (!expected.includes(key)) throw new GuardError('unknown_destination_field', key)
  return Object.fromEntries(expected.map((key) => {
    try { return [key, key === 'id' ? row.id : fieldValue(mapping.model.fields[key]?.type || 'date', row[key])] }
    catch (e) { throw new GuardError(e.code || 'invalid_field', key) }
  }))
}

export function prepareDocument(mapping, document) {
  const unknown = Object.keys(document).filter((k) => !META.has(k) && !Object.hasOwn(mapping.model.fields, k))
  if (unknown.length) throw new GuardError('unknown_source_fields', unknown.sort())
  const id = bson(Object.hasOwn(document, '_id') ? document._id : document.id)
  if (typeof id !== 'string' || !ID.test(id)) throw new GuardError('invalid_id', 'id')
  if (document.id !== undefined && bson(document.id) !== id) throw new GuardError('conflicting_id_alias', 'id')
  const source = { id }, defaulted = []
  for (const name of ['created_at', 'updated_at']) {
    const alias = name === 'created_at' ? 'createdAt' : 'updatedAt'
    const present = Object.hasOwn(document, name), aliasPresent = Object.hasOwn(document, alias)
    for (const key of [name, alias]) if (Object.hasOwn(document, key) && document[key] === null) throw new GuardError('null_timestamp', key)
    if (present && aliasPresent && timestamp(document[name]) !== timestamp(document[alias])) throw new GuardError('conflicting_timestamp_alias', name)
    if (present || aliasPresent) source[name] = new Date(timestamp(present ? document[name] : document[alias]))
    else {
      source[name] = name === 'created_at' ? new Date(parseInt(id.slice(0, 8), 16) * 1000) : source.created_at
      defaulted.push(name)
    }
  }
  for (const [key, field] of Object.entries(mapping.model.fields)) {
    if (!Object.hasOwn(document, key)) { defaulted.push(key); continue }
    const value = bson(document[key], field.type === 'number')
    if (field.type === 'json') jsonTree(value)
    else fieldValue(field.type, value)
    source[key] = value
  }
  let row
  try { row = mapping.model.toRow(source) } catch { throw new GuardError('model_validation') }
  // Explicit source fields may not be silently normalised or replaced by defaults.
  for (const [key, field] of Object.entries(mapping.model.fields)) {
    if (!Object.hasOwn(source, key)) continue
    const original = field.type === 'json' ? jsonTree(source[key]) : fieldValue(field.type, source[key])
    if (stable(original) !== stable(fieldValue(field.type, row[key]))) throw new GuardError('lossy_model_cast', key)
    if (field.type === 'number' && source[key] !== null) row[key] = decimal(source[key])
  }
  return { row, canonical: canonicalRow(mapping, row), defaulted }
}

function differingPaths(a, b, path) {
  if (stable(a) === stable(b)) return []
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
    return keys.flatMap((key) => {
      const next = `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`
      return !Object.hasOwn(a, key) || !Object.hasOwn(b, key) ? [next] : differingPaths(a[key], b[key], next)
    })
  }
  return [path]
}

export function planCopy(mappings, source, target, schemaErrors = []) {
  const errors = [...schemaErrors], known = new Set(mappings.map((m) => m.collection))
  for (const name of Object.keys(source)) if (!known.has(name)) errors.push({ code: 'unknown_collection', collection: name })
  const tables = [], inserts = []
  for (const m of mappings) {
    const wanted = new Map(), existing = new Map(), defaulted = new Map()
    for (const document of source[m.collection] || []) {
      try {
        const item = prepareDocument(m, document)
        if (wanted.has(item.row.id)) throw new GuardError('duplicate_source_id', 'id')
        wanted.set(item.row.id, item)
        defaulted.set(item.row.id, item.defaulted)
      } catch (e) { errors.push({ collection: m.collection, code: e.code || 'invalid_source_document', field: e.field || null }) }
    }
    for (const row of target[m.table] || []) {
      try {
        const canonical = canonicalRow(m, row)
        if (existing.has(row.id)) throw new GuardError('duplicate_destination_id', 'id')
        existing.set(row.id, canonical)
      } catch (e) { errors.push({ table: m.table, code: e.code || 'invalid_destination_row', field: e.field || null }) }
    }
    const rows = [...new Set([...wanted.keys(), ...existing.keys()])].sort().map((id) => {
      const a = wanted.get(id)?.canonical, b = existing.get(id)
      const status = !a ? 'extra' : !b ? 'missing' : stable(a) === stable(b) ? 'identical' : 'conflict'
      const fields = columns(m).map((name) => ({ name, status: !a ? 'extra' : !b ? 'missing' : stable(a[name]) === stable(b[name]) ? 'equal' : 'different' }))
      const paths = a && b ? fields.filter((f) => f.status === 'different').flatMap((f) => differingPaths(a[f.name], b[f.name], `/${f.name}`)) : []
      if (status === 'missing') inserts.push({ mapping: m, row: wanted.get(id).row })
      return { id, status, fields, differingPaths: paths, defaultedFields: defaulted.get(id) || [], sourceDigest: a ? digest(a) : null, destinationDigest: b ? digest(b) : null }
    })
    const counts = Object.fromEntries(['identical', 'missing', 'conflict', 'extra'].map((status) => [status, rows.filter((r) => r.status === status).length]))
    tables.push({ collection: m.collection, table: m.table, sourcePresent: Object.hasOwn(source, m.collection), sourceCount: (source[m.collection] || []).length, destinationCount: (target[m.table] || []).length, counts, rows })
  }
  const canApply = !errors.length && tables.every((t) => !t.counts.conflict && !t.counts.extra)
  const equal = canApply && tables.every((t) => !t.counts.missing)
  return { inserts, report: { version: 1, status: canApply ? 'planned' : 'blocked', canApply, equal, errors, tables } }
}

export async function runCopy({ mappings, source, destination, apply = false, onPlan = async () => {}, onVerified = async () => {} }) {
  const documents = await source.snapshot()
  const sourcePresence = new Map(mappings.map(({ collection }) => [collection, Object.hasOwn(documents, collection)]))
  const work = async () => {
    const before = await destination.snapshot(mappings, { lock: apply })
    const plan = planCopy(mappings, documents, before.rows, before.errors)
    await onPlan(plan.report)
    if (!plan.report.canApply) throw new CopyBlockedError(plan.report)
    if (!apply) return plan.report
    for (const { mapping, row } of plan.inserts) await destination.insert(mapping, row)
    const after = await destination.snapshot(mappings, { lock: true })
    // Re-read source before commit. An immutable source/write freeze is still required
    // for an atomic cross-database cutover, but observed drift must never be ignored.
    const latestDocuments = await source.snapshot()
    const presenceErrors = mappings.filter(({ collection }) => Object.hasOwn(latestDocuments, collection) !== sourcePresence.get(collection))
      .map(({ collection }) => ({ code: 'source_collection_presence_drift', collection }))
    const reconciled = planCopy(mappings, latestDocuments, after.rows, [...(after.errors || []), ...presenceErrors]).report
    if (!reconciled.equal) throw new CopyBlockedError(reconciled)
    await onVerified(reconciled)
    return { ...reconciled, status: 'reconciled' }
  }
  return apply ? destination.transaction(work) : work()
}
