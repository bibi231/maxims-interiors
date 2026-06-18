// src/lib/supabase.js
// DEPRECATED shim. The backend is now Express + MongoDB (see src/lib/api.js).
// Kept only so existing `import { getStorageUrl, BUCKETS, uploadFile } from
// '@/lib/supabase'` call sites keep working. Prefer importing from
// '@/lib/storage' (files) or '@/lib/api' (data) in new code.
export { getStorageUrl, BUCKETS, uploadFile, deleteFile } from '@/lib/storage'
