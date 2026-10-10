import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DEMO_ACCOUNT, DemoLoginButton } from '../components/DemoLoginButton'
import { Button, Card, FormError, PageTitle, TextField, TextLink } from '../components/ui'
import { errorMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'

/** AUTH-4, AUTH-5 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const found: typeof errors = {}
    if (!email.trim()) found.email = 'Enter your email address.'
    if (!password) found.password = 'Enter your password.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      setFormError(error.code === 'invalid_credentials' ? 'The email or password is not correct.' : errorMessage(error))
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="mx-auto max-w-md">
      <PageTitle subtitle={from !== '/' ? 'Log in to continue where you left off.' : undefined}>Log in</PageTitle>
      <Card>
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <FormError error={formError} />
          <Button type="submit" busy={busy}>
            Log in
          </Button>
          <p className="text-sm text-muted">
            New here?{' '}
            <TextLink to="/register" state={{ from }}>
              Create an account
            </TextLink>
          </p>
        </form>
      </Card>
      <div role="separator" className="my-6 flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <Card className="flex flex-col gap-3 text-center">
        <h2 className="font-bold">Just looking around?</h2>
        <p className="text-sm text-muted">
          Explore SkillSwap as {DEMO_ACCOUNT.name}, a member with offers, requests to answer and past sessions.
        </p>
        <DemoLoginButton />
        <p className="text-xs text-muted">
          Demo login: {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
        </p>
      </Card>
    </div>
  )
}
