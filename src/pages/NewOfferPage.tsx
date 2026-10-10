import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { SkillSelect } from '../components/SkillPickers'
import { Button, Card, FormError, PageTitle, QueryView, RadioGroup, SelectField, TextareaField, TextField, TextLink } from '../components/ui'
import { createOffer } from '../lib/api'
import { DURATIONS, formatDuration, LEVEL_LABEL, OFFER_LEVELS, type Format, type Mode } from '../lib/domain'
import { errorMessage } from '../lib/errors'
import type { OfferLevel } from '../lib/match'
import { useAllSkills, useInvalidateAll, useLocalities } from '../lib/queries'
import { addDaysToKey, localDateKey, localToUtc } from '../lib/time'

type Errors = Partial<Record<'skill' | 'title' | 'session_count' | 'locality' | 'max_participants' | 'sessions', string>>

interface SessionRow {
  date: string
  time: string
}

/** OFFER-1 to OFFER-3 */
export function NewOfferPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const skills = useAllSkills()
  const localities = useLocalities()
  const invalidate = useInvalidateAll()

  const [skillId, setSkillId] = useState(params.get('skill') ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<Format>('one_to_one')
  const [level, setLevel] = useState<OfferLevel>('beginner')
  const [sessionCount, setSessionCount] = useState('4')
  const [duration, setDuration] = useState('60')
  const [mode, setMode] = useState<Mode>('in_person')
  const [localityId, setLocalityId] = useState(profile?.locality_id ?? '')
  const [maxParticipants, setMaxParticipants] = useState('8')
  const [rows, setRows] = useState<SessionRow[]>([])
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const count = Number(sessionCount)
  const countValid = Number.isInteger(count) && count >= 1 && count <= 20
  // OFFER-2: one date row per session; rows follow the number of sessions.
  const sessionRows: SessionRow[] = countValid
    ? Array.from({ length: count }, (_, i) => rows[i] ?? { date: '', time: rows[i - 1]?.time ?? '' })
    : rows
  const setRow = (i: number, patch: Partial<SessionRow>) => {
    const next = [...sessionRows]
    next[i] = { ...next[i], ...patch }
    // Fill later empty rows one week apart to save typing.
    if (patch.date && i === 0) {
      for (let j = 1; j < next.length; j++) if (!next[j].date) next[j] = { ...next[j], date: addDaysToKey(patch.date, 7 * j) }
    }
    if (patch.time && i === 0) {
      for (let j = 1; j < next.length; j++) if (!next[j].time) next[j] = { ...next[j], time: patch.time }
    }
    setRows(next)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const found: Errors = {}
    const foundRows: Record<number, string> = {}
    if (!skillId) found.skill = 'Choose the skill you will teach.'
    if (title.trim().length < 3 || title.trim().length > 100) found.title = 'Use 3 to 100 characters.'
    if (!countValid) found.session_count = 'Enter a whole number from 1 to 20.'
    if (mode === 'in_person' && !localityId) found.locality = 'Choose where the sessions take place.'
    const max = Number(maxParticipants)
    if (format === 'class' && (!Number.isInteger(max) || max < 2 || max > 100)) found.max_participants = 'Enter a number from 2 to 100.'
    const starts: string[] = []
    if (format === 'class' && countValid) {
      const now = new Date()
      sessionRows.forEach((r, i) => {
        if (!r.date || !r.time) foundRows[i] = 'Enter a date and a start time.'
        else {
          const at = localToUtc(r.date, r.time)
          if (at <= now) foundRows[i] = 'This must be in the future.'
          else starts.push(at.toISOString())
        }
      })
      if (Object.keys(foundRows).length) found.sessions = 'Every session needs a future date and start time.'
    }
    setErrors(found)
    setRowErrors(foundRows)
    if (Object.keys(found).length) {
      setFormError(`Please fix ${Object.keys(found).length === 1 ? 'the highlighted field' : 'the highlighted fields'}.`)
      return
    }
    setBusy(true)
    try {
      const id = await createOffer({
        skill_id: skillId,
        title: title.trim(),
        description: description.trim(),
        format,
        level,
        session_count: count,
        session_duration_min: Number(duration),
        mode,
        locality_id: mode === 'in_person' ? localityId : null,
        max_participants: format === 'class' ? max : 1,
        session_starts: format === 'class' ? starts : [],
      })
      await invalidate()
      navigate(`/offers/${id}`)
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const today = localDateKey(new Date())

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle subtitle="Share what you know with your neighbours. It is free for everyone.">Teach a skill</PageTitle>
      <Card>
        <form noValidate onSubmit={submit} className="flex flex-col gap-5">
          <QueryView query={skills} label="Loading skills">
            {(list) => (
              <div>
                <SkillSelect label="Skill" skills={list} value={skillId} onChange={setSkillId} error={errors.skill} />
                <p className="mt-1 text-sm text-muted">
                  Not listed? <TextLink to="/skills#add-skill">Add it to the catalogue</TextLink> first.
                </p>
              </div>
            )}
          </QueryView>
          <TextField label="Title" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} placeholder="e.g. Conversational Spanish for beginners" />
          <TextareaField
            label="Description"
            optional
            maxLength={2000}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            hint="What will people learn, what should they bring?"
          />
          <RadioGroup<Format>
            legend="Format"
            name="format"
            value={format}
            onChange={setFormat}
            options={[
              { value: 'one_to_one', label: '1:1', hint: 'You agree times with each learner' },
              { value: 'class', label: 'Class', hint: 'A group on fixed dates' },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Level" value={level} onChange={(e) => setLevel(e.target.value as OfferLevel)}>
              {OFFER_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Number of sessions"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={sessionCount}
              onChange={(e) => setSessionCount(e.target.value)}
              error={errors.session_count}
            />
            <SelectField label="Session length" value={duration} onChange={(e) => setDuration(e.target.value)}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDuration(d)}
                </option>
              ))}
            </SelectField>
          </div>
          <RadioGroup<Mode>
            legend="Where"
            name="mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'in_person', label: 'In person' },
              { value: 'online', label: 'Online' },
            ]}
          />
          {mode === 'in_person' && (
            <QueryView query={localities} label="Loading places">
              {(list) => (
                <SelectField label="Town or city" value={localityId} onChange={(e) => setLocalityId(e.target.value)} error={errors.locality}>
                  <option value="">Choose a town or city</option>
                  {list.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </SelectField>
              )}
            </QueryView>
          )}
          {format === 'class' && (
            <>
              <TextField
                label="Maximum participants"
                type="number"
                inputMode="numeric"
                min={2}
                max={100}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                error={errors.max_participants}
                className="sm:max-w-xs"
              />
              <fieldset className="rounded-xl border border-line p-3" aria-describedby={errors.sessions ? 'sessions-error' : 'sessions-hint'}>
                <legend className="px-1 text-sm font-semibold">Session dates (Bratislava time)</legend>
                <p id="sessions-hint" className="mb-3 text-sm text-muted">
                  Enter the first date and time; later sessions are pre-filled one week apart and you can change them.
                </p>
                {!countValid ? (
                  <p className="text-sm text-muted">Enter the number of sessions first.</p>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {sessionRows.map((r, i) => (
                      <li key={i} className="grid grid-cols-[auto_1fr_1fr] items-end gap-2">
                        <span className="pb-3 text-sm font-semibold">{i + 1}.</span>
                        <label className="flex flex-col gap-1 text-sm font-semibold">
                          <span className="sr-only">Session {i + 1} </span>Date
                          <input
                            type="date"
                            min={today}
                            value={r.date}
                            onChange={(e) => setRow(i, { date: e.target.value })}
                            aria-invalid={Boolean(rowErrors[i]) || undefined}
                            className={`min-h-11 w-full min-w-0 rounded-xl border bg-surface px-2 font-normal ${rowErrors[i] ? 'border-danger' : 'border-line-strong/60'}`}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm font-semibold">
                          <span className="sr-only">Session {i + 1} </span>Start
                          <input
                            type="time"
                            step={900}
                            value={r.time}
                            onChange={(e) => setRow(i, { time: e.target.value })}
                            aria-invalid={Boolean(rowErrors[i]) || undefined}
                            className={`min-h-11 w-full min-w-0 rounded-xl border bg-surface px-2 font-normal ${rowErrors[i] ? 'border-danger' : 'border-line-strong/60'}`}
                          />
                        </label>
                        {rowErrors[i] && <p className="col-span-3 col-start-2 text-sm font-medium text-danger-ink">{rowErrors[i]}</p>}
                      </li>
                    ))}
                  </ol>
                )}
                {errors.sessions && (
                  <p id="sessions-error" className="mt-2 text-sm font-medium text-danger-ink">
                    {errors.sessions}
                  </p>
                )}
              </fieldset>
            </>
          )}
          <FormError error={formError} />
          <div>
            <Button type="submit" busy={busy}>
              Publish offer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
