import { useId, useMemo, useState } from 'react'
import type { SkillRow } from '../lib/api'
import { cx, SelectField } from './ui'

function groupByCategory(skills: SkillRow[]) {
  const groups = new Map<string, SkillRow[]>()
  for (const s of skills) groups.set(s.category_name, [...(groups.get(s.category_name) ?? []), s])
  return [...groups.entries()].sort(([a], [b]) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
}

/** A filterable checkbox list: keyboard and screen-reader friendly multiselect (AUTH-1). */
export function SkillMultiSelect({
  legend,
  hint,
  skills,
  selected,
  onChange,
  disabledIds,
}: {
  legend: string
  hint?: string
  skills: SkillRow[]
  selected: string[]
  onChange: (ids: string[]) => void
  disabledIds?: Set<string>
}) {
  const id = useId()
  const [filter, setFilter] = useState('')
  const visible = useMemo(
    () => skills.filter((s) => s.name.toLowerCase().includes(filter.trim().toLowerCase())),
    [skills, filter],
  )
  const byId = new Map(skills.map((s) => [s.id, s]))
  const toggle = (skillId: string) =>
    onChange(selected.includes(skillId) ? selected.filter((x) => x !== skillId) : [...selected, skillId])

  return (
    <fieldset className="rounded-xl border border-line p-3" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="px-1 text-sm font-semibold text-ink">
        {legend} <span className="font-normal text-muted">(optional)</span>
      </legend>
      {hint && (
        <p id={`${id}-hint`} className="mb-2 text-sm text-muted">
          {hint}
        </p>
      )}
      {selected.length > 0 && (
        <ul aria-label="Selected" className="mb-2 flex flex-wrap gap-2">
          {selected.map((sid) => (
            <li key={sid}>
              <button
                type="button"
                onClick={() => toggle(sid)}
                className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary-soft px-3 text-sm font-medium text-primary-ink hover:bg-primary-soft-strong"
              >
                {byId.get(sid)?.name}
                <span aria-hidden="true">×</span>
                <span className="sr-only">(remove)</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <label htmlFor={`${id}-filter`} className="sr-only">
        Filter {legend.toLowerCase()}
      </label>
      <input
        id={`${id}-filter`}
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Type to filter skills"
        className="mb-2 min-h-11 w-full rounded-xl border border-line-strong/60 bg-surface px-3 text-base"
      />
      <div className="max-h-56 overflow-y-auto rounded-xl border border-line">
        {visible.length === 0 ? (
          <p className="p-3 text-sm text-muted">No skill matches “{filter}”. You can add new skills later from the skill search.</p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((s) => {
              const disabled = disabledIds?.has(s.id)
              return (
                <li key={s.id}>
                  <label
                    className={cx(
                      'flex min-h-11 items-center gap-3 px-3 text-sm',
                      disabled ? 'cursor-not-allowed text-muted' : 'cursor-pointer hover:bg-surface-2',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      disabled={disabled}
                      onChange={() => toggle(s.id)}
                      className="size-4 accent-primary"
                    />
                    <span className="flex-1">{s.name}</span>
                    <span className="text-xs text-muted">{s.category_name}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </fieldset>
  )
}

export function SkillSelect({
  label,
  skills,
  value,
  onChange,
  error,
  placeholder = 'Choose a skill',
  exclude,
}: {
  label: string
  skills: SkillRow[]
  value: string
  onChange: (id: string) => void
  error?: string | null
  placeholder?: string
  exclude?: Set<string>
}) {
  const groups = groupByCategory(skills.filter((s) => !exclude?.has(s.id)))
  return (
    <SelectField label={label} value={value} onChange={(e) => onChange(e.target.value)} error={error}>
      <option value="">{placeholder}</option>
      {groups.map(([category, list]) => (
        <optgroup key={category} label={category}>
          {list.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </optgroup>
      ))}
    </SelectField>
  )
}
