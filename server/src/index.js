// server/src/index.js
// Standalone server entry (local dev / non-serverless hosts).
import 'dotenv/config'
import { createApp } from './app.js'
import { connectDB } from './config/db.js'

const PORT = process.env.PORT || 4000

connectDB(process.env.MONGODB_URI)
  .then(() => {
    console.log('✓ MongoDB connected')
    createApp().listen(PORT, () => console.log(`✓ Maxims API on :${PORT}`))
  })
  .catch((e) => { console.error('DB connection failed:', e.message); process.exit(1) })
