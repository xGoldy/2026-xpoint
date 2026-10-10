// Search autocomplete: ranks catalogue skills and categories for a typed query.
// Pure and synchronous; the catalogue is small, so it is filtered in the browser.

export interface SkillEntry {
  id: string
  name: string
  category_id: string
  category_name: string
  active_offer_count: number
  teacher_count: number
}

export interface CategoryEntry {
  id: string
  name: string
}

/** Character range of the match inside the name, for highlighting. */
export type MatchRange = [start: number, end: number] | null

export type Suggestion =
  | { kind: 'skill'; skill: SkillEntry; match: MatchRange }
  | { kind: 'category'; category: CategoryEntry; match: MatchRange }

/** Lower case without accents, so "kavá" finds "Kava" and the other way round. */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** 0 = name starts with the query, 1 = a word starts with it, 2 = contains it, null = no match. */
export function matchRank(name: string, query: string): { rank: 0 | 1 | 2; match: MatchRange } | null {
  const q = normalize(query.trim())
  if (!q) return null
  const n = normalize(name)
  const at = n.indexOf(q)
  if (at === -1) return null
  if (at === 0) return { rank: 0, match: [0, q.length] }
  const wordStart = n.search(new RegExp(`(^|[\\s\\-/(])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  if (wordStart !== -1) {
    const start = wordStart === 0 ? 0 : wordStart + 1
    return { rank: 1, match: [start, start + q.length] }
  }
  return { rank: 2, match: [at, at + q.length] }
}

export const POPULAR_LIMIT = 5

/**
 * Suggestions for a query: best-matching skills (more offers first on ties),
 * then up to two matching categories. An empty query gives popular skills.
 */
export function suggest(skills: SkillEntry[], categories: CategoryEntry[], query: string, limit = 6): Suggestion[] {
  if (!query.trim()) {
    return [...skills]
      .filter((s) => s.active_offer_count > 0)
      .sort((a, b) => b.active_offer_count - a.active_offer_count || a.name.localeCompare(b.name))
      .slice(0, POPULAR_LIMIT)
      .map((skill) => ({ kind: 'skill' as const, skill, match: null }))
  }
  const skillHits = skills
    .map((skill) => ({ skill, hit: matchRank(skill.name, query) }))
    .filter((x): x is { skill: SkillEntry; hit: NonNullable<ReturnType<typeof matchRank>> } => x.hit !== null)
    .sort(
      (a, b) =>
        a.hit.rank - b.hit.rank ||
        b.skill.active_offer_count - a.skill.active_offer_count ||
        a.skill.name.localeCompare(b.skill.name),
    )
    .slice(0, limit)
    .map(({ skill, hit }) => ({ kind: 'skill' as const, skill, match: hit.match }))
  const categoryHits = categories
    .map((category) => ({ category, hit: matchRank(category.name, query) }))
    .filter((x) => x.hit !== null)
    .sort((a, b) => a.hit!.rank - b.hit!.rank || a.category.name.localeCompare(b.category.name))
    .slice(0, 2)
    .map(({ category, hit }) => ({ kind: 'category' as const, category, match: hit!.match }))
  return [...skillHits, ...categoryHits]
}

/** Splits a name around the match: [before, matched, after]. */
export function splitMatch(name: string, match: MatchRange): [string, string, string] {
  if (!match) return [name, '', '']
  return [name.slice(0, match[0]), name.slice(match[0], match[1]), name.slice(match[1])]
}
