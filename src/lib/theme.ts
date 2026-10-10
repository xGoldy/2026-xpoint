import { useSyncExternalStore } from 'react'

// Light by default; the viewer can switch to dark or follow the system in Settings.
export type ThemePreference = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'skillswap-theme'
const listeners = new Set<() => void>()
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // Storage can be unavailable (private mode); fall back to the default.
  }
  return 'light'
}

let preference: ThemePreference = typeof window !== 'undefined' ? readPreference() : 'light'

export function resolveTheme(pref: ThemePreference): Theme {
  if (pref === 'system') return media?.matches ? 'dark' : 'light'
  return pref
}

function apply() {
  const theme = resolveTheme(preference)
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  listeners.forEach((l) => l())
}

media?.addEventListener('change', () => preference === 'system' && apply())

export function setThemePreference(next: ThemePreference) {
  preference = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Not persisted, but still applied for this visit.
  }
  apply()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useTheme(): { preference: ThemePreference; theme: Theme; setPreference: (p: ThemePreference) => void } {
  const pref = useSyncExternalStore(subscribe, () => preference)
  return { preference: pref, theme: resolveTheme(pref), setPreference: setThemePreference }
}
