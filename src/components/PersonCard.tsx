import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PeopleCandidate } from '../lib/api'
import type { Recommendation, Relationship } from '../lib/recommend'
import { FactorTable } from './FactorTable'
import { Avatar } from './TeacherList'
import { Card, cx, LinkButton, Points, TextLink } from './ui'

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  swap: 'Skill swap',
  teacher: 'Can teach you',
  learner: 'Wants to learn from you',
}

export function RelationshipBadge({ relationship }: { relationship: Relationship }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        relationship === 'swap' && 'bg-gradient-primary text-white shadow-primary',
        relationship === 'teacher' && 'bg-primary-soft text-primary-ink',
        relationship === 'learner' && 'bg-success-soft text-success-ink',
      )}
    >
      {relationship === 'swap' && <span aria-hidden="true">⇄</span>}
      {RELATIONSHIP_LABEL[relationship]}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 75 ? 'bg-primary text-white' : score >= 50 ? 'bg-primary-soft text-primary-ink' : 'bg-surface-2 text-ink'
  return (
    <div className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl ${tone}`}>
      <span className="text-xl leading-none font-bold">{score}</span>
      <span className="text-[0.65rem] leading-tight">of 100</span>
    </div>
  )
}

/** One suggested person: who they are, which skills connect you, and why. */
export function PersonCard({ rec, compact = false }: { rec: Recommendation<PeopleCandidate>; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const p = rec.person
  const name = `${p.firstName} ${p.lastName}`
  const offer = p.offers.find((o) => rec.theyTeach.some((s) => s.skillId === o.skillId))

  return (
    <Card as="article" className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-3">
        <Avatar first={p.firstName} last={p.lastName} />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-ink">
            <TextLink to={`/users/${p.username}`}>{name}</TextLink>
          </h3>
          <p className="text-sm text-muted">{p.localityName}</p>
          <div className="mt-1">
            <RelationshipBadge relationship={rec.relationship} />
          </div>
        </div>
        <div aria-label={`Match score ${rec.score} out of 100`} role="img">
          <ScoreBadge score={rec.score} />
        </div>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        {rec.theyTeach.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <dt className="text-muted">Can teach you</dt>
            {rec.theyTeach.map((s) => (
              <dd key={s.skillId}>
                <Link
                  to={`/skills/${s.skillId}`}
                  className="inline-flex min-h-8 items-center rounded-full bg-primary-soft px-3 font-semibold text-primary-ink no-underline hover:bg-primary-soft-strong"
                >
                  {s.skillName}
                </Link>
              </dd>
            ))}
          </div>
        )}
        {rec.theyLearn.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <dt className="text-muted">Wants to learn from you</dt>
            {rec.theyLearn.map((s) => (
              <dd key={s.skillId} className="inline-flex min-h-8 items-center rounded-full bg-success-soft px-3 font-semibold text-success-ink">
                {s.skillName}
              </dd>
            ))}
          </div>
        )}
      </dl>

      {!compact && (
        <>
          <ul aria-label="Why we suggest them" className="flex flex-col gap-1.5">
            {rec.topReasons.map((f) => (
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
          <Points total={p.pointsTotal} count={p.ratingCount} />
        </>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {offer ? (
          <LinkButton to={`/offers/${offer.id}`}>Book {rec.theyTeach.find((s) => s.skillId === offer.skillId)?.skillName}</LinkButton>
        ) : (
          <LinkButton to={`/users/${p.username}`}>{rec.relationship === 'teacher' ? 'View profile' : 'Invite to your offer'}</LinkButton>
        )}
        {offer && (
          <LinkButton to={`/users/${p.username}`} variant="secondary">
            Profile
          </LinkButton>
        )}
        {!compact && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(!open)}
            className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-primary-ink underline underline-offset-4 hover:bg-primary-soft"
          >
            Why suggested? <span aria-hidden="true">{open ? '▴' : '▾'}</span>
          </button>
        )}
      </div>
      {!compact && (
        <div id={panelId} hidden={!open} className="rounded-xl border border-line bg-surface-2 p-3">
          <FactorTable factors={rec.factors} score={rec.score} />
        </div>
      )}
      {rec.relationship !== 'learner' && !offer && (
        <p className="-mt-2 text-xs text-muted">No published offer yet. Say hello on their profile.</p>
      )}
    </Card>
  )
}
