// server/src/middleware/upload.js
// Backend-provided file storage. Two drivers, chosen via STORAGE_DRIVER:
//   'local'      → Multer disk, files served at API_URL/uploads/...
//   'cloudinary' → uploaded to Cloudinary, returns a CDN URL
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { nanoid } from 'nanoid'

const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 5)
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

// In-memory storage so we can branch to disk or Cloudinary after validation.
const storage = multer.memoryStorage()
export const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) return cb(new Error('Only JPG, PNG, WebP, AVIF allowed'))
    cb(null, true)
  },
})

// Persist a validated file buffer; returns a public URL string.
export async function persistFile(file, folder = 'misc') {
  const driver = process.env.STORAGE_DRIVER || 'local'
  const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase()
  const filename = `${nanoid(12)}.${ext}`

  if (driver === 'cloudinary') {
    const { v2: cloudinary } = await import('cloudinary')
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `maxims/${folder}`, public_id: filename.replace(/\.\w+$/, '') },
        (err, result) => (err ? reject(err) : resolve(result.secure_url)),
      )
      stream.end(file.buffer)
    })
  }

  // local disk
  const baseDir = process.env.UPLOAD_DIR || 'uploads'
  const dir = path.join(process.cwd(), baseDir, folder)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, filename), file.buffer)
  const apiUrl = (process.env.API_URL || '').replace(/\/$/, '')
  return `${apiUrl}/${baseDir}/${folder}/${filename}`
}
