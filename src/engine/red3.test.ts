import { describe, expect, it } from 'vitest'
import { isRed3, type Card } from './cards'
import { createRound } from './rounds'
import { extractRedThrees, meldMinimum } from './red3'

describe('extractRedThrees', () => {
  it('separates red 3s from the rest of the hand', () => {
    const hand: Card[] = [
      { id: 'a', rank: 'K', suit: 'clubs' },
      { id: 'b', rank: '3', suit: 'hearts' },
      { id: 'c', rank: '3', suit: 'spades' }, // black 3 stays
      { id: 'd', rank: '3', suit: 'diamonds' },
    ]
    const { kept, redThrees } = extractRedThrees(hand)
    expect(redThrees.map((c) => c.id)).toEqual(['b', 'd'])
    expect(kept.map((c) => c.id)).toEqual(['a', 'c'])
  })
})

describe('meldMinimum', () => {
  it('uses cumulative-score thresholds', () => {
    expect(meldMinimum(-50)).toBe(15)
    expect(meldMinimum(0)).toBe(50)
    expect(meldMinimum(1495)).toBe(50)
    expect(meldMinimum(1500)).toBe(90)
    expect(meldMinimum(2995)).toBe(90)
    expect(meldMinimum(3000)).toBe(120)
    expect(meldMinimum(9999)).toBe(120)
  })
})

describe('createRound red-3 setup', () => {
  it('leaves no red 3 in any hand and refills hands to 11', () => {
    // Sweep many seeds to exercise hands that were dealt red 3s.
    for (let seed = 0; seed < 50; seed++) {
      const round = createRound(seed)
      for (const p of round.players) {
        expect(p.hand).toHaveLength(11)
        expect(p.hand.some(isRed3)).toBe(false)
      }
    }
  })

  it('conserves all 162 cards across hands, stock, discard and red 3s', () => {
    const round = createRound(17)
    const all = [
      ...round.players.flatMap((p) => p.hand),
      ...round.stock,
      ...round.discard.cards,
      ...round.teams.flatMap((t) => t.redThrees),
    ].map((c) => c.id)
    expect(all).toHaveLength(162)
    expect(new Set(all).size).toBe(162)
  })

  it('places red 3s with the correct team', () => {
    const round = createRound(17)
    for (const team of round.teams) {
      for (const c of team.redThrees) expect(isRed3(c)).toBe(true)
    }
  })
})
