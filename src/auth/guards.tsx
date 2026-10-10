import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loading } from '../components/ui'
import { useAuth } from './AuthProvider'

/** AUTH-5: logged-out users go to login and come back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { initialising, userId } = useAuth()
  const location = useLocation()
  if (initialising) return <Loading label="Checking your session" />
  if (!userId) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}

/** Registration and login are for logged-out users only. */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { initialising, userId } = useAuth()
  const location = useLocation()
  if (initialising) return <Loading label="Checking your session" />
  if (userId) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />
  return children
}
