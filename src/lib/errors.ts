// Turns Supabase / Postgres errors into short sentences for inline display (NFR-5).

const CONSTRAINT_MESSAGES: Record<string, string> = {
  bookings_one_open_per_learner: 'You already have an open booking for this offer.',
  availability_slots_no_overlap: 'This overlaps another slot on the same day.',
  availability_slots_order: 'The end time must be after the start time.',
  skills_name_lower_key: 'A skill with this name already exists.',
  profiles_username_key: 'This username is already taken.',
  user_skills_user_id_skill_id_role_key: 'This skill is already on your list.',
  ratings_booking_id_key: 'You have already given points for this booking.',
  sessions_sequence_key: 'A session with this number already exists. Reload and try again.',
}

interface MaybePgError {
  message?: string
  code?: string
  details?: string | null
}

export function errorMessage(error: unknown): string {
  if (!error) return 'Something went wrong.'
  const e = error as MaybePgError
  const text = `${e.message ?? ''} ${e.details ?? ''}`
  for (const [name, message] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (text.includes(name)) return message
  }
  if (e.code === 'over_request_rate_limit' || (error as { status?: number }).status === 429)
    return 'Too many attempts from your network. Please wait a few minutes and try again.'
  if (e.code === '42501' || /row-level security/i.test(text)) return 'You are not allowed to do that.'
  if (e.code === 'PGRST116') return 'Not found.'
  if (/Failed to fetch|NetworkError/i.test(text)) return 'Cannot reach the server. Check your connection and try again.'
  return e.message || 'Something went wrong.'
}
