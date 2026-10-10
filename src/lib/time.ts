// All times are stored in UTC and shown in Europe/Bratislava, 24-hour format (NFR-9).
export const TIME_ZONE = 'Europe/Bratislava'

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
})

export interface LocalParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** Monday is 0 */
  weekday: number
}

export function localParts(date: Date | string): LocalParts {
  const d = typeof date === 'string' ? new Date(date) : date
  const parts: Record<string, string> = {}
  for (const p of partsFormatter.formatToParts(d)) parts[p.type] = p.value
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS_SHORT.indexOf(parts.weekday),
  }
}

/** Offset of Bratislava from UTC at the given instant, in minutes. */
function offsetMinutes(date: Date): number {
  const p = localParts(date)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000)
}

/** Converts a Bratislava wall-clock date ('YYYY-MM-DD') and time ('HH:MM') to a UTC instant. */
export function localToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  let result = new Date(guess - offsetMinutes(new Date(guess)) * 60000)
  // Second pass corrects the guess when it straddles a DST change.
  result = new Date(guess - offsetMinutes(result) * 60000)
  return result
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' of the instant in Bratislava. */
export function localDateKey(date: Date | string): string {
  const p = localParts(date)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

export function localTimeKey(date: Date | string): string {
  const p = localParts(date)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/** Adds whole days to a 'YYYY-MM-DD' key. */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** Weekday (Monday is 0) of a 'YYYY-MM-DD' key. */
export function weekdayOfKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

/** Minutes since midnight from 'HH:MM' or 'HH:MM:SS'. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function fromMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const dayHeadingFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "Tue 14 Oct, 18:00" */
export const formatDateTime = (iso: string | Date) => dateTimeFormatter.format(new Date(iso))
/** "Tue 14 Oct 2026" */
export const formatDate = (iso: string | Date) => dateFormatter.format(new Date(iso))
/** "Tuesday 14 October" */
export const formatDayHeading = (iso: string | Date) => dayHeadingFormatter.format(new Date(iso))
/** "18:00" */
export const formatTime = (iso: string | Date) => timeFormatter.format(new Date(iso))

/** "Tue 14 Oct, 18:00–19:30" */
export function formatRange(startIso: string, endIso: string): string {
  return `${formatDateTime(startIso)}–${formatTime(endIso)}`
}
