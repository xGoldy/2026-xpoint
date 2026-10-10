import { useId, useMemo, useState } from 'react'
import { fitsInSlots, intersectSlots, suggestStartTimes, type WeeklySlot } from '../lib/availability'
import { addDaysToKey, formatDateTime, localDateKey, localTimeKey, localToUtc } from '../lib/time'
import { cx } from './ui'

/**
 * BOOK-1: pick the first session's start time. Times when both people's weekly
 * availability overlaps are offered first and highlighted.
 */
export function ProposeTimeField({
  durationMin,
  mySlots,
  theirSlots,
  theirName,
  value,
  onChange,
  error,
}: {
  durationMin: number
  mySlots: WeeklySlot[]
  theirSlots: WeeklySlot[]
  theirName: string
  value: Date | null
  onChange: (value: Date | null) => void
  error?: string | null
}) {
  const id = useId()
  const [now] = useState(() => new Date())
  const shared = useMemo(() => intersectSlots(mySlots, theirSlots), [mySlots, theirSlots])
  const suggestions = useMemo(() => suggestStartTimes(shared, durationMin, now, 14, 1).slice(0, 12), [shared, durationMin, now])
  const [date, setDate] = useState(value ? localDateKey(value) : '')
  const [time, setTime] = useState(value ? localTimeKey(value) : '')

  const updateManual = (nextDate: string, nextTime: string) => {
    setDate(nextDate)
    setTime(nextTime)
    onChange(nextDate && nextTime ? localToUtc(nextDate, nextTime) : null)
  }
  const pick = (d: Date) => {
    setDate(localDateKey(d))
    setTime(localTimeKey(d))
    onChange(d)
  }

  const end = value ? new Date(value.getTime() + durationMin * 60000) : null
  const fitsBoth = value && end ? fitsInSlots(value, end, shared) : false
  const today = localDateKey(now)

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="text-sm font-semibold text-ink">First session</legend>
      {suggestions.length > 0 ? (
        <div>
          <p id={`${id}-sugg`} className="mb-2 text-sm text-muted">
            <span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm bg-success align-middle" />
            Times when you and {theirName} are both free:
          </p>
          <div role="radiogroup" aria-labelledby={`${id}-sugg`} className="flex flex-wrap gap-2">
            {suggestions.map((s) => {
              const checked = value?.getTime() === s.getTime()
              return (
                <label
                  key={s.toISOString()}
                  className={cx(
                    'flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus',
                    checked ? 'border-success bg-success font-semibold text-white' : 'border-success/60 bg-success-soft text-success-ink hover:bg-success-soft',
                  )}
                >
                  <input type="radio" name={`${id}-slot`} checked={checked} onChange={() => pick(s)} className="sr-only" />
                  {formatDateTime(s)}
                </label>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink">
          {mySlots.length === 0
            ? 'Add your weekly availability in your account to see times when you are both free.'
            : `Your availability does not overlap with ${theirName}'s in the next two weeks. Propose a time anyway.`}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-date`} className="text-sm font-semibold">
            {suggestions.length ? 'Or pick a date' : 'Date'}
          </label>
          <input
            id={`${id}-date`}
            type="date"
            min={today}
            max={addDaysToKey(today, 180)}
            value={date}
            onChange={(e) => updateManual(e.target.value, time)}
            aria-invalid={Boolean(error) || undefined}
            className="min-h-11 rounded-xl border border-line-strong/60 bg-surface px-3"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-time`} className="text-sm font-semibold">
            Start time (Bratislava)
          </label>
          <input
            id={`${id}-time`}
            type="time"
            step={900}
            value={time}
            onChange={(e) => updateManual(date, e.target.value)}
            aria-invalid={Boolean(error) || undefined}
            className="min-h-11 rounded-xl border border-line-strong/60 bg-surface px-3"
          />
        </div>
      </div>
      {value && (
        <p role="status" className={cx('text-sm font-medium', fitsBoth ? 'text-success-ink' : 'text-warn-ink')}>
          {fitsBoth ? '✓ You are both free at this time.' : `This is outside your shared availability; ${theirName} may still accept.`}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-danger-ink">
          {error}
        </p>
      )}
    </fieldset>
  )
}
