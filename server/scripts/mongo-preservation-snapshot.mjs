// Read-only digest inventory, not an encrypted backup or a point-in-time snapshot.
// All dependencies/helpers stay inside the export for function.toString() transport.
export async function snapshotMongo(db, BSON, createHash) {
  const names = [
    'users', 'products', 'orders', 'bulkrequests', 'appointments', 'messages',
    'galleries', 'testimonials', 'teammembers', 'settings', 'activities',
    'newsletters', 'transactions', 'blogposts',
  ]
  const allowed = new Set(names)
  const maxCount = 10000
  const maxBytes = 64 * 1024 * 1024
  const maxTimeMS = 10000
  let totalBytes = 0

  class SnapshotError extends Error {
    constructor(code) { super(code); this.name = 'MongoPreservationSnapshotError'; this.code = code }
  }
  function reject(code) { throw new SnapshotError(code) }
  function consumeBytes(length) {
    if (!Number.isSafeInteger(length) || length < 0 || length > maxBytes - totalBytes) reject('snapshot_byte_limit')
    totalBytes += length
  }
  function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys)
    if (value !== null && typeof value === 'object') {
      // EJSON may come from an injected dependency in another JS realm.
      const prototype = Object.getPrototypeOf(value)
      if (prototype !== null && Object.getPrototypeOf(prototype) !== null) reject('snapshot_metadata_invalid')
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]))
    }
    return value
  }
  async function readCursor(cursor, consume) {
    try {
      for await (const value of cursor) await consume(value)
    } finally {
      await cursor.close()
    }
  }

  try {
    if (!db || typeof db.databaseName !== 'string' || !db.databaseName.length ||
        typeof db.listCollections !== 'function' || typeof db.collection !== 'function' ||
        typeof BSON?.serialize !== 'function' || typeof BSON?.EJSON?.serialize !== 'function' ||
        typeof createHash !== 'function') reject('snapshot_dependencies_invalid')

    const listed = new Map()
    await readCursor(db.listCollections({}, { nameOnly: false, maxTimeMS }), (entry) => {
      if (!entry || !allowed.has(entry.name)) reject('snapshot_unknown_collection')
      if (entry.type !== 'collection') reject('snapshot_noncollection')
      if (listed.has(entry.name)) reject('snapshot_duplicate_collection')
      listed.set(entry.name, entry)
    })

    const collections = []
    // Fixed mapping order makes listCollections ordering irrelevant. Absence is not emptiness.
    for (const name of names.filter((name) => listed.has(name))) {
      const entry = listed.get(name)
      const collection = db.collection(name)
      const indexes = []
      const indexNames = new Set()
      await readCursor(collection.listIndexes({ maxTimeMS }), (index) => {
        if (!index || typeof index.name !== 'string' || !index.name.length || indexNames.has(index.name)) reject('snapshot_index_invalid')
        indexNames.add(index.name)
        // Compound-index field order is semantic; preserve it before canonical key sorting.
        indexes.push({ ...index, key: Object.entries(index.key) })
      })
      indexes.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
      const metadata = JSON.stringify(sortKeys(BSON.EJSON.serialize({
        type: entry.type, options: entry.options ?? {}, indexes,
      }, { relaxed: false })))
      consumeBytes(Buffer.byteLength(metadata, 'utf8'))
      const metadataDigest = createHash('sha256').update(metadata, 'utf8').digest('hex')
      const documents = createHash('sha256')
      let count = 0
      const cursor = collection.find({}, { promoteValues: false, bsonRegExp: true })
        .sort({ _id: 1 }).limit(maxCount + 1).maxTimeMS(maxTimeMS)
      await readCursor(cursor, (document) => {
        if (++count > maxCount) reject('snapshot_count_limit')
        const bytes = BSON.serialize(document)
        consumeBytes(4 + bytes.length)
        const prefix = Buffer.alloc(4)
        prefix.writeUInt32BE(bytes.length)
        documents.update(prefix).update(bytes)
      })
      collections.push({ name, count, documentDigest: documents.digest('hex'), metadataDigest })
    }
    return { database: db.databaseName, collections }
  } catch (error) {
    // Driver/serializer exceptions may contain documents, identifiers or connection details.
    // Do not retain the original exception as a cause or attach a partial inventory.
    if (error instanceof SnapshotError) throw error
    throw new SnapshotError('snapshot_read_failed')
  }
}
