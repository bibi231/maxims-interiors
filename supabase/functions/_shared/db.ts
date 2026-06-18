// supabase/functions/_shared/db.ts
// Service-role Supabase client for Edge Functions. This client bypasses
// RLS, so it is the ONLY place allowed to mark a transaction as paid.
// Never expose the service role key to the browser.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key, { auth: { persistSession: false } })
}
