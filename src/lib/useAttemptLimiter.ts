import { useEffect, useState } from 'react'
import {
  attemptsLeft,
  emptyState,
  loadState,
  lockedUntil,
  recordFailure,
  recordServerLimit,
  saveState,
  type LimitRule,
  type LimitState,
} from './rateLimit'

/** Per-browser attempt limit for one form, persisted across reloads, with a live countdown. */
export function useAttemptLimiter(key: string, rule: LimitRule) {
  const [state, setState] = useState<LimitState>(() => loadState(key))
  const [now, setNow] = useState(() => Date.now())
  const until = lockedUntil(state, rule, now)

  // Tick once a second while locked so the countdown and the button update.
  useEffect(() => {
    if (!until) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [until])

  const update = (change: (s: LimitState, t: number) => LimitState) => {
    const t = Date.now()
    // Start from storage so limits are shared between open tabs.
    const next = change(loadState(key), t)
    saveState(key, next)
    setState(next)
    setNow(t)
  }

  return {
    /** Milliseconds until another attempt is allowed; 0 when not locked. */
    lockedFor: until ? until - now : 0,
    attemptsLeft: attemptsLeft(state, rule, now),
    /** Re-checks storage right before submitting. */
    isLocked: () => lockedUntil(loadState(key), rule, Date.now()) !== null,
    recordFailure: () => update((s, t) => recordFailure(s, rule, t)),
    recordServerLimit: () => update((s, t) => recordServerLimit(s, rule, t)),
    reset: () => update(() => emptyState()),
  }
}
