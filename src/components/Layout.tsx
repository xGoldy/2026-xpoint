import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { fetchPendingCount } from '../lib/api'
import { supabaseConfigured } from '../lib/supabase'
import { ThemeToggle } from './ThemeControls'
import { cx, LinkButton } from './ui'

export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('bg-gradient-primary flex items-center justify-center rounded-xl text-white shadow-primary', className)}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 9h12l-3-3M19 15H7l3 3" />
      </svg>
    </span>
  )
}

function Logo() {
  return (
    <Link to="/" className="flex min-h-11 items-center gap-2.5 rounded-xl no-underline">
      <LogoMark />
      <span className="text-gradient text-xl font-extrabold tracking-tight">SkillSwap</span>
    </Link>
  )
}

function HeaderSearch({ className, onSubmitted }: { className?: string; onSubmitted?: () => void }) {
  const navigate = useNavigate()
  const id = useId()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/skills?q=${encodeURIComponent(q.trim())}` : '/skills')
    setQ('')
    onSubmitted?.()
  }
  return (
    <form role="search" onSubmit={submit} className={cx('relative flex', className)}>
      <label htmlFor={id} className="sr-only">
        Search skills
      </label>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search skills…"
        className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface-2 pr-3 pl-10 text-base text-ink placeholder:text-muted focus:border-primary focus:bg-surface"
      />
    </form>
  )
}

/** BOOK-7: pending bookings awaiting the current user's response. */
function RequestsBadge() {
  const { userId } = useAuth()
  const { data: count = 0 } = useQuery({
    queryKey: ['pending-count', userId],
    queryFn: fetchPendingCount,
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  })
  if (!userId) return null
  const label = count === 0 ? 'No requests awaiting your response' : `${count} ${count === 1 ? 'request' : 'requests'} awaiting your response`
  return (
    <Link
      to="/account/sessions?tab=requests"
      aria-label={label}
      title={label}
      className="relative inline-flex size-11 items-center justify-center rounded-xl text-muted transition hover:bg-primary-soft hover:text-primary-ink"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[0.7rem] font-bold text-white ring-2 ring-surface"
        >
          {count}
        </span>
      )}
    </Link>
  )
}

const navLink = ({ isActive }: { isActive: boolean }) =>
  cx(
    'inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium no-underline transition',
    isActive ? 'text-primary-ink' : 'text-muted hover:text-ink',
  )

const menuLink = ({ isActive }: { isActive: boolean }) =>
  cx(
    'flex min-h-11 items-center rounded-xl px-3 text-sm no-underline transition hover:bg-surface-2',
    isActive ? 'font-semibold text-primary-ink' : 'text-ink',
  )

function AccountLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <ul className="flex flex-col gap-0.5">
      <li>
        <NavLink to="/account/sessions" className={menuLink} onClick={onNavigate}>
          My sessions
        </NavLink>
      </li>
      <li>
        <NavLink to="/account/offers" className={menuLink} onClick={onNavigate}>
          My offers
        </NavLink>
      </li>
      <li>
        <NavLink end to="/account" className={menuLink} onClick={onNavigate}>
          Profile, skills and availability
        </NavLink>
      </li>
      <li>
        <Link to="/account#settings" className={menuLink({ isActive: false })} onClick={onNavigate}>
          Settings
        </Link>
      </li>
      {profile && (
        <li>
          <NavLink to={`/users/${profile.username}`} className={menuLink} onClick={onNavigate}>
            My public profile
          </NavLink>
        </li>
      )}
      <li className="mt-1 border-t border-line pt-1">
        <button
          type="button"
          className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-danger-ink transition hover:bg-danger-soft"
          onClick={async () => {
            onNavigate?.()
            await signOut()
            navigate('/')
          }}
        >
          Log out
        </button>
      </li>
    </ul>
  )
}

function useDisclosure() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [location.pathname, location.search, location.hash])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])
  return { open, setOpen, ref }
}

function AccountMenu() {
  const { profile } = useAuth()
  const { open, setOpen, ref } = useDisclosure()
  const panelId = useId()
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface py-1 pr-3 pl-1 text-sm font-semibold text-ink shadow-card transition hover:border-primary/50"
      >
        <span aria-hidden="true" className="bg-gradient-primary flex size-8 items-center justify-center rounded-lg text-white">
          {profile?.first_name.charAt(0) ?? '?'}
        </span>
        <span>{profile?.first_name ?? 'Account'}</span>
        <span className="sr-only">, account menu</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className={cx('size-4 text-muted transition', open && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div id={panelId} className="animate-fade-up absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-line bg-surface p-2 shadow-lift">
          {profile && (
            <p className="px-3 pt-2 pb-2 text-sm text-muted">
              Signed in as <strong className="text-ink">@{profile.username}</strong>
            </p>
          )}
          <nav aria-label="Account">
            <AccountLinks />
          </nav>
        </div>
      )}
    </div>
  )
}

function MobileMenu() {
  const { userId } = useAuth()
  const { open, setOpen, ref } = useDisclosure()
  const panelId = useId()
  return (
    <div ref={ref} className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-ink"
      >
        <span className="sr-only">Menu</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <div id={panelId} className="animate-fade-up absolute inset-x-0 top-full z-30 border-b border-line bg-surface px-4 pt-4 pb-5 shadow-lift">
          <HeaderSearch onSubmitted={() => setOpen(false)} />
          <nav aria-label="Main" className="mt-3 grid grid-cols-2 gap-2">
            <LinkButton to="/skills" variant="secondary">
              Discover
            </LinkButton>
            <LinkButton to="/people" variant="secondary">
              People for you
            </LinkButton>
            <LinkButton to="/offers/new" className="col-span-2">
              Teach a skill
            </LinkButton>
          </nav>
          <nav aria-label="Account" className="mt-4 border-t border-line pt-3">
            {userId ? (
              <AccountLinks onNavigate={() => setOpen(false)} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <LinkButton to="/login" variant="secondary">
                  Log in
                </LinkButton>
                <LinkButton to="/register">Get started</LinkButton>
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  )
}

function Header() {
  const { userId, initialising } = useAuth()
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface-glass backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center lg:flex">
          <NavLink to="/skills" className={navLink}>
            Discover
          </NavLink>
          <NavLink to="/people" className={navLink}>
            People
          </NavLink>
          <Link to="/#how-it-works" className={navLink({ isActive: false })}>
            How it works
          </Link>
        </nav>
        <div className="hidden max-w-xs flex-1 md:block">
          <HeaderSearch />
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden md:block">
            <LinkButton to="/offers/new" variant="secondary">
              Teach a skill
            </LinkButton>
          </div>
          <ThemeToggle />
          <RequestsBadge />
          <div className="hidden md:block">
            {initialising ? null : userId ? (
              <AccountMenu />
            ) : (
              <div className="flex gap-2">
                <LinkButton to="/login" variant="ghost">
                  Log in
                </LinkButton>
                <LinkButton to="/register">Get started</LinkButton>
              </div>
            )}
          </div>
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}

export function Layout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  // Move focus to the new page's heading on navigation, for screen-reader and keyboard users.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    window.scrollTo(0, 0)
    const h1 = mainRef.current?.querySelector('h1')
    if (h1 instanceof HTMLElement) h1.focus({ preventScroll: true })
  }, [location.pathname, location.hash])

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only-focusable absolute top-2 left-2 z-50 rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary"
      >
        Skip to content
      </a>
      <Header />
      {!supabaseConfigured && (
        <p role="alert" className="bg-warn-soft px-4 py-2 text-center text-sm text-warn-ink">
          Supabase is not configured. Copy <code>.env.example</code> to <code>.env</code> and fill in the URL and anon key.
        </p>
      )}
      <main id="main" ref={mainRef} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        <Outlet />
      </main>
      <footer className="mt-12 border-t border-line bg-surface-glass backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-2 text-sm text-muted">Neighbours teaching neighbours, free of charge. Times are shown in Bratislava time.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-1 text-sm">
            <Link to="/skills" className="inline-flex min-h-11 items-center text-muted no-underline hover:text-ink">
              Discover skills
            </Link>
            <Link to="/offers/new" className="inline-flex min-h-11 items-center text-muted no-underline hover:text-ink">
              Teach a skill
            </Link>
            <Link to="/people" className="inline-flex min-h-11 items-center text-muted no-underline hover:text-ink">
              People for you
            </Link>
            <Link to="/#how-it-works" className="inline-flex min-h-11 items-center text-muted no-underline hover:text-ink">
              How it works
            </Link>
            <Link to="/account#settings" className="inline-flex min-h-11 items-center text-muted no-underline hover:text-ink">
              Settings
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
