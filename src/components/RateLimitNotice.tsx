import { formatWait } from '../lib/rateLimit'

/** Lockout countdown, or a gentle warning when few attempts are left. */
export function RateLimitNotice({ lockedFor, attemptsLeft, action }: { lockedFor: number; attemptsLeft: number; action: string }) {
  if (lockedFor > 0)
    return (
      <p role="alert" className="rounded-xl border border-warn-line bg-warn-soft px-3.5 py-2.5 text-sm font-medium text-warn-ink">
        Too many attempts. For your security you can {action} again in{' '}
        <span className="font-mono tabular-nums">{formatWait(lockedFor)}</span>.
      </p>
    )
  if (attemptsLeft > 0 && attemptsLeft <= 2)
    return (
      <p role="status" className="text-sm text-warn-ink">
        {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left before a short pause.
      </p>
    )
  return null
}
