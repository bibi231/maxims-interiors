// server/src/routes/auth.js
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { User } from '../models.js'
import { signToken, requireAuth, requireOwner } from '../middleware/auth.js'

const router = Router()

// Tight rate limit on auth to deter brute force.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false })

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  const user = await User.findOne({ email: String(email).toLowerCase() })
  if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  user.last_seen = new Date(); await user.save()
  res.json({ token: signToken(user), user: user.toJSON() })
})

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toJSON() }))

// Owner invites a staff member.
router.post('/register', requireAuth, requireOwner, async (req, res) => {
  const { email, password, full_name, role, title } = req.body
  if (!email || !password || !full_name) return res.status(400).json({ error: 'Missing fields' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
  const exists = await User.findOne({ email: String(email).toLowerCase() })
  if (exists) return res.status(409).json({ error: 'Email already registered' })
  const password_hash = await bcrypt.hash(password, 12)
  const user = await User.create({ email, password_hash, full_name, role: role || 'content_editor', title })
  res.status(201).json({ user: user.toJSON() })
})

export default router
