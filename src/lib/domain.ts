import type { Level, OfferLevel } from './match'

export const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced']
export const OFFER_LEVELS: OfferLevel[] = [...LEVELS, 'all']

export const LEVEL_LABEL: Record<OfferLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all: 'All levels',
}

export type Format = 'one_to_one' | 'class'
export type Mode = 'in_person' | 'online'
export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'

export const FORMAT_LABEL: Record<Format, string> = { one_to_one: '1:1', class: 'Class' }
export const MODE_LABEL: Record<Mode, string> = { in_person: 'In person', online: 'Online' }
export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

export const DURATIONS = [30, 45, 60, 90, 120, 150, 180, 240]

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function fullName(p: { first_name: string | null; last_name: string | null }): string {
  return [p.first_name, p.last_name].filter(Boolean).join(' ')
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Escapes % and _ for ilike patterns. */
export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

export const CATEGORY_ICONS: Record<string, string> = {
  Sports: '🏃',
  Crafts: '🧶',
  Creative: '🎨',
  Languages: '💬',
  Music: '🎸',
  Technology: '💻',
  Cooking: '🍳',
  Other: '✨',
}
