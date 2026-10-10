import { useTheme, type ThemePreference } from '../lib/theme'
import { cx, RadioGroup } from './ui'

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

/** Quick light/dark switch in the header. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setPreference } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cx(
        'inline-flex size-11 items-center justify-center rounded-xl text-muted transition hover:bg-primary-soft hover:text-primary-ink',
        className,
      )}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

/** Settings: Appearance. */
export function AppearanceSetting() {
  const { preference, setPreference } = useTheme()
  return (
    <RadioGroup<ThemePreference>
      legend="Theme"
      name="theme"
      value={preference}
      onChange={setPreference}
      options={[
        { value: 'light', label: 'Light', hint: 'Bright background (default)' },
        { value: 'dark', label: 'Dark', hint: 'Easier on the eyes at night' },
        { value: 'system', label: 'System', hint: 'Follow your device setting' },
      ]}
    />
  )
}
