import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { splitMatch, suggest, type MatchRange, type Suggestion } from '../lib/autocomplete'
import { CATEGORY_ICONS, plural } from '../lib/domain'
import { useAllSkills, useCategories } from '../lib/queries'
import { Button, cx } from './ui'

type Option = Suggestion | { kind: 'all'; query: string }

function Highlight({ text, match }: { text: string; match: MatchRange }) {
  const [before, hit, after] = splitMatch(text, match)
  return (
    <>
      {before}
      {hit && <mark className="rounded bg-primary-soft-strong px-0.5 text-inherit">{hit}</mark>}
      {after}
    </>
  )
}

/**
 * Skill search with suggestions (WAI-ARIA combobox pattern). Arrow keys move
 * through suggestions, Enter opens the highlighted one or searches everything,
 * Escape closes the list and then clears the box.
 */
export function SearchAutocomplete({
  variant = 'header',
  placeholder = 'Search skills…',
  label = 'Search skills',
  onNavigate,
  className,
}: {
  variant?: 'header' | 'hero'
  placeholder?: string
  label?: string
  onNavigate?: () => void
  className?: string
}) {
  const navigate = useNavigate()
  const skills = useAllSkills()
  const categories = useCategories()
  const id = useId()
  const listId = `${id}-list`
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const options: Option[] = useMemo(() => {
    const list: Option[] = suggest(skills.data ?? [], categories.data ?? [], query)
    if (query.trim()) list.push({ kind: 'all', query: query.trim() })
    return list
  }, [skills.data, categories.data, query])
  const showList = open && options.length > 0
  const popular = !query.trim()

  const go = (option: Option | null) => {
    const q = query.trim()
    if (!option) navigate(q ? `/skills?q=${encodeURIComponent(q)}` : '/skills')
    else if (option.kind === 'skill') navigate(`/skills/${option.skill.id}`)
    else if (option.kind === 'category') navigate(`/skills?category=${option.category.id}`)
    else navigate(`/skills?q=${encodeURIComponent(option.query)}`)
    setQuery('')
    setOpen(false)
    setActive(-1)
    inputRef.current?.blur()
    onNavigate?.()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!showList) {
        setOpen(true)
        setActive(e.key === 'ArrowDown' ? 0 : options.length - 1)
        return
      }
      // -1 means "back in the text box"; moving past either end wraps through it.
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => {
        const next = i + step
        if (next >= options.length) return -1
        if (next < -1) return options.length - 1
        return next
      })
    } else if (e.key === 'Enter' && showList && active >= 0) {
      e.preventDefault()
      go(options[active])
    } else if (e.key === 'Escape') {
      if (showList) {
        e.preventDefault()
        setOpen(false)
        setActive(-1)
      } else if (query) {
        e.preventDefault()
        setQuery('')
      }
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    go(null)
  }

  const optionId = (i: number) => `${id}-opt-${i}`
  const hero = variant === 'hero'

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cx(
        'relative',
        hero ? 'flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lift sm:flex-row' : 'flex',
        className,
      )}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {!hero && (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      )}
      <input
        ref={inputRef}
        id={id}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={
          hero
            ? 'min-h-12 flex-1 rounded-xl bg-transparent px-4 text-base text-ink placeholder:text-muted'
            : 'min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface-2 pr-3 pl-10 text-base text-ink placeholder:text-muted focus:border-primary focus:bg-surface'
        }
      />
      {hero && (
        <Button type="submit" className="min-h-12 px-6">
          Find a teacher
        </Button>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {showList ? `${plural(options.length, 'suggestion')} available. Use the up and down arrows to choose.` : ''}
      </p>

      {showList && (
        <div
          className={cx(
            'animate-fade-up absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-lift',
            hero && 'sm:right-auto sm:w-[calc(100%-9.5rem)]',
          )}
        >
          {popular && <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Popular skills</p>}
          <ul id={listId} role="listbox" aria-label="Search suggestions" className="max-h-96 overflow-y-auto p-1.5">
            {options.map((o, i) => (
              <li
                key={o.kind === 'skill' ? o.skill.id : o.kind === 'category' ? `c-${o.category.id}` : 'all'}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                // Keep focus in the input so the list does not close before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(o)}
                onMouseEnter={() => setActive(i)}
                className={cx(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm',
                  i === active ? 'bg-primary-soft' : '',
                  o.kind === 'all' && 'mt-1 border-t border-line',
                )}
              >
                {o.kind === 'skill' && (
                  <>
                    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-base">
                      {CATEGORY_ICONS[o.skill.category_name] ?? '•'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">
                        <Highlight text={o.skill.name} match={o.match} />
                      </span>
                      <span className="block text-xs text-muted">
                        {o.skill.category_name} · {o.skill.active_offer_count ? plural(o.skill.active_offer_count, 'offer') : 'no offers yet'}
                      </span>
                    </span>
                  </>
                )}
                {o.kind === 'category' && (
                  <>
                    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-base">
                      {CATEGORY_ICONS[o.category.name] ?? '•'}
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold text-ink">
                        <Highlight text={o.category.name} match={o.match} />
                      </span>
                      <span className="block text-xs text-muted">Category</span>
                    </span>
                  </>
                )}
                {o.kind === 'all' && (
                  <span className="flex items-center gap-2 font-medium text-primary-ink">
                    <span aria-hidden="true">🔍</span>
                    Search all skills for “{o.query}”
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  )
}
