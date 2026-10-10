import { addDaysToKey, fromMinutes, localDateKey, localParts, localToUtc, toMinutes, weekdayOfKey, WEEKDAYS_SHORT } from './time'

/** A recurring weekly time window in Bratislava wall-clock minutes. Monday is 0. */
export interface WeeklySlot {
  weekday: number
  start: number
  end: number
}

export function slotFromRow(row: { weekday: number; start_time: string; end_time: string }): WeeklySlot {
  return { weekday: row.weekday, start: toMinutes(row.start_time), end: toMinutes(row.end_time) }
}

export function formatSlot(slot: WeeklySlot): string {
  return `${WEEKDAYS_SHORT[slot.weekday]} ${fromMinutes(slot.start)}–${fromMinutes(slot.end)}`
}

/** Windows when both people are free, sorted by weekday and start. */
export function intersectSlots(a: WeeklySlot[], b: WeeklySlot[]): WeeklySlot[] {
  const result: WeeklySlot[] = []
  for (const x of a) {
    for (const y of b) {
      if (x.weekday !== y.weekday) continue
      const start = Math.max(x.start, y.start)
      const end = Math.min(x.end, y.end)
      if (end > start) result.push({ weekday: x.weekday, start, end })
    }
  }
  return result.sort((p, q) => p.weekday - q.weekday || p.start - q.start)
}

export const totalMinutes = (slots: WeeklySlot[]) => slots.reduce((sum, s) => sum + (s.end - s.start), 0)

/** True when [startsAt, endsAt] lies inside one slot, on a single local day. */
export function fitsInSlots(startsAt: string | Date, endsAt: string | Date, slots: WeeklySlot[]): boolean {
  const s = localParts(startsAt)
  const e = localParts(endsAt)
  if (s.year !== e.year || s.month !== e.month || s.day !== e.day) return false
  const start = s.hour * 60 + s.minute
  const end = e.hour * 60 + e.minute
  return slots.some((slot) => slot.weekday === s.weekday && slot.start <= start && slot.end >= end)
}

/**
 * Concrete start times in the next `days` days at which a session of
 * `durationMin` fits inside the shared windows. Starts are on the hour or
 * half hour, at most `perWindow` per window, all later than `now`.
 */
export function suggestStartTimes(
  shared: WeeklySlot[],
  durationMin: number,
  now: Date,
  days = 14,
  perWindow = 2,
): Date[] {
  const today = localDateKey(now)
  const result: Date[] = []
  for (let i = 0; i < days; i++) {
    const key = addDaysToKey(today, i)
    const weekday = weekdayOfKey(key)
    for (const w of shared.filter((s) => s.weekday === weekday)) {
      let count = 0
      for (let t = Math.ceil(w.start / 30) * 30; t + durationMin <= w.end && count < perWindow; t += 60) {
        const at = localToUtc(key, fromMinutes(t))
        if (at.getTime() > now.getTime()) {
          result.push(at)
          count++
        }
      }
    }
  }
  return result
}
