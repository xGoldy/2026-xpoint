// Matching (Section 6). One pure module: no database access, no clock reads;
// `now` is passed in. The same factor values produce both the score and the
// explanation, so the two can never disagree.
import { fitsInSlots, formatSlot, intersectSlots, totalMinutes, type WeeklySlot } from './availability'

export const MATCH_WEIGHTS = {
  availability: 30,
  level: 25,
  location: 20,
  reputation: 15,
  swap: 10,
} as const

export type FactorKey = keyof typeof MATCH_WEIGHTS
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type OfferLevel = Level | 'all'

export const FACTOR_LABELS: Record<FactorKey, string> = {
  availability: 'Availability',
  level: 'Level',
  location: 'Location',
  reputation: 'Reputation',
  swap: 'Mutual swap',
}

/** Damping for the reputation factor: a new teacher starts at this average. */
export const REPUTATION_PRIOR = { average: 3.5, weight: 3 } as const

export interface NamedSkill {
  id: string
  name: string
}

export interface MatchLearner {
  id: string
  localityId: string
  localityName: string
  /** The learner's level for this skill; null is treated as beginner. */
  level: Level | null
  availability: WeeklySlot[]
  teachSkills: NamedSkill[]
}

export interface MatchSession {
  startsAt: string
  endsAt: string
}

export interface MatchOffer {
  id: string
  teacherId: string
  format: 'one_to_one' | 'class'
  level: OfferLevel
  mode: 'in_person' | 'online'
  localityId: string | null
  localityName: string | null
  sessionDurationMin: number
  createdAt: string
  status: 'active' | 'archived'
  /** Seats left for a class; null for 1:1. */
  seatsLeft: number | null
  /** Scheduled class sessions (1:1 offers have none until a booking is accepted). */
  sessions: MatchSession[]
  teacher: {
    pointsTotal: number
    ratingCount: number
    availability: WeeklySlot[]
    learnSkills: NamedSkill[]
  }
}

export interface Factor {
  key: FactorKey
  label: string
  weight: number
  /** Between 0 and 1. */
  value: number
  /** weight × value, rounded to an integer. */
  contribution: number
  reason: string
}

export interface MatchResult<T extends MatchOffer = MatchOffer> {
  offer: T
  score: number
  factors: Factor[]
  /** Up to three factors with the highest positive contribution (MATCH-5). */
  topReasons: Factor[]
  nextSessionAt: string | null
}

export interface MatchFilters {
  format?: MatchOffer['format'] | null
  mode?: MatchOffer['mode'] | null
}

const LEVEL_STEP: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 }
const LEVEL_PHRASE: Record<Level, string> = {
  beginner: 'a beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function futureSessions(offer: MatchOffer, now: Date): MatchSession[] {
  return offer.sessions
    .filter((s) => new Date(s.startsAt).getTime() > now.getTime())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function availabilityFactor(learner: MatchLearner, offer: MatchOffer, now: Date): Pick<Factor, 'value' | 'reason'> {
  if (learner.availability.length === 0) {
    return { value: 0, reason: 'Add your weekly availability to compare times' }
  }
  if (offer.format === 'class') {
    const upcoming = futureSessions(offer, now)
    if (upcoming.length === 0) return { value: 0, reason: 'No upcoming sessions scheduled' }
    const fit = upcoming.filter((s) => fitsInSlots(s.startsAt, s.endsAt, learner.availability)).length
    if (fit === 0) return { value: 0, reason: 'No overlap with your availability' }
    const noun = upcoming.length === 1 ? 'session fits' : 'sessions fit'
    return { value: fit / upcoming.length, reason: `${fit} of ${upcoming.length} ${noun} your availability` }
  }
  const shared = intersectSlots(learner.availability, offer.teacher.availability)
  const minutes = totalMinutes(shared)
  if (minutes === 0) return { value: 0, reason: 'No overlap with your availability' }
  const longest = [...shared].sort((a, b) => b.end - b.start - (a.end - a.start) || a.weekday - b.weekday)[0]
  const more = shared.length > 1 ? ` and ${shared.length - 1} more time${shared.length > 2 ? 's' : ''} a week` : ''
  return {
    value: clamp01(minutes / (2 * offer.sessionDurationMin)),
    reason: `You are both free ${formatSlot(longest)}${more}`,
  }
}

export function levelFactor(learner: MatchLearner, offer: MatchOffer): Pick<Factor, 'value' | 'reason'> {
  const mine: Level = learner.level ?? 'beginner'
  if (offer.level === 'all') return { value: 1, reason: `Open to all levels, including yours (${mine})` }
  const steps = Math.abs(LEVEL_STEP[offer.level] - LEVEL_STEP[mine])
  if (steps === 0) return { value: 1, reason: `Taught at your level (${mine})` }
  return { value: steps === 1 ? 0.5 : 0, reason: `Aimed at ${offer.level}; you are ${LEVEL_PHRASE[mine]}` }
}

export function locationFactor(learner: MatchLearner, offer: MatchOffer): Pick<Factor, 'value' | 'reason'> {
  if (offer.mode === 'online') return { value: 1, reason: 'Online' }
  if (offer.localityId === learner.localityId) return { value: 1, reason: `In your area (${learner.localityName})` }
  return { value: 0, reason: `In person in ${offer.localityName ?? 'another town'}` }
}

export function reputationValue(pointsTotal: number, ratingCount: number): number {
  const { average, weight } = REPUTATION_PRIOR
  return clamp01(((pointsTotal + weight * average) / (ratingCount + weight)) / 5)
}

export function reputationFactor(offer: MatchOffer): Pick<Factor, 'value' | 'reason'> {
  const { pointsTotal, ratingCount } = offer.teacher
  const value = reputationValue(pointsTotal, ratingCount)
  if (ratingCount === 0) return { value, reason: 'No ratings yet' }
  return { value, reason: `${pointsTotal} points from ${ratingCount} learner${ratingCount === 1 ? '' : 's'}` }
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function swapFactor(learner: MatchLearner, offer: MatchOffer): Pick<Factor, 'value' | 'reason'> {
  const mine = new Set(learner.teachSkills.map((s) => s.id))
  const wanted = offer.teacher.learnSkills.filter((s) => mine.has(s.id)).map((s) => s.name).sort()
  if (wanted.length === 0) return { value: 0, reason: 'No skill swap with you this time' }
  return { value: 1, reason: `You could swap: they want to learn ${listNames(wanted)}, which you teach` }
}

function makeFactor(key: FactorKey, part: Pick<Factor, 'value' | 'reason'>): Factor {
  const weight = MATCH_WEIGHTS[key]
  const value = clamp01(part.value)
  return { key, label: FACTOR_LABELS[key], weight, value, contribution: Math.round(weight * value), reason: part.reason }
}

/** Scores one offer for one learner (MATCH-3). The score is the sum of the factor contributions. */
export function scoreOffer(learner: MatchLearner, offer: MatchOffer, now: Date): Pick<MatchResult, 'score' | 'factors' | 'topReasons'> {
  const factors = [
    makeFactor('availability', availabilityFactor(learner, offer, now)),
    makeFactor('level', levelFactor(learner, offer)),
    makeFactor('location', locationFactor(learner, offer)),
    makeFactor('reputation', reputationFactor(offer)),
    makeFactor('swap', swapFactor(learner, offer)),
  ]
  const score = factors.reduce((sum, f) => sum + f.contribution, 0)
  const topReasons = factors
    .filter((f) => f.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution || b.weight - a.weight)
    .slice(0, 3)
  return { score, factors, topReasons }
}

/** MATCH-2: active offers, not the learner's own, not full, not already booked, matching the filters. */
export function isCandidate(
  offer: MatchOffer,
  learnerId: string,
  openBookingOfferIds: ReadonlySet<string>,
  filters: MatchFilters = {},
): boolean {
  if (offer.status !== 'active') return false
  if (offer.teacherId === learnerId) return false
  if (offer.format === 'class' && (offer.seatsLeft ?? 0) <= 0) return false
  if (openBookingOfferIds.has(offer.id)) return false
  if (filters.format && offer.format !== filters.format) return false
  if (filters.mode && offer.mode !== filters.mode) return false
  return true
}

/** MATCH-4: score, then teacher points, then earliest upcoming session, then oldest offer. */
export function compareResults(a: MatchResult, b: MatchResult): number {
  if (a.score !== b.score) return b.score - a.score
  if (a.offer.teacher.pointsTotal !== b.offer.teacher.pointsTotal) {
    return b.offer.teacher.pointsTotal - a.offer.teacher.pointsTotal
  }
  if (a.nextSessionAt !== b.nextSessionAt) {
    if (a.nextSessionAt === null) return 1
    if (b.nextSessionAt === null) return -1
    return a.nextSessionAt < b.nextSessionAt ? -1 : 1
  }
  if (a.offer.createdAt !== b.offer.createdAt) return a.offer.createdAt < b.offer.createdAt ? -1 : 1
  return a.offer.id < b.offer.id ? -1 : a.offer.id > b.offer.id ? 1 : 0
}

/** Filters, scores and ranks offers for a learner (MATCH-2 to MATCH-4). */
export function rankOffers<T extends MatchOffer>(
  learner: MatchLearner,
  offers: T[],
  openBookingOfferIds: ReadonlySet<string>,
  now: Date,
  filters: MatchFilters = {},
): MatchResult<T>[] {
  return offers
    .filter((o) => isCandidate(o, learner.id, openBookingOfferIds, filters))
    .map((offer) => ({
      offer,
      ...scoreOffer(learner, offer, now),
      nextSessionAt: futureSessions(offer, now)[0]?.startsAt ?? null,
    }))
    .sort(compareResults)
}
