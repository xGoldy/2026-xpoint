import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// The publishable key (sb_publishable_…) is public by design. Vercel refuses
// browser-exposed variable names containing "KEY", hence the name. The legacy
// VITE_SUPABASE_ANON_KEY is still accepted for older local setups.
const publicKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const supabaseConfigured = Boolean(url && publicKey)

// Only the public key reaches the browser (NFR-6); row-level security does the rest.
export const supabase = createClient<Database>(url ?? 'http://localhost:54321', publicKey ?? 'missing-public-key')
