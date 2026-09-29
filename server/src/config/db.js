// server/src/config/db.js
// MariaDB / MySQL connection pool (mysql2/promise).
// Configure with DATABASE_URL=mysql://user:pass@host:3306/dbname
// (or DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME).
// The pool is cached on globalThis so serverless hosts reuse one pool.
import mysql from 'mysql2/promise'

function configFromEnv() {
  const url = process.env.DATABASE_URL
  if (url) {
    const u = new URL(url)
    if (!/^(mysql|mariadb):$/.test(u.protocol)) throw new Error('DATABASE_URL must start with mysql://')
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.replace(/^\//, '')),
    }
  }
  if (process.env.DB_NAME) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    }
  }
  throw new Error('DATABASE_URL is not set')
}

export function getPool() {
  if (!globalThis.__maximsPool) {
    globalThis.__maximsPool = mysql.createPool({
      ...configFromEnv(),
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_SIZE || 5),
      charset: 'UTF8MB4_UNICODE_CI',
      timezone: 'Z',            // all DATETIMEs are stored and read as UTC
      decimalNumbers: true,     // DECIMAL money columns come back as JS numbers
      supportBigNumbers: true,
      enableKeepAlive: true,
      connectTimeout: 10000,
    })
  }
  return globalThis.__maximsPool
}

/** Run one statement; returns rows (SELECT) or the result header (writes). */
export async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params)
  return rows
}

/** Kept for the existing call sites: verifies the database is reachable. */
export async function connectDB() {
  await query('SELECT 1')
  return getPool()
}

/** Health probe: { ok, ms } or { ok: false, error }. Never throws. */
export async function pingDB() {
  const t = Date.now()
  try {
    await query('SELECT 1')
    return { ok: true, ms: Date.now() - t }
  } catch (e) {
    return { ok: false, error: e.code || e.message }
  }
}

export async function closeDB() {
  const pool = globalThis.__maximsPool
  globalThis.__maximsPool = null
  if (pool) await pool.end()
}
