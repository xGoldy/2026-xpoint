import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

// Only the public anon key reaches the browser (NFR-6); row-level security does the rest.
export const supabase = createClient<Database>(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key')
