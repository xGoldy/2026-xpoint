import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { EmptyState, INTERACTIVE_CARD, LinkButton, PageTitle, Pill, Points, QueryView, Section, TextLink } from '../components/ui'
import { fetchOffersForSkill, fetchSkill, fetchSkillAgenda, type AgendaEntry } from '../lib/api'
import { FORMAT_LABEL, fullName, LEVEL_LABEL, MODE_LABEL, plural } from '../lib/domain'
import { formatDayHeading, formatTime, localDateKey } from '../lib/time'

function groupByDay(entries: AgendaEntry[]) {
  const days = new Map<string, AgendaEntry[]>()
  for (const e of entries) {
    const key = localDateKey(e.starts_at)
    days.set(key, [...(days.get(key) ?? []), e])
  }
  return [...days.entries()]
}

/** SKILL-5 to SKILL-7 */
export function SkillPage() {
  const { id = '' } = useParams()
  const skill = useQuery({ queryKey: ['skill', id], queryFn: () => fetchSkill(id) })
  const offers = useQuery({ queryKey: ['skill-offers', id], queryFn: () => fetchOffersForSkill(id) })
  const agenda = useQuery({ queryKey: ['skill-agenda', id], queryFn: () => fetchSkillAgenda(id) })

  return (
    <QueryView query={skill} label="Loading skill">
      {(s) =>
        !s ? (
          <EmptyState title="Skill not found" action={<LinkButton to="/skills">Search skills</LinkButton>}>
            It may have been removed, or the link is wrong.
          </EmptyState>
        ) : (
          <>
            <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
              <TextLink to="/skills">Skills</TextLink> /{' '}
              <TextLink to={`/skills?category=${s.category_id}`}>{s.category_name}</TextLink>
            </nav>
            <PageTitle
              subtitle={`${plural(s.active_offer_count, 'active offer')} from ${plural(s.teacher_count, 'teacher')}`}
              actions={
                <>
                  <LinkButton to={`/match/${s.id}`}>Find my best match</LinkButton>
                  <LinkButton to={`/offers/new?skill=${s.id}`} variant="secondary">
                    Teach {s.name}
                  </LinkButton>
                </>
              }
            >
              {s.name}
            </PageTitle>

            <Section title="Teachers">
              <QueryView query={offers} label="Loading teachers">
                {(list) =>
                  list.length === 0 ? (
                    <EmptyState
                      title={`Nobody teaches ${s.name} yet`}
                      action={<LinkButton to={`/offers/new?skill=${s.id}`}>Teach {s.name}</LinkButton>}
                    >
                      Know it well? Your neighbours would love to learn from you.
                    </EmptyState>
                  ) : (
                    <table className="stack w-full border-separate border-spacing-0 overflow-hidden rounded-2xl text-left text-sm md:border md:border-line md:bg-surface">
                      <caption className="sr-only">Teachers with an active {s.name} offer</caption>
                      <thead className="bg-surface-2 text-xs tracking-wide text-muted uppercase">
                        <tr>
                          <th scope="col" className="px-4 py-3">Teacher</th>
                          <th scope="col" className="px-4 py-3">Locality</th>
                          <th scope="col" className="px-4 py-3">Points</th>
                          <th scope="col" className="px-4 py-3">Offer</th>
                          <th scope="col" className="px-4 py-3">Format and level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((o) => (
                          <tr key={o.id}>
                            <td data-label="Teacher" className="border-t border-line px-4 py-3 font-semibold">
                              <TextLink to={`/users/${o.teacher_username}`}>
                                {fullName({ first_name: o.teacher_first_name, last_name: o.teacher_last_name })}
                              </TextLink>
                            </td>
                            <td data-label="Locality" className="border-t border-line px-4 py-3">
                              {o.teacher_locality_name}
                            </td>
                            <td data-label="Points" className="border-t border-line px-4 py-3">
                              <Points total={o.points_total} count={o.rating_count} />
                            </td>
                            <td data-label="Offer" className="border-t border-line px-4 py-3">
                              <Link to={`/offers/${o.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary-ink underline underline-offset-2">
                                {o.title}
                              </Link>
                            </td>
                            <td data-label="Format and level" className="border-t border-line px-4 py-3">
                              <span className="flex flex-wrap gap-1">
                                <Pill tone="brand">{FORMAT_LABEL[o.format]}</Pill>
                                <Pill>{LEVEL_LABEL[o.level]}</Pill>
                                <Pill>{MODE_LABEL[o.mode]}</Pill>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </QueryView>
            </Section>

            <Section title="Upcoming classes">
              <QueryView query={agenda} label="Loading the class agenda">
                {(entries) =>
                  entries.length === 0 ? (
                    <EmptyState title={`No ${s.name} classes are scheduled`} action={<LinkButton to={`/match/${s.id}`} variant="secondary">See 1:1 teachers that match you</LinkButton>}>
                      1:1 sessions are scheduled with the teacher when you book.
                    </EmptyState>
                  ) : (
                    <ol className="flex flex-col gap-4">
                      {groupByDay(entries).map(([day, list]) => (
                        <li key={day}>
                          <h3 className="mb-2 font-bold text-ink">{formatDayHeading(list[0].starts_at)}</h3>
                          <ul className="flex flex-col gap-2">
                            {list.map((e) => (
                              <li key={e.id}>
                                <Link
                                  to={`/offers/${e.offer.id}`}
                                  className={`${INTERACTIVE_CARD} flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3`}
                                >
                                  <span className="w-28 font-mono font-semibold text-primary-ink">
                                    {formatTime(e.starts_at)}–{formatTime(e.ends_at)}
                                  </span>
                                  <span className="font-semibold">{e.offer.title}</span>
                                  <span className="text-sm text-muted">
                                    with {fullName(e.offer.teacher)} · session {e.sequence_no} of {e.offer.session_count}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ol>
                  )
                }
              </QueryView>
            </Section>
          </>
        )
      }
    </QueryView>
  )
}
