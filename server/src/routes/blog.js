// server/src/routes/blog.js
// Journal / blog. Public: published posts only (published_at <= now).
// Staff with blog access: drafts too, create / edit / delete.
// Rich content is sanitised on save AND on public read.
import { Router } from 'express'
import { BlogPost, isValidId } from '../models.js'
import { requireAuth, canAccess, canWrite, attachUser, ROLE_PERMISSIONS } from '../middleware/auth.js'
import { sanitizeRichText, toPlainText } from '../utils/sanitize.js'
import { logActivity } from '../utils/activity.js'

const router = Router()
const safe = (fn) => (req, res, next) => fn(req, res).catch(next)

export const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120)

const isStaff = (req) => Boolean(req.user && ROLE_PERMISSIONS[req.user.role]?.access.includes('blog'))
const clip = (v, n) => (v === undefined || v === null ? undefined : String(v).trim().slice(0, n))

function publicShape(p, { full = false } = {}) {
  const j = p.toJSON()
  const out = {
    id: j.id, title: j.title, slug: j.slug, excerpt: j.excerpt, cover_image: j.cover_image, tags: j.tags || [],
    published_at: j.published_at, updated_at: j.updated_at, author_name: j.author_name, reading_minutes: j.reading_minutes,
    seo_title: j.seo_title, seo_description: j.seo_description,
  }
  if (full) out.content = sanitizeRichText(j.content)
  return out
}

async function uniqueSlug(base, exceptId) {
  const root = slugify(base) || 'post'
  let slug = root
  for (let i = 2; i < 200; i++) {
    const hit = await BlogPost.findOne({ slug })
    if (!hit || hit.id === exceptId) return slug
    slug = `${root}-${i}`
  }
  return `${root}-${Date.now().toString(36)}`
}

// Build a validated field set from a request body (create or update).
async function fieldsFrom(body, existing) {
  const b = body || {}
  const out = {}
  if (b.title !== undefined) out.title = clip(b.title, 255)
  if (b.content !== undefined) {
    out.content = sanitizeRichText(String(b.content).slice(0, 2_000_000))
    const words = toPlainText(out.content).split(' ').filter(Boolean).length
    out.reading_minutes = Math.max(1, Math.round(words / 220))
  }
  if (b.excerpt !== undefined) out.excerpt = clip(toPlainText(b.excerpt), 600)
  if (b.cover_image !== undefined) {
    const url = clip(b.cover_image, 1000) || ''
    out.cover_image = url && /^https?:\/\//i.test(url) ? url : null
  }
  if (b.tags !== undefined) {
    const list = Array.isArray(b.tags) ? b.tags : String(b.tags).split(',')
    out.tags = [...new Set(list.map((t) => String(t).trim().slice(0, 40)).filter(Boolean))].slice(0, 12)
  }
  if (b.seo_title !== undefined) out.seo_title = clip(b.seo_title, 255) || null
  if (b.seo_description !== undefined) out.seo_description = clip(b.seo_description, 500) || null
  if (b.status !== undefined) out.status = b.status === 'published' ? 'published' : 'draft'
  if (b.published_at !== undefined) out.published_at = b.published_at ? new Date(b.published_at) : null
  if (out.published_at && Number.isNaN(out.published_at.getTime())) out.published_at = null

  const status = out.status ?? existing?.status ?? 'draft'
  if (status === 'published' && !(out.published_at ?? existing?.published_at)) out.published_at = new Date()
  if (b.slug !== undefined || !existing) {
    out.slug = await uniqueSlug(b.slug || out.title || existing?.title, existing?.id)
  }
  // Auto excerpt from the content when left blank.
  const content = out.content ?? existing?.content
  if (!(out.excerpt ?? existing?.excerpt) && content) out.excerpt = toPlainText(content).slice(0, 220)
  return out
}

// PUBLIC list (published) / STAFF list (?all=1: drafts too)
router.get('/', attachUser, safe(async (req, res) => {
  const staffView = req.query.all === '1' && isStaff(req)
  const q = staffView ? {} : { status: 'published', published_at: { $lte: new Date() } }
  if (req.query.status && staffView) q.status = String(req.query.status)
  let rows = await BlogPost.find(q).sort(staffView ? { updated_at: -1 } : { published_at: -1 }).limit(Math.min(Number(req.query.limit) || 100, 200))
  if (req.query.tag) rows = rows.filter((r) => (r.tags || []).some((t) => t.toLowerCase() === String(req.query.tag).toLowerCase()))
  res.json(staffView ? rows : rows.map((r) => publicShape(r)))
}))

// STAFF — one post by id (for the editor)
router.get('/id/:id', requireAuth, canAccess('blog'), safe(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const p = await BlogPost.findById(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json(p)
}))

// PUBLIC — one published post by slug (+ previous/next)
router.get('/:slug', attachUser, safe(async (req, res) => {
  const p = await BlogPost.findOne({ slug: String(req.params.slug).toLowerCase() })
  const live = p && p.status === 'published' && p.published_at && p.published_at <= new Date()
  if (!p || (!live && !isStaff(req))) return res.status(404).json({ error: 'Post not found' })
  const published = await BlogPost.find({ status: 'published', published_at: { $lte: new Date() } }).sort({ published_at: -1 }).limit(200)
  const i = published.findIndex((x) => x.id === p.id)
  const related = published.filter((x) => x.id !== p.id && (x.tags || []).some((t) => (p.tags || []).includes(t))).slice(0, 3)
  res.json({
    ...publicShape(p, { full: true }),
    preview: !live,
    newer: i > 0 ? publicShape(published[i - 1]) : null,
    older: i >= 0 && i < published.length - 1 ? publicShape(published[i + 1]) : null,
    related: related.map((x) => publicShape(x)),
  })
}))

router.post('/', requireAuth, canWrite('blog'), safe(async (req, res) => {
  if (!String(req.body?.title || '').trim()) return res.status(400).json({ error: 'Please give the post a title.' })
  const fields = await fieldsFrom(req.body, null)
  const p = await BlogPost.create({ ...fields, author_id: req.user.id, author_name: req.user.full_name })
  await logActivity({ userId: req.user.id, action: 'created', resourceType: 'blog_post', resourceId: p.id, description: `${p.status === 'published' ? 'Published' : 'Drafted'} journal post "${p.title}"` })
  res.status(201).json(p)
}))

router.put('/:id', requireAuth, canWrite('blog'), safe(async (req, res) => {
  const p = isValidId(req.params.id) ? await BlogPost.findById(req.params.id) : null
  if (!p) return res.status(404).json({ error: 'Not found' })
  if (req.body?.title !== undefined && !String(req.body.title).trim()) return res.status(400).json({ error: 'Title cannot be empty.' })
  const was = p.status
  Object.assign(p, await fieldsFrom(req.body, p))
  await p.save()
  await logActivity({ userId: req.user.id, action: 'updated', resourceType: 'blog_post', resourceId: p.id, description: `${was !== p.status ? (p.status === 'published' ? 'Published' : 'Unpublished') : 'Updated'} journal post "${p.title}"` })
  res.json(p)
}))

router.delete('/:id', requireAuth, canWrite('blog'), safe(async (req, res) => {
  const p = isValidId(req.params.id) ? await BlogPost.findById(req.params.id) : null
  if (!p) return res.status(404).json({ error: 'Not found' })
  await p.deleteOne()
  await logActivity({ userId: req.user.id, action: 'deleted', resourceType: 'blog_post', resourceId: p.id, description: `Deleted journal post "${p.title}"` })
  res.json({ ok: true })
}))

export default router
