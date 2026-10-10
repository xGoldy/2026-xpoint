import { describe, expect, it } from 'vitest'
import { matchRank, normalize, splitMatch, suggest, type CategoryEntry, type SkillEntry } from './autocomplete'

const skill = (name: string, offers = 0, category = 'Other'): SkillEntry => ({
  id: name,
  name,
  category_id: category,
  category_name: category,
  active_offer_count: offers,
  teacher_count: offers,
})

const skills = [
  skill('Spanish', 3, 'Languages'),
  skill('Spanish cooking', 0, 'Cooking'),
  skill('Italian cooking', 1, 'Cooking'),
  skill('Vegan cooking', 0, 'Cooking'),
  skill('Swimming', 2, 'Sports'),
  skill('Web development', 1, 'Technology'),
  skill('Guitar', 3, 'Music'),
  skill('3D printing', 0, 'Technology'),
]
const categories: CategoryEntry[] = [
  { id: 'c', name: 'Cooking' },
  { id: 'm', name: 'Music' },
  { id: 'l', name: 'Languages' },
]

describe('matchRank', () => {
  it('ranks prefix, word start and substring matches', () => {
    expect(matchRank('Spanish', 'spa')).toEqual({ rank: 0, match: [0, 3] })
    expect(matchRank('Italian cooking', 'coo')).toEqual({ rank: 1, match: [8, 11] })
    expect(matchRank('Swimming', 'mm')).toEqual({ rank: 2, match: [3, 5] })
    expect(matchRank('Guitar', 'piano')).toBeNull()
    expect(matchRank('Guitar', '   ')).toBeNull()
  })

  it('ignores case and accents', () => {
    expect(normalize('Kováčová')).toBe('kovacova')
    expect(matchRank('Spanish', 'SPÁ')?.rank).toBe(0)
  })

  it('treats regex characters literally', () => {
    expect(matchRank('3D printing', '3d (')).toBeNull()
    expect(matchRank('C++ basics', 'c++')?.rank).toBe(0)
  })
})

describe('suggest', () => {
  it('orders prefix matches first, more offers first on ties', () => {
    const names = suggest(skills, categories, 'coo').map((s) => (s.kind === 'skill' ? s.skill.name : `[${s.category.name}]`))
    expect(names).toEqual(['Italian cooking', 'Spanish cooking', 'Vegan cooking', '[Cooking]'])
  })

  it('puts the exact prefix before word-start matches', () => {
    const names = suggest(skills, categories, 'spa').map((s) => (s.kind === 'skill' ? s.skill.name : s.category.name))
    expect(names.slice(0, 2)).toEqual(['Spanish', 'Spanish cooking'])
  })

  it('limits skill suggestions', () => {
    expect(suggest(skills, [], 'i', 3)).toHaveLength(3)
  })

  it('shows popular skills with offers for an empty query', () => {
    const names = suggest(skills, categories, '').map((s) => (s.kind === 'skill' ? s.skill.name : ''))
    expect(names).toEqual(['Guitar', 'Spanish', 'Swimming', 'Italian cooking', 'Web development'])
  })

  it('splits names for highlighting', () => {
    expect(splitMatch('Italian cooking', [8, 11])).toEqual(['Italian ', 'coo', 'king'])
    expect(splitMatch('Guitar', null)).toEqual(['Guitar', '', ''])
  })
})
