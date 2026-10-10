import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import {
  Button,
  Card,
  cx,
  EmptyState,
  FormError,
  INTERACTIVE_CARD,
  LinkButton,
  PageTitle,
  QueryView,
  Section,
  SelectField,
  TextField,
  TextLink,
} from '../components/ui'
import { addSkill, findSkillByName, searchSkills } from '../lib/api'
import { CATEGORY_ICONS, plural } from '../lib/domain'
import { errorMessage } from '../lib/errors'
import { useCategories, useInvalidateAll } from '../lib/queries'

/** SKILL-4: add a skill; an existing name links to the existing skill. */
function AddSkillForm({ defaultName }: { defaultName: string }) {
  const { userId } = useAuth()
  const categories = useCategories()
  const navigate = useNavigate()
  const invalidate = useInvalidateAll()
  const [name, setName] = useState(defaultName)
  const [categoryId, setCategoryId] = useState('')
  const [errors, setErrors] = useState<{ name?: string; category?: string }>({})
  const [existing, setExisting] = useState<{ id: string; name: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => setName(defaultName), [defaultName])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setExisting(null)
    const found: typeof errors = {}
    if (name.trim().length < 2 || name.trim().length > 60) found.name = 'Use 2 to 60 characters.'
    if (!categoryId) found.category = 'Choose a category.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const match = await findSkillByName(name)
      if (match) {
        setExisting(match)
        return
      }
      const created = await addSkill(name, categoryId, userId!)
      await invalidate()
      navigate(`/skills/${created.id}`)
    } catch (err) {
      const message = errorMessage(err)
      if (message.includes('already exists')) setExisting(await findSkillByName(name))
      else setFormError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
      <TextField
        label="Skill name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setExisting(null)
        }}
        error={errors.name}
      />
      <QueryView query={categories} label="Loading categories">
        {(list) => (
          <SelectField label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.category}>
            <option value="">Choose a category</option>
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
        )}
      </QueryView>
      <Button type="submit" busy={busy} className="sm:mt-7">
        Add skill
      </Button>
      {existing && (
        <p role="status" className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn-ink sm:col-span-3">
          “{existing.name}” is already in the catalogue.{' '}
          <TextLink to={`/skills/${existing.id}`}>Go to {existing.name}</TextLink>
        </p>
      )}
      <div className="sm:col-span-3">
        <FormError error={formError} />
      </div>
    </form>
  )
}

/** SKILL-1 to SKILL-4 */
export function SkillsPage() {
  const { userId } = useAuth()
  const [params, setParams] = useSearchParams()
  const categories = useCategories()
  const searchId = useId()
  const q = params.get('q') ?? ''
  const categoryId = params.get('category')
  const [input, setInput] = useState(q)
  const [debounced, setDebounced] = useState(q)

  // Keep the box in sync when the header search changes the URL.
  useEffect(() => {
    setInput(q)
    setDebounced(q)
  }, [q])

  // SKILL-1: results update as the user types.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(input)
      const next = new URLSearchParams(params)
      if (input.trim()) next.set('q', input)
      else next.delete('q')
      if ((next.get('q') ?? '') !== q) setParams(next, { replace: true })
    }, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  const results = useQuery({
    queryKey: ['skill-search', debounced.trim().toLowerCase(), categoryId],
    queryFn: () => searchSkills(debounced, categoryId),
    placeholderData: keepPreviousData,
  })

  const setCategory = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('category', id)
    else next.delete('category')
    setParams(next, { replace: true })
  }

  const categoryName = categories.data?.find((c) => c.id === categoryId)?.name

  return (
    <>
      <PageTitle subtitle="Search the shared catalogue and find people who teach it.">Find a skill</PageTitle>

      <div className="mb-6 flex flex-col gap-4">
        <form role="search" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor={searchId} className="mb-1 block text-sm font-semibold">
            Search skills by name
          </label>
          <input
            id={searchId}
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Spanish, yoga, bread"
            className="min-h-12 w-full max-w-xl rounded-2xl border border-line bg-surface px-4 text-base text-ink shadow-card placeholder:text-muted focus:border-primary"
          />
        </form>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <CategoryChip pressed={!categoryId} onClick={() => setCategory(null)}>
            All categories
          </CategoryChip>
          {categories.data?.map((c) => (
            <CategoryChip key={c.id} pressed={categoryId === c.id} onClick={() => setCategory(c.id)}>
              {c.name}
            </CategoryChip>
          ))}
        </div>
      </div>

      <Section title={categoryName ? `${categoryName} skills` : 'Skills'}>
        <QueryView query={results} label="Searching">
          {(list) => (
            <>
              <p role="status" aria-live="polite" className="mb-3 text-sm text-muted">
                {plural(list.length, 'skill')} found
                {debounced.trim() && <> for “{debounced.trim()}”</>}
                {categoryName && <> in {categoryName}</>}
              </p>
              {list.length === 0 ? (
                <EmptyState
                  title="No skills match your search"
                  action={
                    userId ? (
                      <a href="#add-skill" className="font-semibold text-primary-ink underline underline-offset-2">
                        Add “{debounced.trim() || 'a new skill'}” to the catalogue
                      </a>
                    ) : (
                      <LinkButton to="/register">Register to add a skill</LinkButton>
                    )
                  }
                >
                  Try a shorter word or another category.
                </EmptyState>
              ) : (
                <ul className={cx('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', results.isPlaceholderData && 'opacity-60')}>
                  {list.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/skills/${s.id}`}
                        className={`${INTERACTIVE_CARD} flex h-full flex-col`}
                      >
                        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
                          <span aria-hidden="true">{CATEGORY_ICONS[s.category_name] ?? '•'}</span>
                          {s.category_name}
                        </span>
                        <span className="mt-2 text-lg font-bold">{s.name}</span>
                        <span className="mt-1 text-sm text-muted">
                          {plural(s.active_offer_count, 'active offer')} · {plural(s.teacher_count, 'teacher')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </QueryView>
      </Section>

      <Section title="Missing a skill?" id="add-skill">
        {userId ? (
          <Card>
            <p className="mb-4 text-sm text-muted">Add it to the catalogue so others can find, teach and learn it.</p>
            <AddSkillForm defaultName={debounced.trim()} />
          </Card>
        ) : (
          <p className="text-muted">
            <TextLink to="/login" state={{ from: '/skills' }}>
              Log in
            </TextLink>{' '}
            to add a skill to the catalogue.
          </p>
        )}
      </Section>
    </>
  )
}

function CategoryChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cx(
        'min-h-11 rounded-full border px-4 text-sm font-semibold',
        pressed ? 'border-primary bg-primary text-white' : 'border-line-strong/60 bg-surface text-ink hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  )
}
