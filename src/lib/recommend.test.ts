import { describe, expect, it } from 'vitest'
import {
  compareRecommendations,
  RECOMMEND_WEIGHTS,
  recommendPeople,
  recommendPerson,
  skillValue,
  type Candidate,
  type Member,
  type PersonSkill,
} from './recommend'

const skill = (name: string): PersonSkill => ({ skillId: name.toLowerCase(), skillName: name, level: null })

const me: Member = {
  id: 'me',
  localityId: 'ba',
  localityName: 'Bratislava',
  teach: [skill('Guitar')],
  learn: [skill('Spanish'), skill('Yoga')],
  availability: [{ weekday: 1, start: 18 * 60, end: 21 * 60 }], // Tue 18:00–21:00
}

const person = (over: Partial<Candidate> = {}): Candidate => ({
  id: 'p',
  username: 'p',
  firstName: 'Pat',
  lastName: 'Doe',
  localityId: 'ba',
  localityName: 'Bratislava',
  teach: [],
  learn: [],
  availability: [],
  pointsTotal: 0,
  ratingCount: 0,
  ...over,
})

describe('recommendPerson', () => {
  it('ignores yourself and people with no skill in common', () => {
    expect(recommendPerson(me, person({ id: 'me', teach: [skill('Spanish')] }))).toBeNull()
    expect(recommendPerson(me, person({ teach: [skill('Chess')], learn: [skill('Piano')] }))).toBeNull()
  })

  it('labels the relationship', () => {
    expect(recommendPerson(me, person({ teach: [skill('Spanish')], learn: [skill('Guitar')] }))!.relationship).toBe('swap')
    expect(recommendPerson(me, person({ teach: [skill('Spanish')] }))!.relationship).toBe('teacher')
    expect(recommendPerson(me, person({ learn: [skill('Guitar')] }))!.relationship).toBe('learner')
  })

  it('values one shared skill at 0.75 and two or more at 1', () => {
    expect([0, 1, 2, 3].map(skillValue)).toEqual([0, 0.75, 1, 1])
    const r = recommendPerson(me, person({ teach: [skill('Spanish'), skill('Yoga')] }))!
    expect(r.factors.find((f) => f.key === 'teachesYou')).toMatchObject({
      value: 1,
      contribution: 35,
      reason: 'Teaches Spanish and Yoga, which you want to learn',
    })
  })

  it('scores a nearby mutual swap with shared time', () => {
    const r = recommendPerson(
      me,
      person({
        teach: [skill('Spanish')],
        learn: [skill('Guitar')],
        availability: [{ weekday: 1, start: 17 * 60, end: 20 * 60 }], // shared Tue 18:00–20:00 = 120 min
      }),
    )!
    // 35 × 0.75 = 26, 25 × 0.75 = 19, area 15, time 15, reputation round(10 × 0.7) = 7
    expect(r.factors.map((f) => f.contribution)).toEqual([26, 19, 15, 15, 7])
    expect(r.score).toBe(82)
    expect(r.theyTeach.map((s) => s.skillName)).toEqual(['Spanish'])
    expect(r.theyLearn.map((s) => s.skillName)).toEqual(['Guitar'])
    expect(r.topReasons.map((f) => f.reason)).toEqual([
      'Teaches Spanish, which you want to learn',
      'Wants to learn Guitar, which you teach',
      'Also in Bratislava',
    ])
  })

  it('gives no area or time points when far away and never free together', () => {
    const r = recommendPerson(
      me,
      person({ learn: [skill('Guitar')], localityId: 'tt', localityName: 'Trnava', availability: [{ weekday: 3, start: 600, end: 700 }] }),
    )!
    expect(r.factors.find((f) => f.key === 'area')).toMatchObject({ value: 0, reason: 'Lives in Trnava' })
    expect(r.factors.find((f) => f.key === 'time')).toMatchObject({ value: 0, reason: 'No shared free time yet' })
  })

  it('weights add up to 100', () => {
    expect(Object.values(RECOMMEND_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100)
  })
})

describe('recommendPeople ordering', () => {
  it('sorts by score, then swaps first, then points, then name', () => {
    const swap = person({ id: 'swap', firstName: 'Zed', teach: [skill('Spanish')], learn: [skill('Guitar')] })
    const teacherFar = person({ id: 'far', teach: [skill('Spanish')], localityId: 'tt', localityName: 'Trnava' })
    const learner = person({ id: 'learner', learn: [skill('Guitar')] })
    const none = person({ id: 'none', teach: [skill('Chess')] })
    expect(recommendPeople(me, [teacherFar, none, learner, swap]).map((r) => r.person.id)).toEqual(['swap', 'learner', 'far'])
  })

  it('breaks equal scores by relationship, then points, then name', () => {
    const base = { score: 50, factors: [], topReasons: [], theyTeach: [], theyLearn: [] }
    const a = { ...base, relationship: 'teacher' as const, person: person({ id: 'a', firstName: 'Ann', pointsTotal: 9 }) }
    const b = { ...base, relationship: 'swap' as const, person: person({ id: 'b', firstName: 'Bob', pointsTotal: 1 }) }
    const c = { ...base, relationship: 'teacher' as const, person: person({ id: 'c', firstName: 'Cid', pointsTotal: 20 }) }
    const d = { ...base, relationship: 'teacher' as const, person: person({ id: 'd', firstName: 'Abe', pointsTotal: 9 }) }
    expect([a, b, c, d].sort(compareRecommendations).map((r) => r.person.id)).toEqual(['b', 'c', 'd', 'a'])
  })
})
