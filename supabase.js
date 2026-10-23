import { createClient } from '@supabase/supabase-js'

// Replace placeholders with your Supabase Project URL and publishable/anon key.
// This key is intended for browser use only when Row Level Security is enabled.
// NEVER put a service_role or secret key in this file.
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY'

const configured =
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')

export const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export const isSupabaseConfigured = Boolean(supabase)