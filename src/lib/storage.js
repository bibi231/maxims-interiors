// src/lib/storage.js
// File-storage helpers backed by the Express API (Multer/Cloudinary).
// Image fields in the DB store a full URL, so getStorageUrl mostly passes
// values straight through — the bucket arg is kept for call-site compatibility.
import { api } from '@/lib/api'

export const BUCKETS = {
  products: 'products',
  gallery: 'gallery',
  team: 'team',
  testimonials: 'testimonials',
  avatars: 'avatars',
}

/** Resolve a stored image value to a displayable URL. */
export function getStorageUrl(_bucket, pathOrUrl) {
  if (!pathOrUrl) return null
  const v = String(pathOrUrl)
  if (v.startsWith('http')) return v
  return `${api.base}${v.startsWith('/') ? '' : '/'}${v}`
}

/** Upload a file to a bucket folder; returns its public URL. */
export async function uploadFile(bucket, file, folder = '') {
  const dest = folder ? `${bucket}-${folder}` : bucket
  const { url } = await api.upload(file, dest)
  return url
}

/** Deletion is handled server-side when a record is removed. */
export async function deleteFile() { /* no-op on the client */ }
