import { describe, expect, it } from 'vitest'
import type { Card } from './cards'
import {
  canastaType,
  countCanastas,
  isCanasta,
  meldPointValue,
  validateMeldCards,
} from './melds'
import type { Meld } from './types'

// Test helpers ---------------------------------------------------------------
let n = 0
const card = (rank: Card['rank'], suit?: Card['suit']): Card => ({
  id: `c${n++}`,
  rank,
  suit,
})
const k = (suit: Card['suit']) => card('K', suit)
const joker = () => card('JOKER')
const two = (suit: Card['suit']) => card('2', suit)

describe('validateMeldCards', () => {
  it('accepts three naturals of one rank', () => {
    expect(validateMeldCards([k('clubs'), k('hearts'), k('spades')])).toEqual({
      ok: true,
      rank: 'K',
    })
  })

  it('accepts naturals plus up to three wilds', () => {
    const res = validateMeldCards([k('clubs'), k('hearts'), joker(), two('spades')])
    expect(res.ok).toBe(true)
    expect(res.rank).toBe('K')
  })

  it('rejects fewer than 3 cards', () => {
    expect(validateMeldCards([k('clubs'), k('hearts')]).ok).toBe(false)
  })

  it('rejects more than 3 wilds', () => {
    const res = validateMeldCards([
      k('clubs'),
      k('hearts'),
      joker(),
      joker(),
      two('clubs'),
      two('spades'),
    ])
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/3 wild/)
  })

  it('rejects fewer than 2 naturals', () => {
    const res = validateMeldCards([k('clubs'), joker(), two('spades')])
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/2 natural/)
  })

  it('rejects mixed natural ranks', () => {
    const res = validateMeldCards([k('clubs'), k('hearts'), card('Q', 'spades')])
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/share a rank/)
  })

  it('rejects red 3s', () => {
    const res = validateMeldCards([
      card('3', 'hearts'),
      card('3', 'diamonds'),
      card('3', 'hearts'),
    ])
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/red 3/)
  })

  it('accepts a pure black-3 meld and flags it', () => {
    const res = validateMeldCards([
      card('3', 'clubs'),
      card('3', 'spades'),
      card('3', 'clubs'),
    ])
    expect(res.ok).toBe(true)
    expect(res.isBlackThreeMeld).toBe(true)
    expect(res.rank).toBe('3')
  })

  it('rejects wilds in a black-3 meld', () => {
    const res = validateMeldCards([
      card('3', 'clubs'),
      card('3', 'spades'),
      joker(),
    ])
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/black 3/)
  })
})

describe('meldPointValue', () => {
  it('sums pip values including wilds', () => {
    // K(10) + K(10) + joker(50) = 70
    expect(meldPointValue([k('clubs'), k('hearts'), joker()])).toBe(70)
  })
})

describe('canastas', () => {
  const meld = (cards: Card[]): Meld => ({ rank: 'K', cards })

  it('detects a natural canasta (7 cards, no wilds)', () => {
    const m = meld([
      k('clubs'),
      k('hearts'),
      k('spades'),
      k('diamonds'),
      k('clubs'),
      k('hearts'),
      k('spades'),
    ])
    expect(isCanasta(m)).toBe(true)
    expect(canastaType(m)).toBe('natural')
  })

  it('detects a mixed canasta (7 cards incl. a wild)', () => {
    const m = meld([
      k('clubs'),
      k('hearts'),
      k('spades'),
      k('diamonds'),
      k('clubs'),
      k('hearts'),
      joker(),
    ])
    expect(canastaType(m)).toBe('mixed')
  })

  it('returns null for a meld under 7 cards', () => {
    expect(canastaType(meld([k('clubs'), k('hearts'), k('spades')]))).toBeNull()
  })

  it('counts canastas across a team’s melds', () => {
    const big = meld([
      k('clubs'),
      k('hearts'),
      k('spades'),
      k('diamonds'),
      k('clubs'),
      k('hearts'),
      k('spades'),
    ])
    const small = meld([k('clubs'), k('hearts'), k('spades')])
    expect(countCanastas([big, small, big])).toBe(2)
  })
})
