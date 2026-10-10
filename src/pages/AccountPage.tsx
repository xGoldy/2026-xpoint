import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { AccountNav } from '../components/AccountNav'
import { AppearanceSetting } from '../components/ThemeControls'
import { SkillSelect } from '../components/SkillPickers'
import {
  Button,
  Card,
  EmptyState,
  FormError,
  FormSuccess,
  PageTitle,
  QueryView,
  Section,
  SelectField,
  TextareaField,
  TextField,
  TextLink,
} from '../components/ui'
import {
  addAvailability,
  addUserSkills,
  fetchAvailability,
  fetchUserSkills,
  removeAvailability,
  removeUserSkill,
  updateProfile,
  updateUserSkillLevel,
  type Profile,
  type UserSkill,
} from '../lib/api'
import { LEVEL_LABEL, LEVELS } from '../lib/domain'
import { errorMessage } from '../lib/errors'
import type { Level } from '../lib/match'
import { useAllSkills, useInvalidateAll, useLocalities } from '../lib/queries'
import { fromMinutes, toMinutes, WEEKDAYS } from '../lib/time'

/** ACC-1: username and email are read-only. */
function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const localities = useLocalities()
  const invalidate = useInvalidateAll()
  const [form, setForm] = useState({
    first_name: profile.first_name,
    last_name: profile.last_name,
    locality_id: profile.locality_id,
    bio: profile.bio,
  })
  const [errors, setErrors] = useState<{ first_name?: string; last_name?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(null)
    const found: typeof errors = {}
    if (!form.first_name.trim()) found.first_name = 'Enter your first name.'
    if (!form.last_name.trim()) found.last_name = 'Enter your surname.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await updateProfile(profile.id, { ...form, first_name: form.first_name.trim(), last_name: form.last_name.trim(), bio: form.bio.trim() })
      await invalidate()
      setSaved('Profile saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" autoComplete="given-name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} error={errors.first_name} />
        <TextField label="Surname" autoComplete="family-name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} error={errors.last_name} />
        <TextField label="Username" value={profile.username} readOnly hint="Usernames cannot be changed." />
        <TextField label="Email" value={email} readOnly hint="Never shown to other members." />
      </div>
      <QueryView query={localities} label="Loading places">
        {(list) => (
          <SelectField label="Where you live" value={form.locality_id} onChange={(e) => setForm({ ...form, locality_id: e.target.value })}>
            {list.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </SelectField>
        )}
      </QueryView>
      <TextareaField
        label="Bio"
        optional
        maxLength={1000}
        rows={4}
        value={form.bio}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
        hint="A few words about you, shown on your public profile."
      />
      <FormError error={error} />
      <FormSuccess message={saved} />
      <div>
        <Button type="submit" busy={busy}>
          Save profile
        </Button>
      </div>
    </form>
  )
}

/** ACC-2: one list of skills with levels. */
function SkillList({ role, userId, entries }: { role: 'teach' | 'learn'; userId: string; entries: UserSkill[] }) {
  const skills = useAllSkills()
  const invalidate = useInvalidateAll()
  const [skillId, setSkillId] = useState('')
  const [level, setLevel] = useState<Level | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const title = role === 'teach' ? 'Skills I can teach' : 'Skills I want to learn'

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    setError(null)
    try {
      await fn()
      await invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!skillId) {
      setFieldError('Choose a skill to add.')
      return
    }
    setFieldError(null)
    run('add', async () => {
      await addUserSkills([{ user_id: userId, skill_id: skillId, role, level: level || null }])
      setSkillId('')
      setLevel('')
    })
  }

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-lg font-bold">{title}</h3>
      {role === 'learn' && <p className="text-sm text-muted">Your level here is used for matching. No level counts as beginner.</p>}
      {entries.length === 0 ? (
        <p className="text-sm text-muted">{role === 'teach' ? 'Add something you could show a neighbour.' : 'What would you like to learn?'}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {entries.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
              <TextLink to={`/skills/${s.skill_id}`} className="min-w-28 flex-1">
                {s.skill.name}
              </TextLink>
              <label className="sr-only" htmlFor={`level-${s.id}`}>
                Level for {s.skill.name}
              </label>
              <select
                id={`level-${s.id}`}
                value={s.level ?? ''}
                onChange={(e) => run(s.id, () => updateUserSkillLevel(s.id, (e.target.value || null) as Level | null))}
                className="min-h-11 rounded-xl border border-line-strong/60 bg-surface px-2 text-sm"
              >
                <option value="">No level set</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABEL[l]}
                  </option>
                ))}
              </select>
              <Button variant="ghost" busy={busy === `rm-${s.id}`} onClick={() => run(`rm-${s.id}`, () => removeUserSkill(s.id))}>
                Remove<span className="sr-only"> {s.skill.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} noValidate className="grid gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <QueryView query={skills} label="Loading skills">
          {(list) => (
            <SkillSelect
              label={role === 'teach' ? 'Add a skill to teach' : 'Add a skill to learn'}
              skills={list}
              value={skillId}
              onChange={setSkillId}
              error={fieldError}
              exclude={new Set(entries.map((e) => e.skill_id))}
            />
          )}
        </QueryView>
        <SelectField label="Level" optional value={level} onChange={(e) => setLevel(e.target.value as Level | '')}>
          <option value="">No level</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABEL[l]}
            </option>
          ))}
        </SelectField>
        <Button type="submit" variant="secondary" busy={busy === 'add'}>
          Add
        </Button>
      </form>
      <FormError error={error} />
    </Card>
  )
}

const TIMES = Array.from({ length: 48 }, (_, i) => fromMinutes(i * 30))

/** ACC-3: weekly availability, one set for teaching and learning. */
function AvailabilityEditor({ userId }: { userId: string }) {
  const slots = useQuery({ queryKey: ['availability', userId], queryFn: () => fetchAvailability(userId) })
  const invalidate = useInvalidateAll()
  const [weekday, setWeekday] = useState('0')
  const [start, setStart] = useState('18:00')
  const [end, setEnd] = useState('20:00')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (toMinutes(end) <= toMinutes(start)) {
      setFieldError('The end time must be after the start time.')
      return
    }
    setFieldError(null)
    setBusy('add')
    try {
      await addAvailability(userId, Number(weekday), start, end)
      await invalidate()
    } catch (err) {
      const message = errorMessage(err)
      if (message.includes('overlaps')) setFieldError(message)
      else setError(message)
    } finally {
      setBusy(null)
    }
  }
  const remove = async (id: string) => {
    setBusy(id)
    setError(null)
    try {
      await removeAvailability(id)
      await invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        When are you usually free? Matching uses this for teaching and learning alike. Times are Bratislava time.
      </p>
      <QueryView query={slots} label="Loading availability">
        {(list) =>
          list.length === 0 ? (
            <EmptyState title="No availability yet">Add a time slot below so we can find teachers and learners who fit your week.</EmptyState>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {WEEKDAYS.map((day, i) => {
                const daySlots = list.filter((s) => s.weekday === i)
                return (
                  <li key={day} className="rounded-xl border border-line p-3">
                    <h4 className="text-sm font-bold">{day}</h4>
                    {daySlots.length === 0 ? (
                      <p className="text-sm text-muted">Not available</p>
                    ) : (
                      <ul className="mt-1 flex flex-col gap-1">
                        {daySlots.map((s) => (
                          <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="font-mono">
                              {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                            </span>
                            <Button variant="ghost" className="px-2" busy={busy === s.id} onClick={() => remove(s.id)}>
                              Remove<span className="sr-only"> {day} {s.start_time.slice(0, 5)} to {s.end_time.slice(0, 5)}</span>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )
        }
      </QueryView>
      <form onSubmit={add} noValidate className="grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end">
        <SelectField label="Day" value={weekday} onChange={(e) => setWeekday(e.target.value)} className="col-span-2 sm:col-span-1">
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </SelectField>
        <SelectField label="From" value={start} onChange={(e) => setStart(e.target.value)} error={fieldError ? ' ' : null}>
          {TIMES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>
        <SelectField label="To" value={end} onChange={(e) => setEnd(e.target.value)}>
          {[...TIMES.slice(1), '23:59'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>
        <Button type="submit" variant="secondary" busy={busy === 'add'} className="col-span-2 sm:col-span-1">
          Add time slot
        </Button>
        {fieldError && <p className="col-span-2 text-sm font-medium text-danger-ink sm:col-span-4" role="alert">{fieldError}</p>}
      </form>
      <FormError error={error} />
    </Card>
  )
}

/** ACC-1 to ACC-3 */
export function AccountPage() {
  const { profile, email, userId } = useAuth()
  const location = useLocation()
  const skills = useQuery({ queryKey: ['user-skills', userId], queryFn: () => fetchUserSkills(userId!), enabled: Boolean(userId) })

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash, profile])

  if (!profile || !userId) return null
  return (
    <>
      <PageTitle subtitle={<TextLink to={`/users/${profile.username}`}>View your public profile</TextLink>}>Your account</PageTitle>
      <AccountNav />
      <Section title="Profile">
        <Card>
          <ProfileForm profile={profile} email={email ?? ''} />
        </Card>
      </Section>
      <Section title="Skills">
        <QueryView query={skills} label="Loading your skills">
          {(list) => (
            <div className="grid gap-4 lg:grid-cols-2">
              <SkillList role="teach" userId={userId} entries={list.filter((s) => s.role === 'teach')} />
              <SkillList role="learn" userId={userId} entries={list.filter((s) => s.role === 'learn')} />
            </div>
          )}
        </QueryView>
      </Section>
      <Section title="Weekly availability" id="availability">
        <AvailabilityEditor userId={userId} />
      </Section>
      <Section title="Settings" id="settings">
        <Card className="flex flex-col gap-2">
          <h3 className="text-lg font-bold">Appearance</h3>
          <p className="text-sm text-muted">Saved in this browser. You can also switch quickly with the moon and sun button in the header.</p>
          <AppearanceSetting />
        </Card>
      </Section>
    </>
  )
}
