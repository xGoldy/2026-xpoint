import { useState, type FormEvent, type ReactNode } from 'react'
import { addSession, createRating, fetchBookingSessions, setBookingStatus, type BookingCard } from '../lib/api'
import type { BookingStatus } from '../lib/domain'
import { FORMAT_LABEL, fullName, STATUS_LABEL } from '../lib/domain'
import { errorMessage } from '../lib/errors'
import { buildIcs, downloadIcs } from '../lib/ics'
import { useInvalidateAll } from '../lib/queries'
import { formatDate, formatDateTime, localDateKey, localToUtc } from '../lib/time'
import { Button, Card, FormError, Pill, TextareaField, TextLink } from './ui'

export const isTeacher = (b: BookingCard, userId: string) => b.teacher_id === userId

/** The party who must accept or decline a pending booking. */
export const isResponder = (b: BookingCard, userId: string) =>
  b.status === 'pending' && (b.initiated_by === 'learner' ? b.teacher_id === userId : b.learner_id === userId)

export function canCancel(b: BookingCard, now = new Date()): boolean {
  if (b.status !== 'pending' && b.status !== 'accepted') return false
  const first = b.first_session_at ?? b.proposed_starts_at
  return !first || new Date(first) > now
}

export function canComplete(b: BookingCard, userId: string, now = new Date()): boolean {
  return b.status === 'accepted' && isTeacher(b, userId) && Boolean(b.last_session_end_at) && new Date(b.last_session_end_at!) <= now
}

const STATUS_TONE: Record<BookingStatus, 'neutral' | 'brand' | 'amber' | 'red' | 'green'> = {
  pending: 'amber',
  accepted: 'brand',
  declined: 'red',
  cancelled: 'neutral',
  completed: 'green',
}

export function StatusPill({ status }: { status: BookingStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>
}

/** Runs one status change with busy and error state. */
function useStatusChange(bookingId: string) {
  const invalidate = useInvalidateAll()
  const [busy, setBusy] = useState<BookingStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async (status: BookingStatus) => {
    setBusy(status)
    setError(null)
    try {
      await setBookingStatus(bookingId, status)
      await invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  return { busy, error, run }
}

/** A destructive action that asks for confirmation inline instead of a browser dialog. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  busy,
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  busy?: boolean
}) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <Button variant="danger" onClick={() => setAsking(true)}>
        {label}
      </Button>
    )
  return (
    <span role="group" aria-label={`${label}?`} className="flex flex-wrap items-center gap-2">
      <Button variant="danger" busy={busy} onClick={onConfirm} autoFocus>
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={() => setAsking(false)}>
        Keep it
      </Button>
    </span>
  )
}

/** BOOK-6 */
export function DownloadIcsButton({ booking }: { booking: BookingCard }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const download = async () => {
    setBusy(true)
    setError(null)
    try {
      const sessions = await fetchBookingSessions(booking)
      if (sessions.length === 0) {
        setError('No sessions are scheduled yet.')
        return
      }
      const other = fullName({ first_name: booking.teacher_first_name, last_name: booking.teacher_last_name })
      const ics = buildIcs(
        sessions.map((s) => ({
          uid: `${s.id}@skillswap`,
          startsAt: s.starts_at,
          endsAt: s.ends_at,
          title: `${booking.skill_name}: ${booking.offer_title} (${s.sequence_no}/${booking.session_count})`,
          description: `SkillSwap ${FORMAT_LABEL[booking.format]} session with ${other}.`,
          location: booking.mode === 'online' ? 'Online' : undefined,
          url: `${window.location.origin}/offers/${booking.offer_id}`,
        })),
      )
      downloadIcs(`skillswap-${booking.skill_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`, ics)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <span className="flex flex-col gap-1">
      <Button variant="secondary" busy={busy} onClick={download}>
        Download calendar file
      </Button>
      {error && <span className="text-sm font-medium text-danger-ink">{error}</span>}
    </span>
  )
}

/** RATE-1: 1 to 5 points and an optional comment, once. */
export function RateForm({ booking, learnerId }: { booking: BookingCard; learnerId: string }) {
  const invalidate = useInvalidateAll()
  const [points, setPoints] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const teacher = booking.teacher_first_name

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!points) {
      setError('Choose between 1 and 5 points.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createRating(booking.id, learnerId, points, comment.trim())
      await invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 rounded-xl border border-warn-line bg-warn-soft p-3">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">How many points do you give {teacher}?</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className={`flex size-11 cursor-pointer items-center justify-center rounded-xl border-2 font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus ${
                points === n ? 'border-star bg-star text-ink' : 'border-warn-line bg-surface text-ink hover:bg-warn-soft'
              }`}
            >
              <input type="radio" name={`points-${booking.id}`} value={n} checked={points === n} onChange={() => setPoints(n)} className="sr-only" />
              <span aria-hidden="true">{n}</span>
              <span className="sr-only">
                {n} {n === 1 ? 'point' : 'points'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <TextareaField label="Comment" optional maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
      <FormError error={error} />
      <div>
        <Button type="submit" busy={busy}>
          Give points
        </Button>
      </div>
    </form>
  )
}

function AddSessionForm({ booking }: { booking: BookingCard }) {
  const invalidate = useInvalidateAll()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const next = booking.session_rows + 1

  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Add session {next}
      </Button>
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!date || !time) {
      setError('Choose a date and a start time.')
      return
    }
    const at = localToUtc(date, time)
    if (at <= new Date()) {
      setError('The session must start in the future.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await addSession(booking, next, at)
      await invalidate()
      setOpen(false)
      setDate('')
      setTime('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex w-full flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3">
      <p className="text-sm font-semibold">
        Session {next} of {booking.session_count}
      </p>
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Date
          <input type="date" min={localDateKey(new Date())} value={date} onChange={(e) => setDate(e.target.value)} className="min-h-11 rounded-xl border border-line-strong/60 bg-surface px-3 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Start time
          <input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} className="min-h-11 rounded-xl border border-line-strong/60 bg-surface px-3 font-normal" />
        </label>
      </div>
      <FormError error={error} />
      <div className="flex gap-2">
        <Button type="submit" busy={busy}>
          Add session
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function When({ booking }: { booking: BookingCard }) {
  const now = new Date()
  if (booking.status === 'pending') {
    if (booking.proposed_starts_at) return <>Proposed first session: {formatDateTime(booking.proposed_starts_at)}</>
    if (booking.first_session_at) return <>Class starts {formatDateTime(booking.first_session_at)}</>
    return null
  }
  if (booking.status === 'accepted') {
    if (booking.next_session_at) return <>Next session: {formatDateTime(booking.next_session_at)}</>
    if (booking.last_session_end_at && new Date(booking.last_session_end_at) <= now)
      return <>All scheduled sessions are over (last ended {formatDate(booking.last_session_end_at)})</>
    return <>No sessions scheduled yet</>
  }
  if (booking.first_session_at && booking.last_session_end_at) {
    const first = formatDate(booking.first_session_at)
    const last = formatDate(booking.last_session_end_at)
    return <>{first === last ? first : `${first} – ${last}`}</>
  }
  if (booking.proposed_starts_at) return <>{formatDate(booking.proposed_starts_at)}</>
  return <>Requested {formatDate(booking.created_at)}</>
}

/** One booking with every action the viewer may take on it (BOOK-3, BOOK-5, BOOK-6, BOOK-8, RATE-1). */
export function BookingItem({ booking, userId, showOffer = true, extra }: { booking: BookingCard; userId: string; showOffer?: boolean; extra?: ReactNode }) {
  const { busy, error, run } = useStatusChange(booking.id)
  const teaching = isTeacher(booking, userId)
  const other = teaching
    ? { name: fullName({ first_name: booking.learner_first_name, last_name: booking.learner_last_name }), username: booking.learner_username }
    : { name: fullName({ first_name: booking.teacher_first_name, last_name: booking.teacher_last_name }), username: booking.teacher_username }
  const responder = isResponder(booking, userId)
  const initiatedByMe = booking.status === 'pending' && !responder
  const lead =
    booking.status === 'pending'
      ? responder
        ? booking.initiated_by === 'learner'
          ? 'Request from'
          : 'Invitation from'
        : booking.initiated_by === 'learner'
          ? 'You asked'
          : 'You invited'
      : teaching
        ? 'Learner:'
        : 'Teacher:'

  return (
    <Card as="article" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {showOffer && (
            <h3 className="font-bold text-ink">
              <TextLink to={`/offers/${booking.offer_id}`}>{booking.offer_title}</TextLink>
            </h3>
          )}
          <p className="text-sm text-muted">
            {booking.skill_name} · {FORMAT_LABEL[booking.format]} · {teaching ? 'You teach' : 'You learn'}
          </p>
        </div>
        <StatusPill status={booking.status} />
      </div>
      <p className="text-sm">
        {lead} <TextLink to={`/users/${other.username}`}>{other.name}</TextLink>
      </p>
      <p className="text-sm text-ink">
        <When booking={booking} />
      </p>
      {booking.message && (
        <blockquote className="border-l-4 border-primary-soft-strong pl-3 text-sm text-ink italic">“{booking.message}”</blockquote>
      )}
      {booking.status === 'completed' && booking.rating_points !== null && (
        <p className="text-sm">
          <span aria-hidden="true" className="text-star">★ </span>
          {teaching ? `${other.name} gave you` : 'You gave'} <strong>{booking.rating_points}</strong>{' '}
          {booking.rating_points === 1 ? 'point' : 'points'}
          {booking.rating_comment && <span className="text-muted"> · “{booking.rating_comment}”</span>}
        </p>
      )}
      {booking.status === 'completed' && !teaching && booking.rating_id === null && <RateForm booking={booking} learnerId={userId} />}
      {booking.status === 'completed' && teaching && booking.rating_id === null && (
        <p className="text-sm text-muted">No points given yet.</p>
      )}

      <div className="flex flex-wrap items-start gap-2">
        {responder && (
          <>
            <Button busy={busy === 'accepted'} onClick={() => run('accepted')}>
              Accept
            </Button>
            <ConfirmButton label="Decline" confirmLabel="Yes, decline" busy={busy === 'declined'} onConfirm={() => run('declined')} />
          </>
        )}
        {booking.status === 'accepted' && <DownloadIcsButton booking={booking} />}
        {booking.status === 'accepted' && teaching && booking.format === 'one_to_one' && booking.session_rows < booking.session_count && (
          <AddSessionForm booking={booking} />
        )}
        {canComplete(booking, userId) && (
          <Button busy={busy === 'completed'} onClick={() => run('completed')}>
            Mark completed
          </Button>
        )}
        {canCancel(booking) && !responder && (
          <ConfirmButton
            label={initiatedByMe ? 'Withdraw' : 'Cancel booking'}
            confirmLabel={initiatedByMe ? 'Yes, withdraw' : 'Yes, cancel'}
            busy={busy === 'cancelled'}
            onConfirm={() => run('cancelled')}
          />
        )}
        {extra}
      </div>
      {booking.status === 'accepted' && booking.first_session_at && booking.next_session_at === null && !teaching && (
        <p className="text-sm text-muted">Your teacher will mark this completed, then you can give points.</p>
      )}
      <FormError error={error} />
    </Card>
  )
}

