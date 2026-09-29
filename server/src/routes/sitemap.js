// server/src/routes/sitemap.js
// Dynamic sitemap: static pages + published journal posts + active products
// + published gallery projects. Served at /api/sitemap.xml (listed in
// public/robots.txt next to the static /sitemap.xml).
import { Router } from 'express'
import { BlogPost, Product } from '../models.js'
import { appUrl } from '../utils/notify.js'

const router = Router()
const STATIC = [
  ['/', 'weekly', '1.0'], ['/interior-decor', 'monthly', '0.9'], ['/gallery', 'weekly', '0.9'], ['/shop', 'weekly', '0.9'],
  ['/blog', 'weekly', '0.8'], ['/bulk-orders', 'monthly', '0.8'], ['/contact', 'monthly', '0.8'], ['/testimonials', 'monthly', '0.7'],
  ['/about', 'monthly', '0.7'], ['/team', 'monthly', '0.6'],
]
const xmlEsc = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))

router.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const base = appUrl()
    const [posts, products] = await Promise.all([
      BlogPost.find({ status: 'published', published_at: { $lte: new Date() } }).sort({ published_at: -1 }).limit(5000),
      Product.find({ status: 'active' }).limit(5000),
    ])
    const url = (loc, lastmod, freq, pri) => `  <url><loc>${xmlEsc(base + loc)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}${freq ? `<changefreq>${freq}</changefreq>` : ''}${pri ? `<priority>${pri}</priority>` : ''}</url>`
    const lines = [
      ...STATIC.map(([p, f, pr]) => url(p, null, f, pr)),
      ...posts.map((p) => url(`/blog/${encodeURIComponent(p.slug)}`, p.updated_at, 'monthly', '0.7')),
      ...products.map((p) => url(`/shop/${encodeURIComponent(p.slug)}`, p.updated_at, 'weekly', '0.6')),
    ]
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`)
  } catch (e) { next(e) }
})

export default router
