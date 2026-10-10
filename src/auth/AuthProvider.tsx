import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchProfile, type Profile } from '../lib/api'
import { supabase } from '../lib/supabase'

interface AuthState {
  /** True until the stored session has been read. */
  initialising: boolean
  session: Session | null
  userId: string | null
  email: string | null
  profile: Profile | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [initialising, setInitialising] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setInitialising(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') queryClient.invalidateQueries()
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const userId = session?.user.id ?? null
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
  })

  const value: AuthState = {
    initialising: initialising || (Boolean(userId) && profileQuery.isPending),
    session,
    userId,
    email: session?.user.email ?? null,
    profile: profileQuery.data ?? null,
    signOut: async () => {
      await supabase.auth.signOut()
      queryClient.clear()
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
