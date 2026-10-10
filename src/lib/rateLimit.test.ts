import { describe, expect, it } from 'vitest'
import {
  attemptsLeft,
  emptyState,
  formatWait,
  isServerRateLimit,
  lockedUntil,
  recordFailure,
  recordServerLimit,
  type LimitRule,
} from './rateLimit'

const rule: LimitRule = { max: 3, windowMs: 60_000 }
const fail = (times: number[]) => times.reduce((s, t) => recordFailure(s, rule, t), emptyState())

describe('attempt limiter', () => {
  it('allows attempts until the limit is reached', () => {
    expect(lockedUntil(fail([0, 1000]), rule, 2000)).toBeNull()
    expect(attemptsLeft(fail([0, 1000]), rule, 2000)).toBe(1)
  })

  it('locks after max failures until the oldest counted failure leaves the window', () => {
    const s = fail([0, 10_000, 20_000])
    expect(lockedUntil(s, rule, 21_000)).toBe(60_000)
    expect(lockedUntil(s, rule, 60_001)).toBeNull()
  })

  it('forgets failures older than the window', () => {
    const s = fail([0, 1000, 70_000])
    expect(s.failures).toEqual([70_000])
    expect(lockedUntil(s, rule, 70_001)).toBeNull()
  })

  it('honours a server rate-limit block on its own', () => {
    const s = recordServerLimit(emptyState(), rule, 5000, 300_000)
    expect(lockedUntil(s, rule, 6000)).toBe(305_000)
    expect(lockedUntil(s, rule, 305_000)).toBeNull()
  })

  it('uses the later of the two locks', () => {
    const s = recordServerLimit(fail([0, 1, 2]), rule, 3, 10_000)
    expect(lockedUntil(s, rule, 4)).toBe(60_000)
  })

  it('recognises Supabase 429 errors', () => {
    expect(isServerRateLimit({ code: 'over_request_rate_limit' })).toBe(true)
    expect(isServerRateLimit({ status: 429 })).toBe(true)
    expect(isServerRateLimit({ code: 'invalid_credentials', status: 400 })).toBe(false)
    expect(isServerRateLimit(null)).toBe(false)
  })

  it('formats the wait as minutes and seconds', () => {
    expect(formatWait(245_000)).toBe('4:05')
    expect(formatWait(400)).toBe('0:01')
  })
})
