import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
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
  SelectField,
  TextareaField,
  TextLink,
} from '../components/ui'
import {
  createBooking,
  fetchAvailability,
  fetchOffersByTeacher,
  fetchOpenBookingsBetween,
  fetchProfileByUsername,
  fetchRatingsForTeacher,
  fetchTeacherStats,
  fetchUserSkills,
  type Profile,
} from '../lib/api'
import { slotFromRow } from '../lib/availability'
import { FORMAT_LABEL, fullName, LEVEL_LABEL, MODE_LABEL } from '../lib/domain'
import { errorMessage } from '../lib/errors'
import { useInvalidateAll } from '../lib/queries'
import { formatDate } from '../lib/time'

/** BOOK-4: a teacher invites this user to one of their offers. */
function InviteForm({ teacherId, invitee }: { teacherId: string; invitee: Profile }) {
  const invalidate = useInvalidateAll()
  const myOffers = useQuery({ queryKey: ['my-offers', teacherId, 'active'], queryFn: () => fetchOffersByTeacher(teacherId, true) })
  const open = useQuery({
    queryKey: ['open-bookings', teacherId, invitee.id],
    queryFn: () => fetchOpenBookingsBetween(teacherId, invitee.id),
  })
  const mySlots = useQuery({ queryKey: ['availability', teacherId], queryFn: () => fetchAvailability(teacherId) })
  const theirSlots = useQuery({ queryKey: ['availability', invitee.id], queryFn: () => fetchAvailability(invitee.id) })
  const [offerId, setOfferId] = useState('')
  const [startsAt, setStartsAt] = useState<Date | null>(null)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<{ offer?: string; time?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (myOffers.isPending || open.isPending) return <p className="text-sm text-muted">Loading your offers…</p>
  const blocked = new Set((open.data ?? []).map((b) => b.offer_id))
  const available = (myOffers.data ?? []).filter((o) => !blocked.has(o.id) && !(o.format === 'class' && (o.seats_left ?? 0) <= 0))
  if ((myOffers.data ?? []).length === 0)
    return (
      <EmptyState title="You have no active offers" action={<LinkButton to="/offers/new">Teach a skill</LinkButton>}>
        Create an offer, then you can invite {invitee.first_name} to it.
      </EmptyState>
    )
  const selected = available.find((o) => o.id === offerId)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSent(null)
    const found: typeof errors = {}
    if (!selected) found.offer = 'Choose one of your offers.'
    if (selected?.format === 'one_to_one' && (!startsAt || startsAt <= new Date())) found.time = 'Choose a future start time.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await createBooking({
        offer_id: selected!.id,
        learner_id: invitee.id,
        initiated_by: 'teacher',
        proposed_starts_at: selected!.format === 'one_to_one' ? startsAt!.toISOString() : null,
        message: message.trim(),
      })
      await invalidate()
      setSent(`Invitation sent. ${invitee.first_name} can accept or decline it.`)
      setOfferId('')
      setStartsAt(null)
      setMessage('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {available.length === 0 ? (
        <p className="text-sm text-muted">{invitee.first_name} already has an open booking for each of your offers.</p>
      ) : (
        <>
          <SelectField label="Offer" value={offerId} onChange={(e) => setOfferId(e.target.value)} error={errors.offer}>
            <option value="">Choose one of your offers</option>
            {available.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title} ({FORMAT_LABEL[o.format]})
              </option>
            ))}
          </SelectField>
          {selected?.format === 'one_to_one' && (
            <ProposeTimeField
              durationMin={selected.session_duration_min}
              mySlots={(mySlots.data ?? []).map(slotFromRow)}
              theirSlots={(theirSlots.data ?? []).map(slotFromRow)}
              theirName={invitee.first_name}
              value={startsAt}
              onChange={setStartsAt}
              error={errors.time}
            />
          )}
          <TextareaField label="Message" optional rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
          <FormError error={error} />
          <div>
            <Button type="submit" busy={busy}>
              Send invitation
            </Button>
          </div>
        </>
      )}
      <FormSuccess message={sent} />
    </form>
  )
}

/** ACC-6 and BOOK-4. Never shows the email address. */
export function UserPage() {
  const { username = '' } = useParams()
  const { userId } = useAuth()
  const profile = useQuery({ queryKey: ['user', username], queryFn: () => fetchProfileByUsername(username) })
  const pid = profile.data?.id
  const skills = useQuery({ queryKey: ['user-skills', pid], queryFn: () => fetchUserSkills(pid!), enabled: Boolean(pid) })
  const offers = useQuery({ queryKey: ['user-offers', pid], queryFn: () => fetchOffersByTeacher(pid!, true), enabled: Boolean(pid) })
  const stats = useQuery({ queryKey: ['teacher-stats', pid], queryFn: () => fetchTeacherStats(pid!), enabled: Boolean(pid) })
  const ratings = useQuery({ queryKey: ['ratings', pid], queryFn: () => fetchRatingsForTeacher(pid!), enabled: Boolean(pid) })

  return (
    <QueryView query={profile} label="Loading profile">
      {(p) =>
        !p ? (
          <EmptyState title="Member not found" action={<LinkButton to="/">Go to the home page</LinkButton>}>
            There is nobody called @{username}.
          </EmptyState>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <Avatar first={p.first_name} last={p.last_name} size="lg" />
              <div className="min-w-0 flex-1">
                <PageTitle subtitle={<>@{p.username} · {p.locality.name} · member since {formatDate(p.created_at)}</>}>
                  {fullName(p)}
                </PageTitle>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
              <div className="min-w-0">
                {p.bio && (
                  <Section title="About">
                    <p className="whitespace-pre-line">{p.bio}</p>
                  </Section>
                )}
                <Section title="Skills">
                  <QueryView query={skills} label="Loading skills">
                    {(list) => {
                      const teach = list.filter((s) => s.role === 'teach')
                      const learn = list.filter((s) => s.role === 'learn')
                      return (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <h3 className="mb-2 font-semibold">Can teach</h3>
                            {teach.length === 0 ? (
                              <p className="text-sm text-muted">Nothing listed yet.</p>
                            ) : (
                              <ul className="flex flex-wrap gap-2">
                                {teach.map((s) => (
                                  <li key={s.id}>
                                    <TextLink to={`/skills/${s.skill_id}`}>{s.skill.name}</TextLink>
                                    {s.level && <span className="text-sm text-muted"> ({LEVEL_LABEL[s.level].toLowerCase()})</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <h3 className="mb-2 font-semibold">Wants to learn</h3>
                            {learn.length === 0 ? (
                              <p className="text-sm text-muted">Nothing listed yet.</p>
                            ) : (
                              <ul className="flex flex-wrap gap-2">
                                {learn.map((s) => (
                                  <li key={s.id}>
                                    <Pill>{s.skill.name}</Pill>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )
                    }}
                  </QueryView>
                </Section>
                <Section title="Active offers">
                  <QueryView query={offers} label="Loading offers">
                    {(list) =>
                      list.length === 0 ? (
                        <EmptyState title={`${p.first_name} has no active offers`}>
                          {userId === p.id ? <TextLink to="/offers/new">Create your first offer</TextLink> : 'Check back later.'}
                        </EmptyState>
                      ) : (
                        <ul className="grid gap-3 sm:grid-cols-2">
                          {list.map((o) => (
                            <li key={o.id}>
                              <Card className="h-full">
                                <p className="text-xs font-semibold tracking-wide text-muted uppercase">{o.skill_name}</p>
                                <TextLink to={`/offers/${o.id}`} className="font-bold">
                                  {o.title}
                                </TextLink>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <Pill tone="brand">{FORMAT_LABEL[o.format]}</Pill>
                                  <Pill>{LEVEL_LABEL[o.level]}</Pill>
                                  <Pill>{MODE_LABEL[o.mode]}</Pill>
                                </div>
                              </Card>
                            </li>
                          ))}
                        </ul>
                      )
                    }
                  </QueryView>
                </Section>
                <Section title="What learners say">
                  <QueryView query={ratings} label="Loading ratings">
                    {(list) =>
                      list.length === 0 ? (
                        <EmptyState title="No ratings yet">Points appear here after completed sessions.</EmptyState>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {list.map((r) => (
                            <li key={r.id}>
                              <Card>
                                <p className="text-sm">
                                  <span aria-hidden="true" className="text-star">★ </span>
                                  <strong>{r.points}</strong> {r.points === 1 ? 'point' : 'points'} from{' '}
                                  <TextLink to={`/users/${r.learner.username}`}>{fullName(r.learner)}</TextLink>
                                  <span className="text-muted"> · {formatDate(r.created_at)}</span>
                                </p>
                                {r.comment && <p className="mt-1 text-ink">“{r.comment}”</p>}
                              </Card>
                            </li>
                          ))}
                        </ul>
                      )
                    }
                  </QueryView>
                </Section>
              </div>
              <aside aria-label="Points and invitations" className="flex flex-col gap-4">
                <Card>
                  <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Points as a teacher</h2>
                  {stats.data ? <Points total={stats.data.points_total} count={stats.data.rating_count} /> : <p className="text-sm text-muted">Loading…</p>}
                </Card>
                {userId && userId !== p.id && (
                  <Card>
                    <h2 className="mb-3 text-lg font-bold">Invite {p.first_name}</h2>
                    <InviteForm teacherId={userId} invitee={p} />
                  </Card>
                )}
                {!userId && (
                  <Card>
                    <p className="text-sm">
                      <TextLink to="/login" state={{ from: `/users/${p.username}` }}>
                        Log in
                      </TextLink>{' '}
                      to invite {p.first_name} to one of your offers.
                    </p>
                  </Card>
                )}
                {userId === p.id && (
                  <LinkButton to="/account" variant="secondary">
                    Edit my profile
                  </LinkButton>
                )}
              </aside>
            </div>
          </>
        )
      }
    </QueryView>
  )
}
