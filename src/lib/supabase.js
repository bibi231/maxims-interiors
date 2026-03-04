// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

// Storage bucket names — match what you created in Supabase dashboard
export const BUCKETS = {
  products:     'products',
  gallery:      'gallery',
  team:         'team',
  testimonials: 'testimonials',
  avatars:      'avatars',
}

// Get a public URL for a file in a bucket
export function getStorageUrl(bucket, path) {
  if (!path) return null
  if (path.startsWith('http')) return path // already a full URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Upload a file and return its storage path
export async function uploadFile(bucket, file, folder = '') {
  const ext = file.name.split('.').pop()
  const filename = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage.from(bucket).upload(filename, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return data.path
}

// Delete a file from storage
export async function deleteFile(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
