import { describe, expect, it } from 'vitest'
import { buildIcs, escapeText, foldLine, icsDate } from './ics'

describe('ics', () => {
  it('formats UTC dates', () => {
    expect(icsDate('2026-10-13T16:00:00.000Z')).toBe('20261013T160000Z')
  })

  it('escapes text values', () => {
    expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne')
  })

  it('folds long lines at 75 octets', () => {
    const folded = foldLine(`SUMMARY:${'x'.repeat(100)}`)
    const lines = folded.split('\r\n')
    expect(lines[0]).toHaveLength(75)
    expect(lines[1].startsWith(' ')).toBe(true)
    expect(lines.join('').replace(/ /g, '')).toBe(`SUMMARY:${'x'.repeat(100)}`)
  })

  it('builds a calendar with one event per session', () => {
    const ics = buildIcs(
      [
        { uid: 's1@skillswap', startsAt: '2026-10-13T16:00:00Z', endsAt: '2026-10-13T17:00:00Z', title: 'Spanish, session 1' },
        { uid: 's2@skillswap', startsAt: '2026-10-20T16:00:00Z', endsAt: '2026-10-20T17:00:00Z', title: 'Spanish, session 2', location: 'Online' },
      ],
      new Date('2026-10-10T10:00:00Z'),
    )
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics).toContain('DTSTART:20261013T160000Z')
    expect(ics).toContain('SUMMARY:Spanish\\, session 1')
    expect(ics).toContain('DTSTAMP:20261010T100000Z')
  })
})
