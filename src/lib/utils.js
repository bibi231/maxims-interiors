import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Conditionally join Tailwind class names and merge conflicts.
 * Used across admin + public components.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Format a number as Nigerian Naira. */
export function formatNaira(amount) {
  const n = Number(amount) || 0
  return '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })
}

/** Format an ISO date string as a friendly date. */
export function formatDate(value, opts = {}) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'short', day: 'numeric', ...opts,
    })
  } catch { return String(value) }
}

/** Relative time, e.g. "3h ago". */
export function timeAgo(value) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(value)
}

/** Build a URL-friendly slug from a string. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Truncate text to n chars with an ellipsis. */
export function truncate(text, n = 60) {
  if (!text) return ''
  return text.length > n ? text.slice(0, n).trimEnd() + '…' : text
}
