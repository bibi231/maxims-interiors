import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { User } from '../models.js'
import { signToken, requireAuth, requireOwner, ROLE_PERMISSIONS } from '../middleware/auth.js'
import { sendMail } from '../utils/mailer.js'
import { sendSetupEmail } from '../utils/staffInvite.js'
import { emailShell, esc } from '../utils/templates.js'
import { appUrl } from '../utils/notify.js'
import { logActivity } from '../utils/activity.js'

const router = Router()

// Tight rate limit on auth to deter brute force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please wait 15 minutes and try again, or reset your password.' },
})
// Forgot-password and reset-password have separate budgets: a person holding a
// valid link must never be locked out because someone (or they) asked for
// several links. Forgot: 5 per 15 min per IP + email. Reset: 20 per 15 min per IP.
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email || '').trim().toLowerCase()}`,
  message: { error: 'Too many reset requests for this email. Please wait 15 minutes and try again.' },
})
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
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
  user.last_seen = new Date(); user.invite_pending = false; await user.save()
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
router.post('/forgot-password', forgotLimiter, safe(async (req, res) => {
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
router.post('/reset-password', resetPasswordLimiter, safe(async (req, res) => {
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
  user.invite_pending = false
  await user.save()
  await logActivity({ userId: user.id, action: 'updated', resourceType: 'profile', resourceId: user.id, description: `${user.full_name} set a new password` })
  res.json({ token: signToken(user), user: user.toJSON() })
}))

// Owner invites a team member (name, email, role). The account is created
// WITHOUT a usable password and the person gets an emailed set-up link (72h,
// single use) through the site's own SMTP server. If the email fails the
// account still exists and the response carries the link so the owner can
// copy it and send it another way. An optional temporary password is still
// accepted for owners who prefer to share one directly.
router.post('/register', requireAuth, requireOwner, safe(async (req, res) => {
  const { password, full_name, role, title } = req.body || {}
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!full_name || !String(full_name).trim()) return res.status(400).json({ error: "Please enter the team member's full name." })
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
  if (role && !ROLE_PERMISSIONS[role]) return res.status(400).json({ error: 'Unknown role.' })
  if (password && password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters, or leave it blank to email a set-up link.' })
  const exists = await User.findOne({ email })
  if (exists) {
    return res.status(409).json({ error: exists.is_active ? 'A team member with this email already exists.' : 'This email belongs to a deactivated account. Reactivate it from the team list instead.' })
  }
  const password_hash = await bcrypt.hash(password || crypto.randomBytes(24).toString('hex'), 12)
  const user = await User.create({
    email, password_hash, full_name: String(full_name).trim(), role: role || 'content_editor', title,
    invite_pending: !password, invited_at: new Date(),
  })

  const mail = await sendSetupEmail(user, { invitedBy: req.user.full_name })
  await logActivity({ userId: req.user.id, action: 'created', resourceType: 'profile', resourceId: user.id, description: `Invited ${user.full_name} (${user.role})${mail.ok ? '' : ' - invite email failed'}` })
  res.status(201).json({
    user: user.toJSON(),
    invite_sent: mail.ok,
    email_error: mail.ok ? undefined : mail.error,
    // Owner-only endpoint: the owner can copy this and send it by WhatsApp etc.
    setup_url: mail.url,
  })
}))

export default router
