// server/src/index.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'node:path'
import rateLimit from 'express-rate-limit'

import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import galleryRoutes from './routes/gallery.js'
import testimonialRoutes from './routes/testimonials.js'
import teamRoutes from './routes/team.js'
import orderRoutes from './routes/orders.js'
import bulkRoutes from './routes/bulk.js'
import apptRoutes from './routes/appointments.js'
import messageRoutes from './routes/messages.js'
import newsletterRoutes from './routes/newsletter.js'
import settingRoutes from './routes/settings.js'
import paymentRoutes from './routes/payments.js'
import miscRoutes from './routes/misc.js'

const app = express()

app.set('trust proxy', 1)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// CORS — allow configured frontend origins
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim())
app.use(cors({ origin: origins, credentials: true }))

// Capture raw body so we can verify gateway webhook signatures.
app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { req.rawBody = buf } }))
app.use(express.urlencoded({ extended: true }))

// Global soft rate limit
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }))

// Serve locally-stored uploads (STORAGE_DRIVER=local)
app.use('/uploads', express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')))

app.get('/health', (_req, res) => res.json({ ok: true, service: 'maxims-api' }))

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/gallery', galleryRoutes)
app.use('/api/testimonials', testimonialRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/bulk', bulkRoutes)
app.use('/api/appointments', apptRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/newsletter', newsletterRoutes)
app.use('/api/settings', settingRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api', miscRoutes)

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message)
  const code = err.message?.includes('File too large') ? 413 : 500
  res.status(code).json({ error: err.message || 'Server error' })
})

const PORT = process.env.PORT || 4000
connectDB(process.env.MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`✓ Maxims API on :${PORT}`)))
  .catch((e) => { console.error('DB connection failed:', e.message); process.exit(1) })
