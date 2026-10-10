import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PersonCard } from '../components/PersonCard'
import { Card, cx, EmptyState, LinkButton, PageTitle, QueryView, TextLink } from '../components/ui'
import { plural } from '../lib/domain'
import { usePeopleRecommendations } from '../lib/queries'
import { RECOMMEND_WEIGHTS, type Relationship } from '../lib/recommend'

type Show = 'all' | Relationship

const FILTERS: { value: Show; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'swap', label: 'Skill swaps' },
  { value: 'teacher', label: 'Can teach you' },
  { value: 'learner', label: 'Want to learn from you' },
]

/** People recommender: members to swap skills with, ranked and explained. */
export function PeoplePage() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const show = (FILTERS.some((f) => f.value === params.get('show')) ? params.get('show') : 'all') as Show
  const nearby = params.get('nearby') === '1'
  const people = usePeopleRecommendations(profile)

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageTitle subtitle="Members whose skills fit yours: people who can teach you, people who want to learn from you, and the best of both, a skill swap.">
        People for you
      </PageTitle>
      <QueryView query={people} label="Finding people for you">
        {({ me, recommendations }) => {
          if (me.teach.length === 0 && me.learn.length === 0)
            return (
              <EmptyState title="Tell us about your skills first" action={<LinkButton to="/account">Add your skills</LinkButton>}>
                Add what you can teach and what you want to learn, and we will suggest people to swap with.
              </EmptyState>
            )
          const inArea = nearby ? recommendations.filter((r) => r.person.localityId === me.localityId) : recommendations
          const count = (rel: Show) => (rel === 'all' ? inArea.length : inArea.filter((r) => r.relationship === rel).length)
          const shown = show === 'all' ? inArea : inArea.filter((r) => r.relationship === show)
          return (
            <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
              <aside aria-label="Filters and your skills" className="flex flex-col gap-5">
                <Card className="flex flex-col gap-4">
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold">Show</legend>
                    <div className="flex flex-col gap-1.5">
                      {FILTERS.map((f) => (
                        <label
                          key={f.value}
                          className={cx(
                            'flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 text-sm transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus',
                            show === f.value ? 'border-primary bg-primary-soft font-semibold text-primary-ink' : 'border-line bg-surface hover:border-primary/60',
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="show"
                              checked={show === f.value}
                              onChange={() => update('show', f.value === 'all' ? null : f.value)}
                              className="size-4 accent-primary"
                            />
                            {f.label}
                          </span>
                          <span className="rounded-full bg-surface-2 px-2 text-xs font-semibold text-muted">{count(f.value)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                    <input type="checkbox" checked={nearby} onChange={(e) => update('nearby', e.target.checked ? '1' : null)} className="size-4 accent-primary" />
                    Only people in {me.localityName}
                  </label>
                </Card>
                <Card className="text-sm">
                  <h2 className="mb-2 font-bold">Based on your skills</h2>
                  <dl className="grid gap-2">
                    <div>
                      <dt className="text-muted">You teach</dt>
                      <dd>{me.teach.map((s) => s.skillName).join(', ') || 'Nothing yet'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">You want to learn</dt>
                      <dd>{me.learn.map((s) => s.skillName).join(', ') || 'Nothing yet'}</dd>
                    </div>
                  </dl>
                  <p className="mt-3">
                    <TextLink to="/account">Edit skills and availability</TextLink>
                  </p>
                  <details className="mt-3">
                    <summary className="min-h-11 cursor-pointer content-center font-semibold">How suggestions are scored</summary>
                    <ul className="mt-1 list-disc pl-5 text-muted">
                      <li>Can teach you × {RECOMMEND_WEIGHTS.teachesYou}</li>
                      <li>Wants to learn from you × {RECOMMEND_WEIGHTS.learnsFromYou}</li>
                      <li>Same area × {RECOMMEND_WEIGHTS.area}</li>
                      <li>Shared free time × {RECOMMEND_WEIGHTS.time}</li>
                      <li>Reputation × {RECOMMEND_WEIGHTS.reputation}</li>
                    </ul>
                    <p className="mt-1 text-muted">One shared skill counts 0.75, two or more count fully. A swap gets both skill factors.</p>
                  </details>
                </Card>
              </aside>
              <div>
                {me.availability.length === 0 && (
                  <p role="note" className="mb-4 rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-sm text-warn-ink">
                    Add your weekly availability so we can find people who are free when you are.{' '}
                    <TextLink to="/account#availability">Add availability</TextLink>
                  </p>
                )}
                {shown.length === 0 ? (
                  <EmptyState
                    title="No one matches these filters yet"
                    action={
                      show !== 'all' || nearby ? (
                        <LinkButton to="/people" variant="secondary">
                          Show everyone
                        </LinkButton>
                      ) : (
                        <LinkButton to="/account">Add more skills</LinkButton>
                      )
                    }
                  >
                    More skills on your profile means more people to swap with.
                  </EmptyState>
                ) : (
                  <>
                    <p role="status" className="mb-3 text-sm text-muted">
                      {plural(shown.length, 'person', 'people')} suggested
                    </p>
                    <ol className="grid gap-4 xl:grid-cols-2">
                      {shown.map((r) => (
                        <li key={r.person.id}>
                          <PersonCard rec={r} />
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            </div>
          )
        }}
      </QueryView>
    </>
  )
}
