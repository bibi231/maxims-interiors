// server/src/index.js
// Standalone server entry (local dev, DirectAdmin/Passenger, PM2).
import 'dotenv/config'
import { createApp } from './app.js'
import { connectDB } from './config/db.js'

const PORT = process.env.PORT || 4000

// Listen even if the first DB check fails, so /api/health can report the
// problem (and requests recover on their own once the DB is reachable).
connectDB()
  .then(() => console.log('✓ Database connected'))
  .catch((e) => console.error('✗ Database connection failed:', e.code || '', e.message))
  .finally(() => createApp().listen(PORT, () => console.log(`✓ Maxims API on :${PORT}`)))
