import mongoose from 'mongoose'

// Cached connection — critical for serverless (Vercel) so each function
// invocation reuses one connection instead of opening a new one every time.
let cached = globalThis.__maximsMongoose
if (!cached) cached = globalThis.__maximsMongoose = { conn: null, promise: null }

export async function connectDB(uri) {
  const u = uri || process.env.MONGODB_URI
  if (!u) throw new Error('MONGODB_URI is not set')
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    mongoose.set('strictQuery', true)
    cached.promise = mongoose.connect(u, { autoIndex: true, maxPoolSize: 5, serverSelectionTimeoutMS: 8000 })
  }
  cached.conn = await cached.promise
  return cached.conn
}
