import { useQuery } from '@tanstack/react-query'
import { useId, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { FactorTable } from '../components/FactorTable'
import { Avatar } from '../components/TeacherList'
import { Card, EmptyState, LinkButton, PageTitle, Pill, Points, QueryView, RadioGroup, TextLink } from '../components/ui'
import { fetchMatchData, fetchSkill, type MatchCandidate } from '../lib/api'
import { FORMAT_LABEL, fullName, LEVEL_LABEL, MODE_LABEL, plural } from '../lib/domain'
import { MATCH_WEIGHTS, rankOffers, type MatchFilters, type MatchResult } from '../lib/match'
import { useLocalities } from '../lib/queries'
import { formatDateTime } from '../lib/time'

type FormatFilter = 'any' | 'one_to_one' | 'class'
type ModeFilter = 'any' | 'in_person' | 'online'

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 75 ? 'bg-primary text-white' : score >= 50 ? 'bg-primary-soft text-primary-ink' : 'bg-surface-2 text-ink'
  return (
    <div className={`flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl ${tone}`}>
      <span className="text-2xl leading-none font-bold">{score}</span>
      <span className="text-[0.7rem] leading-tight">of 100</span>
    </div>
  )
}

function MatchCard({ result, rank }: { result: MatchResult<MatchCandidate>; rank: number }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const titleId = useId()
  const o = result.offer.card
  const teacher = fullName({ first_name: o.teacher_first_name, last_name: o.teacher_last_name })

  return (
    <Card as="article" className="flex flex-col gap-4">
      <div className="flex gap-4">
        <ScoreBadge score={result.score} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Match {rank} · <span className="sr-only">score </span>
            {result.score} out of 100
          </p>
          <h2 id={titleId} className="text-lg font-bold text-ink">
            <TextLink to={`/offers/${o.id}`}>{o.title}</TextLink>
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-2">
              <Avatar first={o.teacher_first_name} last={o.teacher_last_name} />
              <TextLink to={`/users/${o.teacher_username}`}>{teacher}</TextLink>
            </span>
            <Points total={o.points_total} count={o.rating_count} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Pill tone="brand">{FORMAT_LABEL[o.format]}</Pill>
            <Pill>{LEVEL_LABEL[o.level]}</Pill>
            <Pill>{o.mode === 'online' ? 'Online' : `In person · ${o.locality_name}`}</Pill>
            {o.format === 'class' && o.seats_left !== null && <Pill tone="amber">{plural(o.seats_left, 'seat')} left</Pill>}
          </div>
        </div>
      </div>

      {/* MATCH-5: the three strongest reasons */}
      {result.topReasons.length > 0 && (
        <ul aria-label="Top reasons" className="flex flex-col gap-1.5">
          {result.topReasons.map((f) => (
            <li key={f.key} className="flex items-start gap-2 text-sm">
              <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-ink">
                ✓
              </span>
              <span>
                <span className="font-semibold">{f.reason}</span>
                <span className="text-muted"> · +{f.contribution}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {result.nextSessionAt && <p className="text-sm text-muted">Next session: {formatDateTime(result.nextSessionAt)}</p>}

      <div className="flex flex-wrap gap-2">
        <LinkButton to={`/offers/${o.id}`}>{o.format === 'class' ? 'View class and join' : 'View offer and request'}</LinkButton>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-primary-ink underline underline-offset-2 hover:bg-primary-soft"
        >
          Why this match?
          <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
      </div>

      {/* MATCH-6: all five factors with weight, value and reason */}
      <div id={panelId} hidden={!open} className="rounded-xl border border-line bg-surface-2 p-3">
        <FactorTable factors={result.factors} score={result.score} />
      </div>
    </Card>
  )
}

/** MATCH-1 to MATCH-6 */
export function MatchPage() {
  const { skillId = '' } = useParams()
  const { profile } = useAuth()
  const localities = useLocalities()
  const [params, setParams] = useSearchParams()
  const format = (params.get('format') as FormatFilter | null) ?? 'any'
  const mode = (params.get('mode') as ModeFilter | null) ?? 'any'

  const skill = useQuery({ queryKey: ['skill', skillId], queryFn: () => fetchSkill(skillId) })
  const localityName = localities.data?.find((l) => l.id === profile?.locality_id)?.name ?? ''
  const data = useQuery({
    queryKey: ['match', skillId, profile?.id, localityName],
    queryFn: () => fetchMatchData(skillId, profile!, localityName),
    enabled: Boolean(profile && localities.data),
  })

  const filters: MatchFilters = {
    format: format === 'any' ? null : format,
    mode: mode === 'any' ? null : mode,
  }
  const ranked = useMemo(
    () => (data.data ? rankOffers(data.data.learner, data.data.candidates, data.data.openBookingOfferIds, new Date(), filters) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.data, format, mode],
  )

  const setFilter = (key: 'format' | 'mode', value: string) => {
    const next = new URLSearchParams(params)
    if (value === 'any') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const skillName = skill.data?.name ?? 'this skill'

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
        <TextLink to="/skills">Skills</TextLink> / <TextLink to={`/skills/${skillId}`}>{skillName}</TextLink>
      </nav>
      <PageTitle subtitle="Ranked for you by availability, level, location, reputation and skill swaps.">
        {skill.data ? `Best matches for ${skill.data.name}` : 'Best matches'}
      </PageTitle>

      {skill.isSuccess && !skill.data ? (
        <EmptyState title="Skill not found" action={<LinkButton to="/skills">Search skills</LinkButton>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <aside aria-label="Filters and your details" className="flex flex-col gap-5">
            <Card className="flex flex-col gap-4">
              <RadioGroup<FormatFilter>
                legend="Format"
                name="format"
                value={format}
                onChange={(v) => setFilter('format', v)}
                options={[
                  { value: 'any', label: 'Any' },
                  { value: 'one_to_one', label: '1:1' },
                  { value: 'class', label: 'Class' },
                ]}
              />
              <RadioGroup<ModeFilter>
                legend="Mode"
                name="mode"
                value={mode}
                onChange={(v) => setFilter('mode', v)}
                options={[
                  { value: 'any', label: 'Any' },
                  { value: 'in_person', label: MODE_LABEL.in_person },
                  { value: 'online', label: MODE_LABEL.online },
                ]}
              />
            </Card>
            {data.data && (
              <Card className="text-sm">
                <h2 className="mb-2 font-bold">Matching uses</h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt className="text-muted">Your level</dt>
                  <dd>{data.data.learner.level ? LEVEL_LABEL[data.data.learner.level] : 'Not set (beginner)'}</dd>
                  <dt className="text-muted">Your area</dt>
                  <dd>{data.data.learner.localityName}</dd>
                  <dt className="text-muted">Availability</dt>
                  <dd>{plural(data.data.learner.availability.length, 'weekly slot')}</dd>
                  <dt className="text-muted">You teach</dt>
                  <dd>{data.data.learner.teachSkills.map((s) => s.name).join(', ') || 'Nothing yet'}</dd>
                </dl>
                <p className="mt-3">
                  <TextLink to="/account">Update your level, skills and availability</TextLink>
                </p>
                <details className="mt-3">
                  <summary className="min-h-11 cursor-pointer content-center font-semibold">How the score works</summary>
                  <ul className="mt-1 list-disc pl-5 text-muted">
                    <li>Availability × {MATCH_WEIGHTS.availability}</li>
                    <li>Level × {MATCH_WEIGHTS.level}</li>
                    <li>Location × {MATCH_WEIGHTS.location}</li>
                    <li>Reputation × {MATCH_WEIGHTS.reputation}</li>
                    <li>Mutual swap × {MATCH_WEIGHTS.swap}</li>
                  </ul>
                  <p className="mt-1 text-muted">Ties go to more points, then the earliest session, then the oldest offer.</p>
                </details>
              </Card>
            )}
          </aside>

          <div>
            {data.data && data.data.learner.availability.length === 0 && (
              <p role="note" className="mb-4 rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-sm text-warn-ink">
                You have not set your weekly availability, so no offer gets availability points.{' '}
                <TextLink to="/account#availability">Add your availability</TextLink>
              </p>
            )}
            <QueryView query={data} label="Finding your best matches">
              {() =>
                ranked.length === 0 ? (
                  <EmptyState
                    title={`No matching offers for ${skillName}`}
                    action={
                      format !== 'any' || mode !== 'any' ? (
                        <LinkButton to={`/match/${skillId}`} variant="secondary">
                          Clear filters
                        </LinkButton>
                      ) : (
                        <LinkButton to={`/offers/new?skill=${skillId}`}>Teach {skillName} yourself</LinkButton>
                      )
                    }
                  >
                    Offers you already booked, your own offers and full classes are not shown.
                  </EmptyState>
                ) : (
                  <>
                    <p role="status" className="mb-3 text-sm text-muted">
                      {plural(ranked.length, 'offer')} ranked for you
                    </p>
                    <ol className="flex flex-col gap-4">
                      {ranked.map((r, i) => (
                        <li key={r.offer.id}>
                          <MatchCard result={r} rank={i + 1} />
                        </li>
                      ))}
                    </ol>
                  </>
                )
              }
            </QueryView>
          </div>
        </div>
      )}
    </>
  )
}
