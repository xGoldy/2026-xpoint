// People recommender: suggests members to swap skills with, based on what each
// person can teach and wants to learn. Like match.ts it is one pure module with
// no database access, and the same factor values produce both the score and
// the explanation.
import { formatSlot, intersectSlots, totalMinutes, type WeeklySlot } from './availability'
import { reputationValue, type Level } from './match'

export const RECOMMEND_WEIGHTS = {
  teachesYou: 35,
  learnsFromYou: 25,
  area: 15,
  time: 15,
  reputation: 10,
} as const

export type RecommendFactorKey = keyof typeof RECOMMEND_WEIGHTS

export const RECOMMEND_LABELS: Record<RecommendFactorKey, string> = {
  teachesYou: 'Can teach you',
  learnsFromYou: 'Wants to learn from you',
  area: 'Same area',
  time: 'Shared free time',
  reputation: 'Reputation',
}

/** Weekly minutes of shared free time that count as a full match. */
export const FULL_OVERLAP_MINUTES = 120

export interface PersonSkill {
  skillId: string
  skillName: string
  level: Level | null
}

export interface Member {
  id: string
  localityId: string
  localityName: string
  teach: PersonSkill[]
  learn: PersonSkill[]
  availability: WeeklySlot[]
}

export interface Candidate extends Member {
  username: string
  firstName: string
  lastName: string
  pointsTotal: number
  ratingCount: number
}

export type Relationship = 'swap' | 'teacher' | 'learner'

export interface RecommendFactor {
  key: RecommendFactorKey
  label: string
  weight: number
  value: number
  contribution: number
  reason: string
}

export interface Recommendation<T extends Candidate = Candidate> {
  person: T
  relationship: Relationship
  /** Skills they teach that you want to learn. */
  theyTeach: PersonSkill[]
  /** Skills they want to learn that you teach. */
  theyLearn: PersonSkill[]
  score: number
  factors: RecommendFactor[]
  topReasons: RecommendFactor[]
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function listNames(skills: PersonSkill[]): string {
  const names = skills.map((s) => s.skillName).sort()
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Skills in `offered` whose id appears in `wanted`. */
export function overlap(offered: PersonSkill[], wanted: PersonSkill[]): PersonSkill[] {
  const ids = new Set(wanted.map((s) => s.skillId))
  return offered.filter((s) => ids.has(s.skillId)).sort((a, b) => a.skillName.localeCompare(b.skillName))
}

/** One shared skill is worth 0.75; two or more are worth the full weight. */
export const skillValue = (count: number) => (count === 0 ? 0 : count === 1 ? 0.75 : 1)

function factor(key: RecommendFactorKey, value: number, reason: string): RecommendFactor {
  const weight = RECOMMEND_WEIGHTS[key]
  const v = clamp01(value)
  return { key, label: RECOMMEND_LABELS[key], weight, value: v, contribution: Math.round(weight * v), reason }
}

/** Scores one person for one member, or returns null when no skill connects them. */
export function recommendPerson<T extends Candidate>(me: Member, person: T): Recommendation<T> | null {
  if (person.id === me.id) return null
  const theyTeach = overlap(person.teach, me.learn)
  const theyLearn = overlap(person.learn, me.teach)
  if (theyTeach.length === 0 && theyLearn.length === 0) return null

  const relationship: Relationship = theyTeach.length && theyLearn.length ? 'swap' : theyTeach.length ? 'teacher' : 'learner'

  const shared = intersectSlots(me.availability, person.availability)
  const minutes = totalMinutes(shared)
  const longest = [...shared].sort((a, b) => b.end - b.start - (a.end - a.start) || a.weekday - b.weekday)[0]

  const factors = [
    factor(
      'teachesYou',
      skillValue(theyTeach.length),
      theyTeach.length ? `Teaches ${listNames(theyTeach)}, which you want to learn` : 'Does not teach what you want to learn',
    ),
    factor(
      'learnsFromYou',
      skillValue(theyLearn.length),
      theyLearn.length ? `Wants to learn ${listNames(theyLearn)}, which you teach` : 'Does not want to learn what you teach',
    ),
    factor(
      'area',
      person.localityId === me.localityId ? 1 : 0,
      person.localityId === me.localityId ? `Also in ${me.localityName}` : `Lives in ${person.localityName}`,
    ),
    factor(
      'time',
      minutes / FULL_OVERLAP_MINUTES,
      me.availability.length === 0
        ? 'Add your weekly availability to compare times'
        : minutes > 0
          ? `You are both free ${formatSlot(longest)}${shared.length > 1 ? ` and ${shared.length - 1} more time${shared.length > 2 ? 's' : ''} a week` : ''}`
          : 'No shared free time yet',
    ),
    factor(
      'reputation',
      reputationValue(person.pointsTotal, person.ratingCount),
      person.ratingCount ? `${person.pointsTotal} points from ${person.ratingCount} learner${person.ratingCount === 1 ? '' : 's'}` : 'No ratings yet',
    ),
  ]
  const score = factors.reduce((sum, f) => sum + f.contribution, 0)
  const topReasons = factors
    .filter((f) => f.contribution > 0 && f.key !== 'reputation')
    .sort((a, b) => b.contribution - a.contribution || b.weight - a.weight)
    .slice(0, 3)
  return { person, relationship, theyTeach, theyLearn, score, factors, topReasons }
}

const RELATIONSHIP_RANK: Record<Relationship, number> = { swap: 0, teacher: 1, learner: 2 }

/** Ranks by score, then swaps before one-way matches, then points, then name. */
export function compareRecommendations(a: Recommendation, b: Recommendation): number {
  if (a.score !== b.score) return b.score - a.score
  if (a.relationship !== b.relationship) return RELATIONSHIP_RANK[a.relationship] - RELATIONSHIP_RANK[b.relationship]
  if (a.person.pointsTotal !== b.person.pointsTotal) return b.person.pointsTotal - a.person.pointsTotal
  const an = `${a.person.firstName} ${a.person.lastName}`
  const bn = `${b.person.firstName} ${b.person.lastName}`
  return an.localeCompare(bn) || a.person.id.localeCompare(b.person.id)
}

export function recommendPeople<T extends Candidate>(me: Member, people: T[]): Recommendation<T>[] {
  return people
    .map((p) => recommendPerson(me, p))
    .filter((r): r is Recommendation<T> => r !== null)
    .sort(compareRecommendations)
}
