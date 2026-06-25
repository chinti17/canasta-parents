import { describe, expect, it } from 'vitest'
import type { Card } from './cards'
import { canastaBonus, meldCardPoints, redThreeBonus } from './scoring'
import type { Meld, TeamState } from './types'

let n = 0
const card = (rank: Card['rank'], suit?: Card['suit']): Card => ({
  id: `c${n++}`,
  rank,
  suit,
})
const seq = (rank: Card['rank'], count: number): Card[] =>
  Array.from({ length: count }, () => card(rank, 'clubs'))

const meld = (rank: Card['rank'], cards: Card[]): Meld => ({ rank, cards })

describe('meldCardPoints', () => {
  it('sums face values across all melds', () => {
    const melds = [
      meld('K', seq('K', 3)), // 30
      meld('A', [...seq('A', 2), card('JOKER')]), // 20+20+50 = 90
    ]
    expect(meldCardPoints(melds)).toBe(120)
  })
})

describe('canastaBonus', () => {
  it('awards 500 for a natural canasta', () => {
    expect(canastaBonus([meld('K', seq('K', 7))])).toBe(500)
  })

  it('awards 300 for a mixed canasta (with a wild)', () => {
    const cards = [...seq('K', 6), card('2', 'hearts')]
    expect(canastaBonus([meld('K', cards)])).toBe(300)
  })

  it('awards nothing for melds under 7 cards', () => {
    expect(canastaBonus([meld('K', seq('K', 6))])).toBe(0)
  })

  it('sums multiple canastas', () => {
    const natural = meld('K', seq('K', 7))
    const mixed = meld('Q', [...seq('Q', 6), card('JOKER')])
    expect(canastaBonus([natural, mixed])).toBe(800)
  })
})

describe('redThreeBonus', () => {
  const team = (redThrees: number, hasMelded: boolean): TeamState => ({
    id: 0,
    seats: [0],
    melds: [],
    redThrees: Array.from({ length: redThrees }, () => card('3', 'hearts')),
    hasMelded,
    score: 0,
  })

  it('is +100 per red 3 when the team has melded', () => {
    expect(redThreeBonus(team(3, true))).toBe(300)
  })

  it('is negative when the team never melded', () => {
    expect(redThreeBonus(team(2, false))).toBe(-200)
  })

  it('is zero with no red 3s', () => {
    expect(redThreeBonus(team(0, true))).toBe(0)
  })
})
