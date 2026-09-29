// server/src/utils/sanitize.js
// Allowlist sanitiser for rich text from the admin editor (blog posts).
// Everything not listed is stripped: scripts, event handlers, style
// attributes, iframes, forms, javascript:/data: URLs.
import sanitizeHtml from 'sanitize-html'

const OPTIONS = {
  allowedTags: [
    'p', 'br', 'hr', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
    'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'code', 'pre',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    ol: ['start'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['https', 'http'] },
  allowProtocolRelative: false,
  // Editors sometimes paste h1; the page already has one, so demote it.
  transformTags: {
    h1: 'h2',
    a: (tagName, attribs) => {
      const external = /^https?:\/\//i.test(attribs.href || '') && !/^https?:\/\/(www\.)?maximsinterior\.com\.ng/i.test(attribs.href)
      return {
        tagName,
        attribs: external
          ? { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' }
          : { href: attribs.href, ...(attribs.title ? { title: attribs.title } : {}) },
      }
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
  },
}

export function sanitizeRichText(html) {
  return sanitizeHtml(String(html || ''), OPTIONS).trim()
}

/** Plain text for excerpts, meta descriptions and reading time. */
export function toPlainText(html) {
  const spaced = String(html || '').replace(/<\/(p|h[1-6]|li|blockquote|figcaption|pre)>|<br\s*\/?>/gi, (m) => m + ' ')
  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}
