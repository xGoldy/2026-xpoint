// Client-side attempt limiting for login and registration. It is a usability
// and speed bump, not a security boundary: the authoritative limit is Supabase
// Auth's per-IP `sign_in_sign_ups` rate limit (supabase/config.toml and the
// hosted dashboard). This module adds a per-browser lockout with a countdown
// and remembers when the server itself said "too many requests".

export interface LimitRule {
  /** Failed attempts allowed inside the window. */
  max: number
  windowMs: number
}

export const LOGIN_LIMIT: LimitRule = { max: 5, windowMs: 15 * 60_000 }
export const SIGNUP_LIMIT: LimitRule = { max: 5, windowMs: 15 * 60_000 }
/** How long to back off after the server answers 429; matches Supabase's 5-minute window. */
export const SERVER_BACKOFF_MS = 5 * 60_000

export interface LimitState {
  /** Timestamps (ms) of recent failed attempts. */
  failures: number[]
  /** Set when the server rate-limited us. */
  blockedUntil: number | null
}

export const emptyState = (): LimitState => ({ failures: [], blockedUntil: null })

/** Drops failures that have left the window and an expired server block. */
export function prune(state: LimitState, rule: LimitRule, now: number): LimitState {
  return {
    failures: state.failures.filter((t) => t > now - rule.windowMs).sort((a, b) => a - b),
    blockedUntil: state.blockedUntil !== null && state.blockedUntil > now ? state.blockedUntil : null,
  }
}

/** When the lock ends, or null when another attempt is allowed now. */
export function lockedUntil(state: LimitState, rule: LimitRule, now: number): number | null {
  const s = prune(state, rule, now)
  const byFailures = s.failures.length >= rule.max ? s.failures[s.failures.length - rule.max] + rule.windowMs : null
  const until = Math.max(byFailures ?? 0, s.blockedUntil ?? 0)
  return until > now ? until : null
}

export function recordFailure(state: LimitState, rule: LimitRule, now: number): LimitState {
  const s = prune(state, rule, now)
  return { ...s, failures: [...s.failures, now] }
}

export function recordServerLimit(state: LimitState, rule: LimitRule, now: number, backoffMs = SERVER_BACKOFF_MS): LimitState {
  return { ...prune(state, rule, now), blockedUntil: now + backoffMs }
}

/** Attempts left before the lock; useful for a gentle warning. */
export function attemptsLeft(state: LimitState, rule: LimitRule, now: number): number {
  return Math.max(0, rule.max - prune(state, rule, now).failures.length)
}

/** "4:05" */
export function formatWait(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

// Storage ---------------------------------------------------------------------

const PREFIX = 'skillswap-limit:'

export function loadState(key: string): LimitState {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<LimitState>
    return {
      failures: Array.isArray(parsed.failures) ? parsed.failures.filter((n) => typeof n === 'number') : [],
      blockedUntil: typeof parsed.blockedUntil === 'number' ? parsed.blockedUntil : null,
    }
  } catch {
    return emptyState()
  }
}

export function saveState(key: string, state: LimitState): void {
  try {
    if (state.failures.length === 0 && state.blockedUntil === null) localStorage.removeItem(PREFIX + key)
    else localStorage.setItem(PREFIX + key, JSON.stringify(state))
  } catch {
    // Storage unavailable (private mode): the limit then lasts for this page only.
  }
}

/** True for Supabase Auth's "too many requests" answer. */
export function isServerRateLimit(error: unknown): boolean {
  const e = error as { code?: string; status?: number } | null
  return Boolean(e && (e.code === 'over_request_rate_limit' || e.status === 429))
}
