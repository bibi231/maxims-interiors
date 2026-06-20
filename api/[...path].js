// api/[...path].js
// Vercel serverless entry — runs the whole Express API as one function so the
// frontend and backend deploy together (no separate Render service to sleep).
// Vercel routes every /api/* request here; Express matches on the full path.
import { createApp } from '../server/src/app.js'
import { connectDB } from '../server/src/config/db.js'

const app = createApp()
let dbReady = null

export default async function handler(req, res) {
  try {
    dbReady = dbReady || connectDB()
    await dbReady
  } catch (e) {
    dbReady = null
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Database connection failed' }))
    return
  }
  return app(req, res)
}

// Let Express parse the body (disable Vercel's automatic body parsing).
export const config = { api: { bodyParser: false } }
