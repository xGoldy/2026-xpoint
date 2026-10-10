import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { AccountNav } from '../components/AccountNav'
import { BookingItem, canComplete, isResponder, isTeacher, RateForm, StatusPill } from '../components/BookingItem'
import { cx, EmptyState, LinkButton, PageTitle, QueryView, Section, TextLink } from '../components/ui'
import { fetchMyBookings, type BookingCard } from '../lib/api'
import { fullName } from '../lib/domain'
import { formatDate } from '../lib/time'

type Tab = 'upcoming' | 'requests' | 'history'
type HistoryView = 'taught' | 'learned'

function TabLink({ to, current, children, count }: { to: string; current: boolean; children: string; count?: number }) {
  return (
    <Link
      to={to}
      replace
      aria-current={current ? 'page' : undefined}
      className={cx(
        'inline-flex min-h-11 items-center gap-2 border-b-4 px-4 text-sm font-semibold no-underline',
        current ? 'border-primary text-primary-ink' : 'border-transparent text-muted hover:text-ink',
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-danger px-2 text-xs text-white">
          {count}
          <span className="sr-only"> awaiting you</span>
        </span>
      )}
    </Link>
  )
}

function dates(b: BookingCard): string {
  if (b.first_session_at && b.last_session_end_at) {
    const a = formatDate(b.first_session_at)
    const z = formatDate(b.last_session_end_at)
    return a === z ? a : `${a} – ${z}`
  }
  return b.proposed_starts_at ? formatDate(b.proposed_starts_at) : `Requested ${formatDate(b.created_at)}`
}

/** ACC-5 history: skill, other party, dates, status and points given. */
function HistoryTable({ rows, userId, view }: { rows: BookingCard[]; userId: string; view: HistoryView }) {
  return (
    <table className="stack w-full border-separate border-spacing-0 overflow-hidden rounded-2xl text-left text-sm md:border md:shadow-card md:border-line md:bg-surface">
      <caption className="sr-only">{view === 'taught' ? 'Sessions you taught' : 'Sessions you attended'}</caption>
      <thead className="bg-surface-2 text-xs tracking-wide text-muted uppercase">
        <tr>
          <th scope="col" className="px-4 py-3">Skill</th>
          <th scope="col" className="px-4 py-3">{view === 'taught' ? 'Learner' : 'Teacher'}</th>
          <th scope="col" className="px-4 py-3">Dates</th>
          <th scope="col" className="px-4 py-3">Status</th>
          <th scope="col" className="px-4 py-3">Points given</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => {
          const other =
            view === 'taught'
              ? { name: fullName({ first_name: b.learner_first_name, last_name: b.learner_last_name }), username: b.learner_username }
              : { name: fullName({ first_name: b.teacher_first_name, last_name: b.teacher_last_name }), username: b.teacher_username }
          const canRate = view === 'learned' && b.status === 'completed' && b.rating_id === null
          return (
            <tr key={b.id}>
              <td data-label="Skill" className="border-t border-line px-4 py-3 align-top">
                <TextLink to={`/offers/${b.offer_id}`} className="font-semibold">
                  {b.skill_name}
                </TextLink>
                <span className="block text-muted">{b.offer_title}</span>
              </td>
              <td data-label={view === 'taught' ? 'Learner' : 'Teacher'} className="border-t border-line px-4 py-3 align-top">
                <TextLink to={`/users/${other.username}`}>{other.name}</TextLink>
              </td>
              <td data-label="Dates" className="border-t border-line px-4 py-3 align-top">
                {dates(b)}
              </td>
              <td data-label="Status" className="border-t border-line px-4 py-3 align-top">
                <StatusPill status={b.status} />
              </td>
              <td data-label="Points given" className="border-t border-line px-4 py-3 align-top">
                {b.rating_points !== null ? (
                  <span>
                    <span aria-hidden="true" className="text-star">★ </span>
                    {b.rating_points}
                    {b.rating_comment && <span className="block text-muted">“{b.rating_comment}”</span>}
                  </span>
                ) : canRate ? (
                  <RateForm booking={b} learnerId={userId} />
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** ACC-5, BOOK-3, BOOK-5 to BOOK-8, RATE-1 */
export function MySessionsPage() {
  const { userId } = useAuth()
  const [params] = useSearchParams()
  const tab = (['upcoming', 'requests', 'history'].includes(params.get('tab') ?? '') ? params.get('tab') : 'upcoming') as Tab
  const view = (params.get('view') === 'taught' ? 'taught' : 'learned') as HistoryView
  const bookings = useQuery({ queryKey: ['my-bookings', userId], queryFn: () => fetchMyBookings(userId!) })

  const all = bookings.data ?? []
  const awaitingMe = all.filter((b) => isResponder(b, userId!))
  const toRate = all.filter((b) => b.status === 'completed' && !isTeacher(b, userId!) && b.rating_id === null)

  return (
    <>
      <PageTitle>My sessions</PageTitle>
      <AccountNav />
      <nav aria-label="Session lists" className="mb-6 border-b border-line">
        <TabLink to="?tab=upcoming" current={tab === 'upcoming'}>
          Upcoming
        </TabLink>
        <TabLink to="?tab=requests" current={tab === 'requests'} count={awaitingMe.length}>
          Requests
        </TabLink>
        <TabLink to="?tab=history" current={tab === 'history'} count={toRate.length}>
          History
        </TabLink>
      </nav>

      <QueryView query={bookings} label="Loading your sessions">
        {(list) => {
          if (tab === 'upcoming') {
            const accepted = list
              .filter((b) => b.status === 'accepted')
              .sort((a, b) => (a.next_session_at ?? '9999').localeCompare(b.next_session_at ?? '9999'))
            const needsCompleting = accepted.filter((b) => canComplete(b, userId!))
            return accepted.length === 0 ? (
              <EmptyState title="Nothing booked yet" action={<LinkButton to="/skills">Find something to learn</LinkButton>}>
                Accepted bookings, as a teacher or a learner, appear here.
              </EmptyState>
            ) : (
              <>
                {needsCompleting.length > 0 && (
                  <p role="note" className="mb-4 rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-sm text-warn-ink">
                    {needsCompleting.length === 1 ? 'One booking you teach has' : `${needsCompleting.length} bookings you teach have`} finished.
                    Mark {needsCompleting.length === 1 ? 'it' : 'them'} completed so your learners can give points.
                  </p>
                )}
                <ul className="grid gap-4 md:grid-cols-2">
                  {accepted.map((b) => (
                    <li key={b.id}>
                      <BookingItem booking={b} userId={userId!} />
                    </li>
                  ))}
                </ul>
              </>
            )
          }
          if (tab === 'requests') {
            const pending = list.filter((b) => b.status === 'pending')
            const mine = pending.filter((b) => !isResponder(b, userId!))
            return (
              <>
                <Section title="Waiting for your answer">
                  {awaitingMe.length === 0 ? (
                    <EmptyState title="You are all caught up">Requests and invitations you need to answer appear here.</EmptyState>
                  ) : (
                    <ul className="grid gap-4 md:grid-cols-2">
                      {awaitingMe.map((b) => (
                        <li key={b.id}>
                          <BookingItem booking={b} userId={userId!} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
                <Section title="Sent by you">
                  {mine.length === 0 ? (
                    <EmptyState title="No open requests" action={<LinkButton to="/skills" variant="secondary">Find a teacher</LinkButton>}>
                      Requests you send and invitations you make wait here for an answer.
                    </EmptyState>
                  ) : (
                    <ul className="grid gap-4 md:grid-cols-2">
                      {mine.map((b) => (
                        <li key={b.id}>
                          <BookingItem booking={b} userId={userId!} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </>
            )
          }
          const past = list.filter((b) => ['completed', 'declined', 'cancelled'].includes(b.status))
          const rows = past.filter((b) => (view === 'taught' ? isTeacher(b, userId!) : !isTeacher(b, userId!)))
          return (
            <>
              <nav aria-label="History" className="mb-4 flex gap-2">
                {(['learned', 'taught'] as const).map((v) => (
                  <Link
                    key={v}
                    to={`?tab=history&view=${v}`}
                    replace
                    aria-current={view === v ? 'page' : undefined}
                    className={cx(
                      'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold no-underline',
                      view === v ? 'border-primary bg-primary text-white' : 'border-line-strong/60 bg-surface text-ink',
                    )}
                  >
                    {v === 'learned' ? 'Learned' : 'Taught'}
                  </Link>
                ))}
              </nav>
              {rows.length === 0 ? (
                <EmptyState
                  title={view === 'learned' ? 'No past sessions as a learner' : 'No past sessions as a teacher'}
                  action={
                    view === 'learned' ? <LinkButton to="/skills">Find a skill to learn</LinkButton> : <LinkButton to="/offers/new">Teach a skill</LinkButton>
                  }
                >
                  Completed, declined and cancelled bookings are kept here.
                </EmptyState>
              ) : (
                <HistoryTable rows={rows} userId={userId!} view={view} />
              )}
            </>
          )
        }}
      </QueryView>
    </>
  )
}
