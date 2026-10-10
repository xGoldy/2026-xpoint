import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { DemoLoginButton } from '../components/DemoLoginButton'
import { RateLimitNotice } from '../components/RateLimitNotice'
import { SkillMultiSelect } from '../components/SkillPickers'
import { Button, Card, FormError, PageTitle, QueryView, SelectField, TextField, TextLink } from '../components/ui'
import { usernameAvailable } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { isServerRateLimit, SIGNUP_LIMIT } from '../lib/rateLimit'
import { useAllSkills, useLocalities } from '../lib/queries'
import { supabase } from '../lib/supabase'
import { useAttemptLimiter } from '../lib/useAttemptLimiter'

type Errors = Partial<Record<'first_name' | 'last_name' | 'username' | 'email' | 'password' | 'locality', string>>

const USERNAME_RE = /^[a-z0-9_]{3,30}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** AUTH-1 to AUTH-3 */
export function RegisterPage() {
  const navigate = useNavigate()
  const localities = useLocalities()
  const skills = useAllSkills()
  const [form, setForm] = useState({ first_name: '', last_name: '', username: '', email: '', password: '', locality: '' })
  const [teach, setTeach] = useState<string[]>([])
  const [learn, setLearn] = useState<string[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Taken usernames and registered emails count as failures, so the form cannot be used to probe accounts.
  const limiter = useAttemptLimiter('register', SIGNUP_LIMIT)

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

  function validate(): Errors {
    const e: Errors = {}
    if (!form.first_name.trim()) e.first_name = 'Enter your first name.'
    if (!form.last_name.trim()) e.last_name = 'Enter your surname.'
    if (!USERNAME_RE.test(form.username))
      e.username = 'Use 3 to 30 lowercase letters, digits or underscores.'
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address, like name@example.com.'
    if (form.password.length < 8) e.password = 'Use at least 8 characters.'
    if (!form.locality) e.locality = 'Choose where you live.'
    return e
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) {
      document.getElementById('register-errors')?.focus()
      return
    }
    if (limiter.isLocked()) return
    setBusy(true)
    try {
      if (!(await usernameAvailable(form.username))) {
        limiter.recordFailure()
        setErrors({ username: 'This username is already taken. Try another one.' })
        return
      }
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            username: form.username,
            locality_id: form.locality,
            teach_skill_ids: teach,
            learn_skill_ids: learn,
          },
        },
      })
      if (error) {
        if (isServerRateLimit(error)) limiter.recordServerLimit()
        else if (error.code !== 'weak_password') limiter.recordFailure()
        if (error.code === 'user_already_exists' || /already registered/i.test(error.message)) {
          setErrors({ email: 'An account with this email already exists. Log in instead.' })
        } else if (error.code === 'weak_password') {
          setErrors({ password: error.message })
        } else if (/database error/i.test(error.message)) {
          setErrors({ username: 'This username is already taken. Try another one.' })
        } else {
          setFormError(errorMessage(error))
        }
        return
      }
      if (!data.session) {
        setFormError('Your account was created, but email confirmation is switched on in Supabase. Turn it off (A11) and log in.')
        return
      }
      limiter.reset()
      navigate('/', { replace: true })
    } catch (err) {
      if (isServerRateLimit(err)) limiter.recordServerLimit()
      setFormError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const errorList = Object.values(errors).filter(Boolean)

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle subtitle="Join your neighbours. Teach what you know, learn what you love, free of charge.">
        Create your account
      </PageTitle>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-soft-strong bg-primary-soft px-5 py-4">
        <p className="text-sm text-primary-ink">
          <strong>Want to look around first?</strong> Try SkillSwap with a ready-made demo account.
        </p>
        <DemoLoginButton />
      </div>
      <Card>
        <form noValidate onSubmit={submit} className="flex flex-col gap-5">
          {errorList.length > 0 && (
            <div id="register-errors" tabIndex={-1} role="alert" className="rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger-ink">
              <p className="font-semibold">Please fix {errorList.length === 1 ? 'this' : `these ${errorList.length}`} before continuing:</p>
              <ul className="mt-1 list-disc pl-5">
                {errorList.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="First name" autoComplete="given-name" value={form.first_name} onChange={set('first_name')} error={errors.first_name} required />
            <TextField label="Surname" autoComplete="family-name" value={form.last_name} onChange={set('last_name')} error={errors.last_name} required />
          </div>
          <TextField
            label="Username"
            hint="Shown on your public profile. Lowercase letters, digits and underscores."
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
            error={errors.username}
            required
          />
          <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
          <TextField
            label="Password"
            type="password"
            hint="At least 8 characters."
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            required
          />
          <QueryView query={localities} label="Loading places">
            {(list) => (
              <SelectField
                label="Where do you live?"
                hint="People in the same town or city count as nearby."
                value={form.locality}
                onChange={set('locality')}
                error={errors.locality}
                required
              >
                <option value="">Choose a town or city</option>
                {list.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </SelectField>
            )}
          </QueryView>
          <QueryView query={skills} label="Loading skills">
            {(list) => (
              <div className="grid gap-4 md:grid-cols-2">
                <SkillMultiSelect
                  legend="Skills I can teach"
                  skills={list}
                  selected={teach}
                  onChange={setTeach}
                />
                <SkillMultiSelect
                  legend="Skills I want to learn"
                  skills={list}
                  selected={learn}
                  onChange={setLearn}
                />
              </div>
            )}
          </QueryView>
          {limiter.lockedFor === 0 && <FormError error={formError} />}
          <RateLimitNotice lockedFor={limiter.lockedFor} attemptsLeft={limiter.attemptsLeft} action="try registering" />
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" busy={busy} disabled={limiter.lockedFor > 0}>
              Create account
            </Button>
            <p className="text-sm text-muted">
              Already a member? <TextLink to="/login">Log in</TextLink>
            </p>
          </div>
        </form>
      </Card>
    </div>
  )
}
