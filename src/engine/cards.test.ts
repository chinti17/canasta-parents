import { describe, expect, it } from 'vitest'
import {
  buildShoe,
  cardValue,
  deal,
  isBlack3,
  isRed3,
  isWild,
  makeRng,
  shuffle,
  type Card,
} from './cards'

describe('buildShoe', () => {
  it('builds 162 cards for the default 3-deck shoe', () => {
    expect(buildShoe()).toHaveLength(162)
  })

  it('contains 6 jokers and 12 of each standard rank', () => {
    const shoe = buildShoe()
    const jokers = shoe.filter((c) => c.rank === 'JOKER')
    const kings = shoe.filter((c) => c.rank === 'K')
    expect(jokers).toHaveLength(6)
    expect(kings).toHaveLength(12) // 4 suits x 3 decks
  })

  it('has 6 red 3s and 6 black 3s', () => {
    const shoe = buildShoe()
    expect(shoe.filter(isRed3)).toHaveLength(6)
    expect(shoe.filter(isBlack3)).toHaveLength(6)
  })

  it('gives every card a unique id', () => {
    const shoe = buildShoe()
    const ids = new Set(shoe.map((c) => c.id))
    expect(ids.size).toBe(shoe.length)
  })
})

describe('classifiers and values', () => {
  const joker: Card = { id: 'j', rank: 'JOKER' }
  const two: Card = { id: 't', rank: '2', suit: 'clubs' }
  const ace: Card = { id: 'a', rank: 'A', suit: 'spades' }
  const redThree: Card = { id: 'r', rank: '3', suit: 'hearts' }
  const blackThree: Card = { id: 'b', rank: '3', suit: 'spades' }

  it('treats jokers and 2s as wild', () => {
    expect(isWild(joker)).toBe(true)
    expect(isWild(two)).toBe(true)
    expect(isWild(ace)).toBe(false)
  })

  it('distinguishes red and black 3s', () => {
    expect(isRed3(redThree)).toBe(true)
    expect(isBlack3(redThree)).toBe(false)
    expect(isBlack3(blackThree)).toBe(true)
    expect(isRed3(blackThree)).toBe(false)
  })

  it('scores pip values correctly', () => {
    expect(cardValue(joker)).toBe(50)
    expect(cardValue(two)).toBe(20)
    expect(cardValue(ace)).toBe(20)
    expect(cardValue({ id: 'k', rank: 'K', suit: 'clubs' })).toBe(10)
    expect(cardValue({ id: '7', rank: '7', suit: 'clubs' })).toBe(5)
    expect(cardValue(blackThree)).toBe(5)
  })
})

describe('shuffle', () => {
  it('is a permutation (same multiset of ids)', () => {
    const shoe = buildShoe()
    const shuffled = shuffle(shoe, makeRng(123))
    expect(shuffled).toHaveLength(shoe.length)
    expect(new Set(shuffled.map((c) => c.id))).toEqual(
      new Set(shoe.map((c) => c.id)),
    )
  })

  it('is deterministic for a given seed', () => {
    const shoe = buildShoe()
    const a = shuffle(shoe, makeRng(42)).map((c) => c.id)
    const b = shuffle(shoe, makeRng(42)).map((c) => c.id)
    const c = shuffle(shoe, makeRng(43)).map((c) => c.id)
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  it('does not mutate the input', () => {
    const shoe = buildShoe()
    const before = shoe.map((c) => c.id)
    shuffle(shoe, makeRng(1))
    expect(shoe.map((c) => c.id)).toEqual(before)
  })
})

describe('deal', () => {
  it('deals 11 cards to each of 6 players plus one discard', () => {
    const shoe = shuffle(buildShoe(), makeRng(7))
    const { hands, stock, discard } = deal(shoe, 6, 11)
    expect(hands).toHaveLength(6)
    for (const hand of hands) expect(hand).toHaveLength(11)
    expect(discard).toHaveLength(1)
    // 162 - (6*11) - 1 = 95 left in stock
    expect(stock).toHaveLength(95)
  })

  it('conserves every card exactly once across hands/stock/discard', () => {
    const shoe = shuffle(buildShoe(), makeRng(99))
    const { hands, stock, discard } = deal(shoe, 6, 11)
    const all = [...hands.flat(), ...stock, ...discard].map((c) => c.id)
    expect(all).toHaveLength(162)
    expect(new Set(all).size).toBe(162)
  })

  it('throws if the shoe cannot cover the deal', () => {
    expect(() => deal(buildShoe().slice(0, 10), 6, 11)).toThrow(/too small/)
  })
})
