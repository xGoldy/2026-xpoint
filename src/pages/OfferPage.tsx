import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { BookingItem, ConfirmButton, StatusPill } from '../components/BookingItem'
import { ProposeTimeField } from '../components/ProposeTimeField'
import { Avatar } from '../components/TeacherList'
import {
  Button,
  Card,
  EmptyState,
  FormError,
  FormSuccess,
  LinkButton,
  PageTitle,
  Pill,
  Points,
  QueryView,
  Section,
  TextareaField,
  TextLink,
} from '../components/ui'
import {
  createBooking,
  fetchAvailability,
  fetchBookingsForOffer,
  fetchOffer,
  fetchOfferSessions,
  updateOffer,
  type OfferCard,
} from '../lib/api'
import { slotFromRow } from '../lib/availability'
import { formatDuration, FORMAT_LABEL, fullName, LEVEL_LABEL, MODE_LABEL, plural } from '../lib/domain'
import { errorMessage } from '../lib/errors'
import { useInvalidateAll } from '../lib/queries'
import { formatDate, formatRange } from '../lib/time'

/** BOOK-1 and BOOK-2: request a 1:1 offer or a seat in a class. */
function RequestForm({ offer, userId }: { offer: OfferCard; userId: string }) {
  const invalidate = useInvalidateAll()
  const [message, setMessage] = useState('')
  const [startsAt, setStartsAt] = useState<Date | null>(null)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const oneToOne = offer.format === 'one_to_one'
  const full = offer.format === 'class' && (offer.seats_left ?? 0) <= 0

  const mySlots = useQuery({ queryKey: ['availability', userId], queryFn: () => fetchAvailability(userId), enabled: oneToOne })
  const theirSlots = useQuery({
    queryKey: ['availability', offer.teacher_id],
    queryFn: () => fetchAvailability(offer.teacher_id),
    enabled: oneToOne,
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setTimeError(null)
    if (oneToOne && !startsAt) {
      setTimeError('Choose when the first session should start.')
      return
    }
    if (oneToOne && startsAt && startsAt <= new Date()) {
      setTimeError('Choose a time in the future.')
      return
    }
    setBusy(true)
    try {
      await createBooking({
        offer_id: offer.id,
        learner_id: userId,
        initiated_by: 'learner',
        proposed_starts_at: oneToOne ? startsAt!.toISOString() : null,
        message: message.trim(),
      })
      await invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">{oneToOne ? 'Request a session' : 'Join this class'}</h2>
      {oneToOne &&
        (mySlots.isPending || theirSlots.isPending ? (
          <p className="text-sm text-muted">Loading availability…</p>
        ) : (
          <ProposeTimeField
            durationMin={offer.session_duration_min}
            mySlots={(mySlots.data ?? []).map(slotFromRow)}
            theirSlots={(theirSlots.data ?? []).map(slotFromRow)}
            theirName={offer.teacher_first_name}
            value={startsAt}
            onChange={setStartsAt}
            error={timeError}
          />
        ))}
      <TextareaField
        label={`Message to ${offer.teacher_first_name}`}
        optional
        maxLength={1000}
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Say hello and what you hope to learn"
      />
      <FormError error={error} />
      <Button type="submit" busy={busy} disabled={full}>
        {full ? 'Class full' : oneToOne ? 'Send request' : 'Request to join'}
      </Button>
      {full && <p className="text-sm text-muted">No seats are left in this class.</p>}
    </form>
  )
}

/** OFFER-4 plus BOOK-3 for the owner. */
function ManagePanel({ offer, userId }: { offer: OfferCard; userId: string }) {
  const invalidate = useInvalidateAll()
  const bookings = useQuery({ queryKey: ['offer-bookings', offer.id], queryFn: () => fetchBookingsForOffer(offer.id) })
  const [description, setDescription] = useState(offer.description)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(null)
    try {
      await updateOffer(offer.id, { description: description.trim() })
      await invalidate()
      setSaved('Description saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  const archive = async () => {
    setArchiving(true)
    setError(null)
    try {
      await updateOffer(offer.id, { status: 'archived' })
      await invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setArchiving(false)
    }
  }

  return (
    <>
      <Section title="Manage your offer">
        <Card className="flex flex-col gap-4">
          {offer.status === 'active' ? (
            <form onSubmit={save} noValidate className="flex flex-col gap-3">
              <TextareaField
                label="Description"
                maxLength={2000}
                rows={5}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setSaved(null)
                }}
              />
              <FormSuccess message={saved} />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" busy={saving} disabled={description.trim() === offer.description}>
                  Save description
                </Button>
                <ConfirmButton label="Archive offer" confirmLabel="Yes, archive it" busy={archiving} onConfirm={archive} />
              </div>
              <p className="text-sm text-muted">
                Archived offers disappear from search and matching but stay in everyone’s history.
              </p>
            </form>
          ) : (
            <p>This offer is archived. It no longer appears in search or matching.</p>
          )}
          <FormError error={error} />
        </Card>
      </Section>
      <QueryView query={bookings} label="Loading requests">
        {(list) => {
          const requests = list.filter((b) => b.status === 'pending')
          const learners = list.filter((b) => b.status === 'accepted')
          return (
            <>
              <Section title={`Requests (${requests.length})`}>
                {requests.length === 0 ? (
                  <EmptyState title="No open requests">
                    New requests appear here and in the bell at the top. You can also invite people from their profile.
                  </EmptyState>
                ) : (
                  <ul className="grid gap-3 md:grid-cols-2">
                    {requests.map((b) => (
                      <li key={b.id}>
                        <BookingItem booking={b} userId={userId} showOffer={false} />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title={`Learners (${learners.length})`}>
                {learners.length === 0 ? (
                  <EmptyState title="No learners yet">Accepted learners will be listed here.</EmptyState>
                ) : (
                  <ul className="grid gap-3 md:grid-cols-2">
                    {learners.map((b) => (
                      <li key={b.id}>
                        <BookingItem booking={b} userId={userId} showOffer={false} />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )
        }}
      </QueryView>
    </>
  )
}

/** The action available to the viewer (OFFER-5). */
function ViewerAction({ offer }: { offer: OfferCard }) {
  const { userId, initialising } = useAuth()
  const location = useLocation()
  const bookings = useQuery({
    queryKey: ['offer-bookings', offer.id, userId],
    queryFn: () => fetchBookingsForOffer(offer.id),
    enabled: Boolean(userId) && offer.teacher_id !== userId,
  })

  if (initialising) return null
  if (!userId)
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Log in to request {offer.format === 'class' ? 'a seat' : 'a session'}.</p>
        <LinkButton to="/login" state={{ from: location.pathname }}>
          Log in to request
        </LinkButton>
        <LinkButton to="/register" variant="secondary" state={{ from: location.pathname }}>
          Create an account
        </LinkButton>
      </div>
    )
  if (offer.teacher_id === userId)
    return (
      <div className="flex flex-col gap-2">
        <p className="font-semibold">This is your offer.</p>
        <a href="#manage" className="font-semibold text-primary-ink underline underline-offset-2">
          Manage it below
        </a>
      </div>
    )
  if (bookings.isPending) return <p className="text-sm text-muted">Checking your bookings…</p>
  const mine = (bookings.data ?? []).filter((b) => b.learner_id === userId)
  const open = mine.find((b) => b.status === 'pending' || b.status === 'accepted')
  if (open)
    return (
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 font-semibold">
          Your booking <StatusPill status={open.status} />
        </p>
        {open.status === 'pending' && open.initiated_by === 'learner' && (
          <p className="text-sm text-muted">Waiting for {offer.teacher_first_name} to respond.</p>
        )}
        <BookingItem booking={open} userId={userId} showOffer={false} />
        {open.status === 'accepted' && <TextLink to="/account/sessions">See all my sessions</TextLink>}
      </div>
    )
  if (offer.status === 'archived') return <p className="text-sm">This offer is archived and no longer takes requests.</p>
  return <RequestForm offer={offer} userId={userId} />
}

/** OFFER-4, OFFER-5, BOOK-1 to BOOK-3 */
export function OfferPage() {
  const { id = '' } = useParams()
  const { userId } = useAuth()
  const offer = useQuery({ queryKey: ['offer', id], queryFn: () => fetchOffer(id) })
  const sessions = useQuery({ queryKey: ['offer-sessions', id, userId], queryFn: () => fetchOfferSessions(id) })

  return (
    <QueryView query={offer} label="Loading offer">
      {(o) =>
        !o ? (
          <EmptyState title="Offer not found" action={<LinkButton to="/skills">Search skills</LinkButton>}>
            The link may be wrong.
          </EmptyState>
        ) : (
          <>
            <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
              <TextLink to="/skills">Skills</TextLink> / <TextLink to={`/skills/${o.skill_id}`}>{o.skill_name}</TextLink>
            </nav>
            <PageTitle
              subtitle={
                <span className="flex flex-wrap items-center gap-2">
                  {o.skill_name} · {o.category_name}
                  {o.status === 'archived' && <Pill tone="red">Archived</Pill>}
                </span>
              }
            >
              {o.title}
            </PageTitle>

            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
              <div className="flex min-w-0 flex-col gap-6">
                <Card>
                  <h2 className="sr-only">About this offer</h2>
                  <p className="whitespace-pre-line text-ink">{o.description || 'No description yet.'}</p>
                  <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">Format</dt>
                      <dd className="font-semibold">{o.format === 'class' ? `Class, up to ${o.max_participants} people` : '1:1, just the two of you'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Level</dt>
                      <dd className="font-semibold">{LEVEL_LABEL[o.level]}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Where</dt>
                      <dd className="font-semibold">{o.mode === 'online' ? MODE_LABEL.online : `In person in ${o.locality_name}`}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Sessions</dt>
                      <dd className="font-semibold">
                        {plural(o.session_count, 'session')} of {formatDuration(o.session_duration_min)}
                      </dd>
                    </div>
                    {o.format === 'class' && (
                      <div>
                        <dt className="text-muted">Seats left</dt>
                        <dd className="font-semibold">
                          {o.seats_left} of {o.max_participants}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted">Offered since</dt>
                      <dd className="font-semibold">{formatDate(o.created_at)}</dd>
                    </div>
                  </dl>
                </Card>

                <section aria-labelledby="sessions-title">
                  <h2 id="sessions-title" className="mb-3 text-xl font-bold">
                    Session dates
                  </h2>
                  <QueryView query={sessions} label="Loading sessions">
                    {(list) => {
                      const shown = o.format === 'class' ? list.filter((s) => s.booking_id === null) : list
                      if (shown.length === 0)
                        return (
                          <EmptyState title={o.format === 'class' ? 'No sessions scheduled' : 'Scheduled together'}>
                            {o.format === 'class'
                              ? 'The teacher has not scheduled any sessions.'
                              : 'You propose the first session when you request. Later sessions are agreed with the teacher.'}
                          </EmptyState>
                        )
                      return (
                        <ol className="flex flex-col gap-2">
                          {shown.map((s) => (
                            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3">
                              <span>
                                <span className="font-semibold">Session {s.sequence_no}</span> · {formatRange(s.starts_at, s.ends_at)}
                              </span>
                              {s.status !== 'scheduled' && <Pill>{s.status}</Pill>}
                              {s.status === 'scheduled' && new Date(s.ends_at) < new Date() && <Pill>past</Pill>}
                            </li>
                          ))}
                        </ol>
                      )
                    }}
                  </QueryView>
                </section>
              </div>

              <aside aria-label="Teacher and booking" className="flex flex-col gap-4">
                <Card>
                  <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Teacher</h2>
                  <div className="flex items-center gap-3">
                    <Avatar first={o.teacher_first_name} last={o.teacher_last_name} size="lg" />
                    <div>
                      <TextLink to={`/users/${o.teacher_username}`} className="text-lg font-bold">
                        {fullName({ first_name: o.teacher_first_name, last_name: o.teacher_last_name })}
                      </TextLink>
                      <p className="text-sm text-muted">{o.teacher_locality_name}</p>
                      <Points total={o.points_total} count={o.rating_count} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Pill tone="brand">{FORMAT_LABEL[o.format]}</Pill>
                    <Pill>{LEVEL_LABEL[o.level]}</Pill>
                    <Pill>{MODE_LABEL[o.mode]}</Pill>
                  </div>
                </Card>
                <Card>
                  <ViewerAction offer={o} />
                </Card>
              </aside>
            </div>

            {userId === o.teacher_id && (
              <div id="manage" className="mt-10">
                <ManagePanel offer={o} userId={userId} />
              </div>
            )}
          </>
        )
      }
    </QueryView>
  )
}

