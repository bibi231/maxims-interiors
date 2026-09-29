// server/src/db/model.js
// A small SQL-backed model layer that exposes the subset of the Mongoose API
// the routes use, so the MongoDB -> MariaDB move needs almost no route changes.
//
// Supported:
//   Model.find(filter).sort({ f: 1|-1 }).limit(n).select().populate(path, 'a b')
//   Model.findOne(filter) / Model.findById(id)           (thenable queries)
//   Model.exists / create / insertMany / countDocuments
//   Model.findByIdAndUpdate / findOneAndUpdate({ upsert }) / findByIdAndDelete
//   Model.deleteOne / deleteMany
//   doc.save() / doc.populate() / doc.deleteOne() / doc.toJSON()
// Filters: equality, null, RegExp, $in, $nin, $ne, $gt/$gte/$lt/$lte, $or, $and.
// Updates: plain fields, $set, $inc, $unset. (Updates always return the new doc.)
//
// Ids are 24-hex strings shaped like Mongo ObjectIds (4-byte time + 8 random),
// exposed as both `id` and `_id` in JSON.
import crypto from 'node:crypto'
import { query } from '../config/db.js'

const registry = new Map()
const qi = (c) => '`' + c + '`'

export function newId() {
  const b = Buffer.alloc(12)
  b.writeUInt32BE(Math.floor(Date.now() / 1000), 0)
  crypto.randomBytes(8).copy(b, 4)
  return b.toString('hex')
}
export const isValidId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v)

export class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; this.status = 400 }
}

const clone = (v) => (v && typeof v === 'object' && !(v instanceof Date) ? JSON.parse(JSON.stringify(v)) : v)
const refId = (v) => (v && typeof v === 'object' ? (v.id ?? v._id ?? null) : v)

export function defineModel(name, table, fields, hooks = {}) {
  const cols = Object.keys(fields)
  const known = new Set(['id', 'created_at', 'updated_at', ...cols])
  const colOf = (k) => {
    const c = k === '_id' ? 'id' : k
    if (!known.has(c)) throw new Error(`${name}: unknown field "${k}"`)
    return c
  }
  const typeOf = (c) => (c === 'id' ? 'id' : c === 'created_at' || c === 'updated_at' ? 'date' : fields[c].type)

  // JS value -> SQL parameter (with Mongoose-style casting + validation)
  function castIn(c, v) {
    const f = fields[c]
    if (v === undefined || v === null) v = null
    else {
      switch (f.type) {
        case 'string':
        case 'text':
          v = String(v)
          if (f.trim) v = v.trim()
          if (f.lowercase) v = v.toLowerCase()
          break
        case 'number':
          if (v === '') { v = null; break }
          v = Number(v)
          if (!Number.isFinite(v)) throw new ValidationError(`${c} must be a number`)
          break
        case 'int':
          if (v === '') { v = null; break }
          v = Number(v)
          if (!Number.isFinite(v)) throw new ValidationError(`${c} must be a number`)
          v = Math.round(v)
          break
        case 'bool':
          v = v === true || v === 1 || v === 'true' || v === '1' ? 1 : 0
          break
        case 'date':
          if (v === '') { v = null; break }
          v = v instanceof Date ? v : new Date(v)
          if (Number.isNaN(v.getTime())) throw new ValidationError(`${c} must be a date`)
          break
        case 'ref':
          v = refId(v)
          v = v ? String(v) : null
          break
        case 'json':
          v = JSON.stringify(v)
          break
        default:
          throw new Error(`${name}.${c}: unknown type ${f.type}`)
      }
    }
    if (v === null && f.type === 'json' && f.default !== undefined) v = JSON.stringify(f.default)
    if (f.required && (v === null || v === '')) throw new ValidationError(`${c} is required`)
    if (f.enum && v !== null && !f.enum.includes(v)) throw new ValidationError(`${c}: "${v}" is not a valid value`)
    return v
  }

  // SQL value -> JS value
  function castOut(c, v) {
    if (v === undefined || v === null) return null
    switch (typeOf(c)) {
      case 'bool': return Boolean(Number(v))
      case 'number': case 'int': return Number(v)
      case 'date': return v instanceof Date ? v : new Date(v)
      case 'json':
        if (typeof v === 'string') { try { return JSON.parse(v) } catch { return null } }
        if (Buffer.isBuffer(v)) { try { return JSON.parse(v.toString('utf8')) } catch { return null } }
        return v
      default: return v
    }
  }

  // Value used in a WHERE comparison
  function castQuery(c, v) {
    if (v === null || v === undefined) return null
    const t = typeOf(c)
    if (t === 'bool') return v === true || v === 1 || v === 'true' || v === '1' ? 1 : 0
    if (t === 'ref' || t === 'id') return String(refId(v))
    if (t === 'date') return v instanceof Date ? v : new Date(v)
    return v
  }

  function buildWhere(filter = {}) {
    const parts = []
    const params = []
    for (const [key, val] of Object.entries(filter || {})) {
      if (val === undefined) continue
      if (key === '$or' || key === '$and') {
        const subs = (val || []).map((f) => buildWhere(f)).filter((s) => s.sql)
        if (!subs.length) { if (key === '$or') parts.push('0'); continue }
        parts.push('(' + subs.map((s) => `(${s.sql})`).join(key === '$or' ? ' OR ' : ' AND ') + ')')
        subs.forEach((s) => params.push(...s.params))
        continue
      }
      const c = colOf(key)
      const col = qi(c)
      if (val instanceof RegExp) {
        // Collation utf8mb4_unicode_ci makes REGEXP case-insensitive, matching /.../i.
        parts.push(`${col} REGEXP ?`); params.push(val.source)
      } else if (val === null) {
        parts.push(`${col} IS NULL`)
      } else if (typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val) && Object.keys(val).some((k) => k.startsWith('$'))) {
        for (const [op, arg] of Object.entries(val)) {
          if (op === '$in' || op === '$nin') {
            const list = (arg || []).filter((x) => x !== null && x !== undefined).map((x) => castQuery(c, x))
            const hasNull = (arg || []).some((x) => x === null || x === undefined)
            if (op === '$in') {
              const ors = []
              if (list.length) { ors.push(`${col} IN (?)`); params.push(list) }
              if (hasNull) ors.push(`${col} IS NULL`)
              parts.push(ors.length ? `(${ors.join(' OR ')})` : '0')
            } else {
              if (list.length) { parts.push(`(${col} IS NULL OR ${col} NOT IN (?))`); params.push(list) }
              if (hasNull) parts.push(`${col} IS NOT NULL`)
            }
          } else if (op === '$ne') {
            if (arg === null || arg === undefined) parts.push(`${col} IS NOT NULL`)
            else { parts.push(`(${col} IS NULL OR ${col} <> ?)`); params.push(castQuery(c, arg)) }
          } else if (op === '$eq') {
            if (arg === null) parts.push(`${col} IS NULL`); else { parts.push(`${col} = ?`); params.push(castQuery(c, arg)) }
          } else if (['$gt', '$gte', '$lt', '$lte'].includes(op)) {
            const sym = { $gt: '>', $gte: '>=', $lt: '<', $lte: '<=' }[op]
            parts.push(`${col} ${sym} ?`); params.push(castQuery(c, arg))
          } else if (op === '$regex') {
            parts.push(`${col} REGEXP ?`); params.push(arg instanceof RegExp ? arg.source : String(arg))
          } else if (op === '$options') {
            // handled by collation
          } else {
            throw new Error(`${name}: unsupported operator ${op}`)
          }
        }
      } else {
        parts.push(`${col} = ?`); params.push(castQuery(c, val))
      }
    }
    return { sql: parts.join(' AND '), params }
  }

  function orderBy(sort) {
    if (!sort) return ''
    const entries = typeof sort === 'string'
      ? sort.split(/\s+/).filter(Boolean).map((s) => (s.startsWith('-') ? [s.slice(1), -1] : [s, 1]))
      : Object.entries(sort)
    if (!entries.length) return ''
    return ' ORDER BY ' + entries.map(([k, d]) => `${qi(colOf(k))} ${Number(d) < 0 || d === 'desc' ? 'DESC' : 'ASC'}`).join(', ')
  }

  class Doc {
    #pk
    #isNew
    constructor(data = {}, isNew = true) {
      this.#isNew = isNew
      if (isNew) {
        const given = data.id ?? data._id
        this.#pk = isValidId(String(given || '')) ? String(given) : newId()
        for (const c of cols) {
          let v = data[c]
          if (v === undefined) { const d = fields[c].default; v = typeof d === 'function' ? d() : clone(d) }
          this[c] = v === undefined ? null : v
        }
        this.created_at = null
        this.updated_at = null
      } else {
        this.#pk = data.id
        for (const c of cols) this[c] = castOut(c, data[c])
        this.created_at = castOut('created_at', data.created_at)
        this.updated_at = castOut('updated_at', data.updated_at)
      }
    }

    // Read-only ids; the no-op setters keep Object.assign(doc, req.body) safe.
    get id() { return this.#pk }
    set id(_v) {}
    get _id() { return this.#pk }
    set _id(_v) {}
    get isNew() { return this.#isNew }
    set isNew(_v) {}

    async save() {
      if (hooks.beforeSave) hooks.beforeSave(this)
      const row = {}
      for (const c of cols) row[c] = castIn(c, this[c])
      const now = new Date()
      if (this.#isNew) {
        this.created_at = this.created_at instanceof Date ? this.created_at : now
        this.updated_at = now
        const all = { id: this.#pk, ...row, created_at: this.created_at, updated_at: now }
        const keys = Object.keys(all)
        await query(`INSERT INTO ${qi(table)} (${keys.map(qi).join(', ')}) VALUES (?)`, [keys.map((k) => all[k])])
        this.#isNew = false
      } else {
        this.updated_at = now
        const keys = Object.keys(row)
        await query(
          `UPDATE ${qi(table)} SET ${keys.map((k) => `${qi(k)} = ?`).join(', ')}, ${qi('updated_at')} = ? WHERE ${qi('id')} = ?`,
          [...keys.map((k) => row[k]), now, this.#pk],
        )
      }
      // Normalise in-memory values to what was stored (trim, casts, ref ids).
      for (const c of cols) {
        if (fields[c].type === 'ref' && this[c] && typeof this[c] === 'object') continue // keep populated object
        this[c] = castOut(c, row[c])
      }
      return this
    }

    async deleteOne() {
      await query(`DELETE FROM ${qi(table)} WHERE ${qi('id')} = ?`, [this.#pk])
      return this
    }

    async populate(path, select) {
      await populateDocs([this], path, select)
      return this
    }

    toJSON() {
      const out = { id: this.#pk, _id: this.#pk }
      for (const c of cols) {
        if (fields[c].hidden) continue
        const v = this[c]
        out[c] = v && typeof v === 'object' && typeof v.toJSON === 'function' && !(v instanceof Date) ? v.toJSON() : v
      }
      out.created_at = this.created_at
      out.updated_at = this.updated_at
      return out
    }

    toObject() { return this.toJSON() }
  }

  async function populateDocs(docs, path, select) {
    const f = fields[path]
    if (!f || f.type !== 'ref') throw new Error(`${name}: cannot populate "${path}"`)
    const Ref = registry.get(f.ref)
    if (!Ref) throw new Error(`${name}: unknown ref model ${f.ref}`)
    const ids = [...new Set(docs.map((d) => refId(d[path])).filter(Boolean).map(String))]
    const found = ids.length ? await Ref.find({ id: { $in: ids } }) : []
    const pick = typeof select === 'string' ? select.split(/\s+/).filter(Boolean) : null
    const byId = new Map(found.map((r) => {
      const j = r.toJSON()
      return [r.id, pick ? Object.fromEntries([['id', j.id], ['_id', j.id], ...pick.filter((k) => k in j).map((k) => [k, j[k]])]) : j]
    }))
    for (const d of docs) {
      const id = refId(d[path])
      d[path] = id ? (byId.get(String(id)) ?? null) : null
    }
  }

  class Query {
    constructor(filter, one = false) {
      this.filter = filter || {}
      this.one = one
      this._sort = null
      this._limit = null
      this._pop = []
    }
    sort(s) { this._sort = s; return this }
    limit(n) { this._limit = n; return this }
    select() { return this } // projections are ignored (all columns are loaded)
    lean() { return this }
    populate(path, select) { this._pop.push([path, select]); return this }
    async exec() {
      const { sql, params } = buildWhere(this.filter)
      let s = `SELECT * FROM ${qi(table)}${sql ? ` WHERE ${sql}` : ''}${orderBy(this._sort)}`
      const lim = this.one ? 1 : Math.floor(Number(this._limit))
      if (lim > 0) s += ` LIMIT ${lim}`
      const rows = await query(s, params)
      const docs = rows.map((r) => new Doc(r, false))
      for (const [p, sel] of this._pop) await populateDocs(docs, p, sel)
      return this.one ? (docs[0] ?? null) : docs
    }
    then(resolve, reject) { return this.exec().then(resolve, reject) }
    catch(reject) { return this.exec().catch(reject) }
    finally(fn) { return this.exec().finally(fn) }
  }

  function applyUpdate(doc, update = {}) {
    for (const [k, v] of Object.entries(update)) {
      if (k === '$set') { applyUpdate(doc, v); continue }
      if (k === '$inc') { for (const [f, n] of Object.entries(v || {})) if (fields[f]) doc[f] = (Number(doc[f]) || 0) + Number(n) ; continue }
      if (k === '$unset') { for (const f of Object.keys(v || {})) if (fields[f]) doc[f] = null; continue }
      if (k.startsWith('$')) throw new Error(`${name}: unsupported update operator ${k}`)
      if (v === undefined || !fields[k]) continue // unknown keys ignored (Mongoose strict mode)
      doc[k] = v
    }
  }

  const Model = {
    modelName: name,
    table,
    fields,
    Doc,
    hydrate: (row) => new Doc(row, false),
    find: (filter = {}) => new Query(filter),
    findOne: (filter = {}) => new Query(filter, true),
    findById: (id) => new Query({ id: id == null ? '' : String(refId(id)) }, true),
    async exists(filter) {
      const d = await new Query(filter, true)
      return d ? { _id: d.id } : null
    },
    async create(data) {
      if (Array.isArray(data)) return Promise.all(data.map((d) => Model.create(d)))
      return new Doc(data || {}, true).save()
    },
    async insertMany(list) {
      const out = []
      for (const d of list || []) out.push(await Model.create(d))
      return out
    },
    async countDocuments(filter = {}) {
      const { sql, params } = buildWhere(filter)
      const rows = await query(`SELECT COUNT(*) AS n FROM ${qi(table)}${sql ? ` WHERE ${sql}` : ''}`, params)
      return Number(rows[0]?.n || 0)
    },
    async findOneAndUpdate(filter, update, opts = {}) {
      let doc = await new Query(filter, true)
      if (!doc) {
        if (!opts.upsert) return null
        const base = {}
        for (const [k, v] of Object.entries(filter || {})) {
          if (!k.startsWith('$') && (v === null || typeof v !== 'object' || v instanceof Date)) base[k] = v
        }
        doc = new Doc(base, true)
      }
      applyUpdate(doc, update)
      return doc.save()
    },
    findByIdAndUpdate: (id, update, opts) => Model.findOneAndUpdate({ id: String(refId(id) ?? '') }, update, opts),
    async findByIdAndDelete(id) {
      const doc = await Model.findById(id)
      if (doc) await doc.deleteOne()
      return doc
    },
    async deleteOne(filter) {
      const { sql, params } = buildWhere(filter)
      const r = await query(`DELETE FROM ${qi(table)}${sql ? ` WHERE ${sql}` : ''} LIMIT 1`, params)
      return { deletedCount: r.affectedRows || 0 }
    },
    async deleteMany(filter = {}) {
      const { sql, params } = buildWhere(filter)
      const r = await query(`DELETE FROM ${qi(table)}${sql ? ` WHERE ${sql}` : ''}`, params)
      return { deletedCount: r.affectedRows || 0 }
    },
    // exposed for tests
    _buildWhere: buildWhere,
  }
  registry.set(name, Model)
  return Model
}
