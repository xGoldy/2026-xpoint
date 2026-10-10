import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { Button, cx } from './ui'

// The seeded demo account (see README). Its password is public on purpose.
export const DEMO_ACCOUNT = { email: 'demo@skillswap.test', password: 'skillswap123', name: 'Alex' }

/** Logs in to the demo account in one click, then returns to where the visitor was heading. */
export function DemoLoginButton({ className, variant = 'secondary' }: { className?: string; variant?: 'primary' | 'secondary' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async () => {
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
    setBusy(false)
    if (err) {
      setError(
        err.code === 'invalid_credentials'
          ? 'The demo account is not set up on this server. Run the seed to create it.'
          : errorMessage(err),
      )
      return
    }
    navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
  }

  return (
    <span className={cx('flex flex-col gap-1', className)}>
      <Button variant={variant} busy={busy} onClick={login}>
        <span aria-hidden="true">✨</span> Try the demo as {DEMO_ACCOUNT.name}
      </Button>
      {error && (
        <span role="alert" className="text-sm font-medium text-danger-ink">
          {error}
        </span>
      )}
    </span>
  )
}
