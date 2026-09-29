import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { User } from '../models.js'
import { signToken, requireAuth, requireOwner, ROLE_PERMISSIONS } from '../middleware/auth.js'
import { sendMail } from '../utils/mailer.js'
import { emailShell, esc } from '../utils/templates.js'
import { appUrl } from '../utils/notify.js'
import { logActivity } from '../utils/activity.js'

const router = Router()

// Tight rate limit on auth to deter brute force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please wait 15 minutes and try again, or reset your password.' },
})
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many reset requests. Please wait a few minutes and try again.' },
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const safe = (fn) => (req, res, next) => fn(req, res).catch(next)

// Password link (reset or first-time set-up). Embeds password_version, so it
// is single-use: it stops working as soon as the password changes.
function passwordLinkToken(user, hours = 1) {
  return jwt.sign({ id: user.id, pv: user.password_version || 0, purpose: 'pwreset' }, process.env.JWT_SECRET, { expiresIn: `${hours}h` })
}

router.post('/login', loginLimiter, safe(async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Please enter your email and password.' })
  const user = await User.findOne({ email: String(email).trim().toLowerCase() })
  if (user && !user.is_active) return res.status(403).json({ error: 'This account has been deactivated. Please contact the owner.' })
  const ok = user ? await bcrypt.compare(String(password), user.password_hash) : false
  if (!ok) return res.status(401).json({ error: 'Incorrect email or password. Check for typos, or use "Forgot your password?" below.' })
  user.last_seen = new Date(); await user.save()
  res.json({ token: signToken(user), user: user.toJSON() })
}))

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toJSON() }))

// Update own profile (name, title, avatar, and optionally password).
router.put('/me', requireAuth, safe(async (req, res) => {
  const { full_name, title, avatar_url, password } = req.body || {}
  if (full_name !== undefined) req.user.full_name = full_name
  if (title !== undefined) req.user.title = title
  if (avatar_url !== undefined) req.user.avatar_url = avatar_url
  if (password) {
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    req.user.password_hash = await bcrypt.hash(password, 12)
    req.user.password_version = (req.user.password_version || 0) + 1
  }
  await req.user.save()
  res.json({ user: req.user.toJSON() })
}))

// PUBLIC — request a reset link. Same answer whether or not the email exists.
router.post('/forgot-password', resetLimiter, safe(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
  const user = await User.findOne({ email })
  if (user && user.is_active) {
    const link = `${appUrl()}/admin/reset-password?token=${encodeURIComponent(passwordLinkToken(user))}`
    await sendMail({
      to: user.email,
      subject: 'Reset your Maxims admin password',
      html: emailShell({
        heading: 'Reset your password',
        body: `<p>Hello ${esc(user.full_name.split(' ')[0])},</p><p>We received a request to reset the password for your Maxims admin account. The link below works once and expires in 1 hour.</p><p style="font-size:13px;color:#6b6880;">If you did not ask for this, ignore this email; your password will not change.</p>`,
        ctaLabel: 'Choose a new password', ctaUrl: link,
      }),
    })
  }
  res.json({ ok: true, message: 'If that email belongs to a staff account, a reset link is on its way. Check your inbox and spam folder.' })
}))

// PUBLIC — set a new password from a reset / set-up link. Signs the user in.
router.post('/reset-password', resetLimiter, safe(async (req, res) => {
  const { token, password } = req.body || {}
  if (!token) return res.status(400).json({ error: 'This link is incomplete. Please request a new one.' })
  if (!password || String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  let payload
  try { payload = jwt.verify(token, process.env.JWT_SECRET) } catch {
    return res.status(400).json({ error: 'This link has expired. Please request a new reset link.' })
  }
  if (payload.purpose !== 'pwreset') return res.status(400).json({ error: 'Invalid link.' })
  const user = await User.findById(payload.id)
  if (!user || !user.is_active) return res.status(400).json({ error: 'This account is not active. Please contact the owner.' })
  if ((user.password_version || 0) !== payload.pv) return res.status(400).json({ error: 'This link has already been used. Please request a new one.' })
  user.password_hash = await bcrypt.hash(String(password), 12)
  user.password_version = (user.password_version || 0) + 1
  user.last_seen = new Date()
  await user.save()
  await logActivity({ userId: user.id, action: 'updated', resourceType: 'profile', resourceId: user.id, description: `${user.full_name} set a new password` })
  res.json({ token: signToken(user), user: user.toJSON() })
}))

// Owner creates a staff account. Password optional: if left blank the new
// staff member chooses their own via an emailed link (valid 72h).
router.post('/register', requireAuth, requireOwner, safe(async (req, res) => {
  const { password, full_name, role, title } = req.body || {}
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!full_name || !String(full_name).trim()) return res.status(400).json({ error: "Please enter the staff member's full name." })
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
  if (role && !ROLE_PERMISSIONS[role]) return res.status(400).json({ error: 'Unknown role.' })
  if (password && password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters, or leave it blank to email a set-up link.' })
  const exists = await User.findOne({ email })
  if (exists) {
    return res.status(409).json({ error: exists.is_active ? 'A staff account with this email already exists.' : 'This email belongs to a deactivated account. Reactivate it instead of creating a new one.' })
  }
  const password_hash = await bcrypt.hash(password || crypto.randomBytes(24).toString('hex'), 12)
  const user = await User.create({ email, password_hash, full_name: String(full_name).trim(), role: role || 'content_editor', title })

  const loginUrl = `${appUrl()}/admin/login`
  const setupUrl = `${appUrl()}/admin/reset-password?token=${encodeURIComponent(passwordLinkToken(user, 72))}&welcome=1`
  await sendMail({
    to: user.email,
    subject: 'Your Maxims admin account is ready',
    html: emailShell({
      heading: `Welcome to Maxims, ${esc(user.full_name.split(' ')[0])}`,
      body: `<p>${esc(req.user.full_name)} has created a staff account for you on the Maxims Interiors admin.</p>
        <p><strong>Sign-in email:</strong> ${esc(user.email)}<br><strong>Role:</strong> ${esc(String(user.role).replace(/_/g, ' '))}</p>
        ${password ? '<p>Your temporary password will be shared with you directly. You can also choose your own now with the button below.</p>' : '<p>Use the button below to choose your password. The link is valid for 72 hours.</p>'}
        <p style="font-size:13px;color:#6b6880;">Admin sign-in page: <a href="${loginUrl}" style="color:#1C0D35;">${loginUrl}</a></p>`,
      ctaLabel: 'Set my password', ctaUrl: setupUrl,
    }),
  })
  await logActivity({ userId: req.user.id, action: 'created', resourceType: 'profile', resourceId: user.id, description: `Created staff account for ${user.full_name} (${user.role})` })
  res.status(201).json({ user: user.toJSON(), invite_sent: true })
}))

export default router
