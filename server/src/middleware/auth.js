// server/src/middleware/auth.js
import jwt from 'jsonwebtoken'
import { User } from '../models.js'

// Mirror of the frontend ROLE_PERMISSIONS — the server is the source of truth.
export const ROLE_PERMISSIONS = {
  owner:           { access: ['dashboard','products','orders','transactions','bulk_requests','appointments','messages','gallery','testimonials','team','newsletter','settings','activity'],
                     write:  ['products','orders','transactions','bulk_requests','appointments','messages','gallery','testimonials','team','newsletter','settings'], canDelete: true },
  senior_designer: { access: ['dashboard','appointments','bulk_requests','gallery','testimonials','orders'],
                     write:  ['appointments','bulk_requests','gallery','testimonials'], canDelete: false },
  project_manager: { access: ['dashboard','appointments','bulk_requests','messages','orders','transactions'],
                     write:  ['appointments','bulk_requests','messages','orders'], canDelete: false },
  shop_manager:    { access: ['dashboard','products','orders','transactions'],
                     write:  ['products','orders','transactions'], canDelete: false },
  content_editor:  { access: ['dashboard','gallery','testimonials'],
                     write:  ['gallery','testimonials'], canDelete: false },
}

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

// Require a valid JWT; attaches req.user (the full user doc).
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Authentication required' })
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.id)
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid session' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Soft auth: attach req.user if a valid token is present, but never block.
// Lets one list endpoint serve both public (active only) and staff (all).
export async function attachUser(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(payload.id)
      if (user && user.is_active) req.user = user
    }
  } catch { /* ignore — treat as anonymous */ }
  next()
}

// Require write access to a section (use after requireAuth).
export function canWrite(section) {
  return (req, res, next) => {
    const perms = ROLE_PERMISSIONS[req.user?.role]
    if (!perms?.write.includes(section)) return res.status(403).json({ error: 'Insufficient permissions' })
    next()
  }
}

// Require read access to a section.
export function canAccess(section) {
  return (req, res, next) => {
    const perms = ROLE_PERMISSIONS[req.user?.role]
    if (!perms?.access.includes(section)) return res.status(403).json({ error: 'Access denied' })
    next()
  }
}

// Owner-only (deletes, team management, settings).
export function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') return res.status(403).json({ error: 'Owner only' })
  next()
}
