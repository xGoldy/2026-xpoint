import { describe, expect, it } from 'vitest'
import {
  availabilityFactor,
  compareResults,
  isCandidate,
  levelFactor,
  locationFactor,
  MATCH_WEIGHTS,
  rankOffers,
  reputationFactor,
  reputationValue,
  scoreOffer,
  swapFactor,
  type MatchLearner,
  type MatchOffer,
  type MatchResult,
} from './match'

// Monday 12 Oct 2026, 10:00 in Bratislava (UTC+2 until 25 Oct).
const NOW = new Date('2026-10-12T08:00:00Z')

const learner = (over: Partial<MatchLearner> = {}): MatchLearner => ({
  id: 'learner',
  localityId: 'ba',
  localityName: 'Bratislava',
  level: 'beginner',
  availability: [{ weekday: 1, start: 18 * 60, end: 21 * 60 }], // Tue 18:00–21:00
  teachSkills: [{ id: 'guitar', name: 'Guitar' }],
  ...over,
})

const offer = (over: Partial<MatchOffer> = {}): MatchOffer => ({
  id: 'offer',
  teacherId: 'teacher',
  format: 'one_to_one',
  level: 'beginner',
  mode: 'in_person',
  localityId: 'ba',
  localityName: 'Bratislava',
  sessionDurationMin: 60,
  createdAt: '2026-09-01T00:00:00Z',
  status: 'active',
  seatsLeft: null,
  sessions: [],
  ...over,
  teacher: {
    pointsTotal: 0,
    ratingCount: 0,
    availability: [{ weekday: 1, start: 17 * 60, end: 20 * 60 }], // Tue 17:00–20:00
    learnSkills: [],
    ...over.teacher,
  },
})

// Class sessions on Tuesdays, local time.
const tuesdaySession = (date: string, start: string, end: string) => ({
  startsAt: new Date(`${date}T${start}:00+02:00`).toISOString(),
  endsAt: new Date(`${date}T${end}:00+02:00`).toISOString(),
})

describe('availability factor', () => {
  it('1:1 uses shared weekly minutes divided by twice the session length, capped at 1', () => {
    // Shared Tue 18:00–20:00 = 120 min; 120 / (2 × 60) = 1
    expect(availabilityFactor(learner(), offer(), NOW)).toEqual({
      value: 1,
      reason: 'You are both free Tue 18:00–20:00',
    })
    // 120 / (2 × 90) = 0.667
    expect(availabilityFactor(learner(), offer({ sessionDurationMin: 90 }), NOW).value).toBeCloseTo(2 / 3)
  })

  it('1:1 with no overlap is 0', () => {
    const f = availabilityFactor(learner({ availability: [{ weekday: 3, start: 600, end: 700 }] }), offer(), NOW)
    expect(f).toEqual({ value: 0, reason: 'No overlap with your availability' })
  })

  it('mentions further shared windows', () => {
    const f = availabilityFactor(
      learner({ availability: [{ weekday: 1, start: 1080, end: 1260 }, { weekday: 5, start: 600, end: 660 }] }),
      offer({ teacher: { pointsTotal: 0, ratingCount: 0, learnSkills: [], availability: [{ weekday: 1, start: 1020, end: 1200 }, { weekday: 5, start: 540, end: 720 }] } }),
      NOW,
    )
    expect(f.reason).toBe('You are both free Tue 18:00–20:00 and 1 more time a week')
  })

  it('class uses the share of future sessions inside the learner availability', () => {
    const f = availabilityFactor(
      learner(),
      offer({
        format: 'class',
        sessions: [
          tuesdaySession('2026-10-05', '18:00', '19:00'), // past, ignored
          tuesdaySession('2026-10-13', '18:00', '19:00'), // fits
          tuesdaySession('2026-10-20', '18:30', '20:30'), // fits
          { startsAt: '2026-10-27T19:30:00Z', endsAt: '2026-10-27T20:30:00Z' }, // 20:30–21:30 CET, ends after 21:00
          { startsAt: '2026-11-04T17:00:00Z', endsAt: '2026-11-04T18:00:00Z' }, // Wednesday
        ],
      }),
      NOW,
    )
    expect(f).toEqual({ value: 0.5, reason: '2 of 4 sessions fit your availability' })
  })

  it('class with no upcoming sessions is 0', () => {
    expect(availabilityFactor(learner(), offer({ format: 'class', sessions: [] }), NOW)).toEqual({
      value: 0,
      reason: 'No upcoming sessions scheduled',
    })
  })

  it('a learner without availability gets 0 and a hint', () => {
    expect(availabilityFactor(learner({ availability: [] }), offer(), NOW).value).toBe(0)
  })
})

describe('level factor', () => {
  it('is 1 for the same level or an all-levels offer', () => {
    expect(levelFactor(learner(), offer())).toEqual({ value: 1, reason: 'Taught at your level (beginner)' })
    expect(levelFactor(learner({ level: 'advanced' }), offer({ level: 'all' })).value).toBe(1)
  })

  it('is 0.5 one step apart and 0 two steps apart', () => {
    expect(levelFactor(learner(), offer({ level: 'intermediate' }))).toEqual({
      value: 0.5,
      reason: 'Aimed at intermediate; you are a beginner',
    })
    expect(levelFactor(learner(), offer({ level: 'advanced' }))).toEqual({
      value: 0,
      reason: 'Aimed at advanced; you are a beginner',
    })
  })

  it('treats a learner with no level as a beginner', () => {
    expect(levelFactor(learner({ level: null }), offer({ level: 'advanced' })).value).toBe(0)
    expect(levelFactor(learner({ level: null }), offer({ level: 'beginner' })).value).toBe(1)
  })
})

describe('location factor', () => {
  it('is 1 online or in the same locality, 0 elsewhere', () => {
    expect(locationFactor(learner(), offer({ mode: 'online', localityId: null }))).toEqual({ value: 1, reason: 'Online' })
    expect(locationFactor(learner(), offer())).toEqual({ value: 1, reason: 'In your area (Bratislava)' })
    expect(locationFactor(learner(), offer({ localityId: 'tt', localityName: 'Trnava' }))).toEqual({
      value: 0,
      reason: 'In person in Trnava',
    })
  })
})

describe('reputation factor', () => {
  it('starts a new teacher at 3.5 out of 5', () => {
    expect(reputationValue(0, 0)).toBeCloseTo(0.7)
    expect(reputationFactor(offer()).reason).toBe('No ratings yet')
  })

  it('damps a single 5-point rating below a long record', () => {
    const single = reputationValue(5, 1) // (5 + 10.5) / 4 / 5 = 0.775
    const long = reputationValue(42, 9) // (42 + 10.5) / 12 / 5 = 0.875
    expect(single).toBeCloseTo(0.775)
    expect(long).toBeCloseTo(0.875)
    expect(long).toBeGreaterThan(single)
  })

  it('describes points and learners', () => {
    const f = reputationFactor(offer({ teacher: { pointsTotal: 42, ratingCount: 9, availability: [], learnSkills: [] } }))
    expect(f.reason).toBe('42 points from 9 learners')
  })
})

describe('mutual swap factor', () => {
  it('is 1 when the teacher wants to learn a skill the learner teaches', () => {
    const f = swapFactor(
      learner(),
      offer({ teacher: { pointsTotal: 0, ratingCount: 0, availability: [], learnSkills: [{ id: 'guitar', name: 'Guitar' }] } }),
    )
    expect(f).toEqual({ value: 1, reason: 'You could swap: they want to learn Guitar, which you teach' })
  })

  it('is 0 otherwise', () => {
    expect(swapFactor(learner(), offer()).value).toBe(0)
  })
})

describe('scoreOffer', () => {
  it('is the sum of weight × value contributions and lists the top three reasons', () => {
    const r = scoreOffer(learner(), offer(), NOW)
    // availability 30, level 25, location 20, reputation round(15 × 0.7) = 11, swap 0
    expect(r.factors.map((f) => f.contribution)).toEqual([30, 25, 20, 11, 0])
    expect(r.score).toBe(86)
    expect(r.topReasons.map((f) => f.key)).toEqual(['availability', 'level', 'location'])
    expect(r.factors.map((f) => f.weight)).toEqual(Object.values(MATCH_WEIGHTS))
  })

  it('never lists a zero contribution as a reason', () => {
    const r = scoreOffer(
      learner({ availability: [] }),
      offer({ level: 'advanced', localityId: 'tt', localityName: 'Trnava' }),
      NOW,
    )
    expect(r.topReasons.map((f) => f.key)).toEqual(['reputation'])
  })
})

describe('candidates (MATCH-2)', () => {
  const open = new Set(['booked'])
  it('excludes own, archived, full and already booked offers', () => {
    expect(isCandidate(offer(), 'learner', open)).toBe(true)
    expect(isCandidate(offer({ teacherId: 'learner' }), 'learner', open)).toBe(false)
    expect(isCandidate(offer({ status: 'archived' }), 'learner', open)).toBe(false)
    expect(isCandidate(offer({ format: 'class', seatsLeft: 0 }), 'learner', open)).toBe(false)
    expect(isCandidate(offer({ format: 'class', seatsLeft: 2 }), 'learner', open)).toBe(true)
    expect(isCandidate(offer({ id: 'booked' }), 'learner', open)).toBe(false)
  })

  it('applies the format and mode filters', () => {
    expect(isCandidate(offer(), 'learner', open, { format: 'class' })).toBe(false)
    expect(isCandidate(offer(), 'learner', open, { mode: 'online' })).toBe(false)
    expect(isCandidate(offer(), 'learner', open, { format: 'one_to_one', mode: 'in_person' })).toBe(true)
  })
})

describe('tie-breaking (MATCH-4)', () => {
  const result = (over: Partial<MatchOffer>, score: number, nextSessionAt: string | null): MatchResult => ({
    offer: offer(over),
    score,
    factors: [],
    topReasons: [],
    nextSessionAt,
  })

  it('orders by score first', () => {
    const a = result({ id: 'a' }, 80, null)
    const b = result({ id: 'b' }, 90, null)
    expect([a, b].sort(compareResults).map((r) => r.offer.id)).toEqual(['b', 'a'])
  })

  it('then by teacher points total', () => {
    const a = result({ id: 'a', teacher: { pointsTotal: 10, ratingCount: 2, availability: [], learnSkills: [] } }, 80, null)
    const b = result({ id: 'b', teacher: { pointsTotal: 30, ratingCount: 7, availability: [], learnSkills: [] } }, 80, null)
    expect([a, b].sort(compareResults).map((r) => r.offer.id)).toEqual(['b', 'a'])
  })

  it('then by earliest upcoming session, offers without one last', () => {
    const a = result({ id: 'a' }, 80, null)
    const b = result({ id: 'b' }, 80, '2026-10-20T16:00:00Z')
    const c = result({ id: 'c' }, 80, '2026-10-14T16:00:00Z')
    expect([a, b, c].sort(compareResults).map((r) => r.offer.id)).toEqual(['c', 'b', 'a'])
  })

  it('then by offer creation date, oldest first', () => {
    const a = result({ id: 'a', createdAt: '2026-09-10T00:00:00Z' }, 80, null)
    const b = result({ id: 'b', createdAt: '2026-08-10T00:00:00Z' }, 80, null)
    expect([a, b].sort(compareResults).map((r) => r.offer.id)).toEqual(['b', 'a'])
  })

  it('rankOffers filters, scores and sorts', () => {
    const offers = [
      offer({ id: 'far', localityId: 'tt', localityName: 'Trnava' }),
      offer({ id: 'near' }),
      offer({ id: 'mine', teacherId: 'learner' }),
    ]
    const ranked = rankOffers(learner(), offers, new Set(), NOW)
    expect(ranked.map((r) => r.offer.id)).toEqual(['near', 'far'])
    expect(ranked[0].score - ranked[1].score).toBe(MATCH_WEIGHTS.location)
  })
})
