import { useQuery } from '@tanstack/react-query'
import { Fragment, useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { TeacherList } from '../components/TeacherList'
import { Button, EmptyState, INTERACTIVE_CARD, LinkButton, QueryView, Section } from '../components/ui'
import { fetchCommunityStats, fetchSkillsWithOffers, fetchTopTeachers } from '../lib/api'
import { CATEGORY_ICONS, plural } from '../lib/domain'
import { useCategories, useLocalities } from '../lib/queries'

function HeroSearch() {
  const navigate = useNavigate()
  const id = useId()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/skills?q=${encodeURIComponent(q.trim())}` : '/skills')
  }
  return (
    <form
      role="search"
      onSubmit={submit}
      className="mx-auto mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lift sm:flex-row"
    >
      <label htmlFor={id} className="sr-only">
        What do you want to learn?
      </label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="What do you want to learn? Try “guitar”"
        className="min-h-12 flex-1 rounded-xl bg-transparent px-4 text-base text-ink placeholder:text-muted"
      />
      <Button type="submit" className="min-h-12 px-6">
        Find a teacher
      </Button>
    </form>
  )
}

function Counters() {
  const stats = useQuery({ queryKey: ['community-stats'], queryFn: fetchCommunityStats })
  const items = [
    { value: stats.data?.skills_offered, label: 'skills offered', icon: '📚' },
    { value: stats.data?.teachers, label: 'neighbours teaching', icon: '🤝' },
    { value: stats.data?.bookings, label: 'sessions booked', icon: '📅' },
  ]
  return (
    <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3" aria-busy={stats.isPending}>
      {items.map((item, i) => (
        <div
          key={item.label}
          className="animate-fade-up rounded-2xl border border-line bg-surface-glass p-3 shadow-card backdrop-blur sm:p-4"
          style={{ animationDelay: `${0.15 + i * 0.1}s` }}
        >
          <dt className="text-xs text-muted sm:text-sm">
            <span aria-hidden="true" className="mr-1">
              {item.icon}
            </span>
            {item.label}
          </dt>
          <dd className="text-gradient mt-1 text-2xl font-extrabold sm:text-4xl">{item.value ?? '–'}</dd>
        </div>
      ))}
    </dl>
  )
}

const STEPS = [
  { icon: '🔍', title: 'Find a neighbour', text: 'Search a skill and get matches ranked by time, level, place and reputation.' },
  { icon: '🤝', title: 'Book or swap', text: 'Request a 1:1 session or join a class. Teach something back if you like.' },
  { icon: '⭐', title: 'Learn and give points', text: 'Meet, learn, then thank your teacher with 1 to 5 points.' },
]

function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="mb-14 scroll-mt-24">
      <div className="rounded-3xl border border-line bg-surface-glass p-6 text-center shadow-card backdrop-blur sm:p-10">
        <h2 id="how-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
          How SkillSwap works
        </h2>
        <p className="mt-2 text-muted">Give a little, learn a lot. No money changes hands.</p>
        <ol className="mt-8 flex flex-col items-stretch gap-4 md:flex-row md:items-center">
          {STEPS.map((s, i) => (
            <Fragment key={s.title}>
              <li
                className="animate-fade-up flex-1 rounded-2xl border border-line bg-surface p-5 text-left shadow-card md:text-center"
                style={{ animationDelay: `${0.2 + i * 0.15}s` }}
              >
                <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-2xl md:mx-auto">
                  {s.icon}
                </span>
                <h3 className="mt-3 font-bold">
                  <span className="text-primary-ink">{i + 1}.</span> {s.title}
                </h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </li>
              {i < STEPS.length - 1 && (
                <li aria-hidden="true" className="hidden text-2xl font-bold text-primary-ink md:block">
                  →
                </li>
              )}
            </Fragment>
          ))}
        </ol>
      </div>
    </section>
  )
}

/** HOME-1 to HOME-4 */
export function HomePage() {
  const { userId, profile } = useAuth()
  const localities = useLocalities()
  const categories = useCategories()
  const localityId = profile?.locality_id ?? null
  const localityName = localities.data?.find((l) => l.id === localityId)?.name

  useEffect(() => {
    document.title = 'SkillSwap · neighbours teaching neighbours'
  }, [])

  const skills = useQuery({ queryKey: ['home-skills', localityId], queryFn: () => fetchSkillsWithOffers(localityId) })
  const teachers = useQuery({ queryKey: ['home-teachers', localityId], queryFn: () => fetchTopTeachers(localityId) })

  return (
    <>
      <section aria-labelledby="hero-title" className="animate-fade-up mx-auto max-w-4xl pt-6 pb-14 text-center sm:pt-12">
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-glass px-3 py-1.5 text-sm font-medium text-muted shadow-card backdrop-blur">
          <span aria-hidden="true" className="size-2 rounded-full bg-success" />
          {profile ? `Welcome back, ${profile.first_name}` : 'Free · Local · Community-powered'}
        </p>
        <h1 id="hero-title" tabIndex={-1} className="mt-6 text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
          Swap skills.
          <br />
          <span className="text-gradient">Learn together.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">
          Neighbours teaching neighbours, free of charge. Find someone nearby who can teach you, book a session, and
          thank them with points.
        </p>
        <HeroSearch />
        {!userId && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkButton to="/register" className="px-7 py-3 text-base">
              Join now, it is free
            </LinkButton>
            <LinkButton to="/skills" variant="secondary" className="px-7 py-3 text-base">
              Browse skills
            </LinkButton>
          </div>
        )}
        <Counters />
      </section>

      <Section
        title="Browse by category"
        actions={
          <Link to="/skills" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-ink no-underline hover:underline">
            All skills →
          </Link>
        }
      >
        <QueryView query={categories} label="Loading categories">
          {(list) => (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {list.map((c) => (
                <li key={c.id}>
                  <Link to={`/skills?category=${c.id}`} className={`${INTERACTIVE_CARD} flex items-center gap-3 p-4 font-semibold`}>
                    <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-xl">
                      {CATEGORY_ICONS[c.name] ?? '•'}
                    </span>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </QueryView>
      </Section>

      <Section title={localityName ? `Skills taught in ${localityName}` : 'Skills you can learn now'}>
        <QueryView query={skills} label="Loading skills">
          {(list) =>
            list.length === 0 ? (
              <EmptyState
                title={localityName ? `Nobody teaches in ${localityName} yet` : 'No offers yet'}
                action={<LinkButton to="/offers/new">Be the first to teach a skill</LinkButton>}
              >
                Share something you know. Your neighbours will thank you.
              </EmptyState>
            ) : (
              <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {list.map((s) => (
                  <li key={s.id}>
                    <Link to={`/skills/${s.id}`} className={`${INTERACTIVE_CARD} h-full`}>
                      <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
                        <span aria-hidden="true">{CATEGORY_ICONS[s.category] ?? '•'}</span>
                        {s.category}
                      </span>
                      <span className="mt-2 block text-lg font-bold">{s.name}</span>
                      <span className="mt-1 block text-sm text-muted">
                        {plural(s.offers, 'offer')} · {plural(s.teachers, 'teacher')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryView>
      </Section>

      <Section title={localityName ? `Top teachers in ${localityName}` : 'Top teachers'}>
        <QueryView query={teachers} label="Loading teachers">
          {(list) =>
            list.length === 0 ? (
              <EmptyState title="No teachers here yet" action={<LinkButton to="/offers/new">Teach a skill</LinkButton>}>
                Be the first teacher in your area.
              </EmptyState>
            ) : (
              <TeacherList teachers={list} />
            )
          }
        </QueryView>
      </Section>

      <HowItWorks />

      {!userId && (
        <section aria-labelledby="cta-title" className="bg-gradient-primary relative overflow-hidden rounded-3xl p-8 text-center text-white shadow-lift sm:p-12">
          <h2 id="cta-title" className="text-2xl font-extrabold sm:text-3xl">
            Everyone knows something worth sharing
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Register in a minute, tell us what you can teach and what you want to learn, and we will match you with
            people nearby.
          </p>
          <Link
            to="/register"
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-white px-7 font-semibold text-blue-800 no-underline shadow-card transition hover:-translate-y-0.5"
          >
            Create your free account
          </Link>
        </section>
      )}
    </>
  )
}
