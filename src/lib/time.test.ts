import { describe, expect, it } from 'vitest'
import { fitsInSlots, intersectSlots, suggestStartTimes } from './availability'
import { addDaysToKey, formatDateTime, localParts, localToUtc, weekdayOfKey } from './time'

describe('Bratislava time helpers', () => {
  it('converts local wall time to UTC across daylight saving time', () => {
    expect(localToUtc('2026-10-13', '18:00').toISOString()).toBe('2026-10-13T16:00:00.000Z') // CEST
    expect(localToUtc('2026-11-10', '18:00').toISOString()).toBe('2026-11-10T17:00:00.000Z') // CET
  })

  it('reads local parts with Monday as weekday 0', () => {
    const p = localParts('2026-10-12T22:30:00Z') // Tue 00:30 in Bratislava
    expect(p).toMatchObject({ day: 13, hour: 0, minute: 30, weekday: 1 })
  })

  it('formats in 24-hour time', () => {
    expect(formatDateTime('2026-10-13T16:00:00Z')).toBe('Tue 13 Oct, 18:00')
  })

  it('handles date keys', () => {
    expect(addDaysToKey('2026-10-31', 1)).toBe('2026-11-01')
    expect(weekdayOfKey('2026-10-12')).toBe(0)
    expect(weekdayOfKey('2026-10-18')).toBe(6)
  })
})

describe('availability helpers', () => {
  it('intersects weekly slots', () => {
    expect(
      intersectSlots(
        [{ weekday: 1, start: 1080, end: 1260 }],
        [{ weekday: 1, start: 1020, end: 1200 }, { weekday: 2, start: 0, end: 1440 }],
      ),
    ).toEqual([{ weekday: 1, start: 1080, end: 1200 }])
  })

  it('checks that a session fits inside a slot', () => {
    const slots = [{ weekday: 1, start: 1080, end: 1260 }]
    expect(fitsInSlots('2026-10-13T16:00:00Z', '2026-10-13T17:00:00Z', slots)).toBe(true)
    expect(fitsInSlots('2026-10-13T18:30:00Z', '2026-10-13T19:30:00Z', slots)).toBe(false)
  })

  it('suggests future start times inside shared windows', () => {
    const now = new Date('2026-10-12T08:00:00Z')
    const times = suggestStartTimes([{ weekday: 1, start: 1080, end: 1200 }], 60, now, 8)
    expect(times.map((t) => t.toISOString())).toEqual(['2026-10-13T16:00:00.000Z', '2026-10-13T17:00:00.000Z'])
  })
})
