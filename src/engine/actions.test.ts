import { describe, expect, it } from 'vitest'
import { apply, type Action } from './actions'
import type { Card } from './cards'
import type { Meld, RoundState, TeamState } from './types'

// --- builders ---------------------------------------------------------------
let n = 0
const card = (rank: Card['rank'], suit?: Card['suit']): Card => ({
  id: `c${n++}`,
  rank,
  suit,
})

interface RoundOverrides {
  hand?: Card[]
  stock?: Card[]
  discard?: Card[]
  frozen?: boolean
  phase?: 'draw' | 'action'
  melds?: Meld[]
  hasMelded?: boolean
  score?: number
}

/** A 2-seat, 1-team round with seat 0 active — enough to exercise actions. */
function makeRound(o: RoundOverrides = {}): RoundState {
  const team: TeamState = {
    id: 0,
    seats: [0, 1],
    melds: o.melds ?? [],
    redThrees: [],
    hasMelded: o.hasMelded ?? false,
    score: o.score ?? 0,
  }
  return {
    players: [
      { seat: 0, teamId: 0, hand: o.hand ?? [] },
      { seat: 1, teamId: 0, hand: [] },
    ],
    teams: [team],
    stock: o.stock ?? [card('5', 'clubs')],
    discard: { cards: o.discard ?? [card('9', 'clubs')], frozen: o.frozen ?? false },
    currentSeat: 0,
    phase: o.phase ?? 'draw',
    tookDiscard: false,
    over: false,
  }
}

const expectOk = (r: ReturnType<typeof apply>): RoundState => {
  if (!r.ok) throw new Error(`expected ok, got: ${r.reason}`)
  return r.round
}

describe('DRAW_STOCK', () => {
  it('draws the top card and moves to the action phase', () => {
    const round = makeRound({ stock: [card('K', 'clubs')], hand: [] })
    const next = expectOk(apply(round, { type: 'DRAW_STOCK' }))
    expect(next.players[0]!.hand).toHaveLength(1)
    expect(next.phase).toBe('action')
    expect(next.stock).toHaveLength(0)
  })

  it('sets aside a drawn red 3 and draws a replacement', () => {
    // top of stock is the last element -> draw red 3 first, then the King.
    const round = makeRound({
      stock: [card('K', 'clubs'), card('3', 'hearts')],
      hand: [],
    })
    const next = expectOk(apply(round, { type: 'DRAW_STOCK' }))
    expect(next.teams[0]!.redThrees).toHaveLength(1)
    expect(next.players[0]!.hand.map((c) => c.rank)).toEqual(['K'])
  })

  it('rejects drawing twice', () => {
    const round = makeRound({ phase: 'action' })
    expect(apply(round, { type: 'DRAW_STOCK' }).ok).toBe(false)
  })

  it('rejects when the stock is empty', () => {
    const round = makeRound({ stock: [] })
    const r = apply(round, { type: 'DRAW_STOCK' })
    expect(r.ok).toBe(false)
  })
})

describe('MELD', () => {
  it('accepts an initial meld that meets the minimum', () => {
    // three Aces = 60 points, clears the 50 minimum at score 0.
    const hand = [card('A', 'clubs'), card('A', 'hearts'), card('A', 'spades')]
    const round = makeRound({ hand, phase: 'action', score: 0 })
    const next = expectOk(
      apply(round, { type: 'MELD', melds: [hand.map((c) => c.id)] }),
    )
    expect(next.teams[0]!.hasMelded).toBe(true)
    expect(next.teams[0]!.melds[0]!.cards).toHaveLength(3)
    expect(next.players[0]!.hand).toHaveLength(0)
  })

  it('rejects an initial meld below the minimum', () => {
    // three 4s = 15 points, below the 50 minimum at score 0.
    const hand = [card('4', 'clubs'), card('4', 'hearts'), card('4', 'spades')]
    const round = makeRound({ hand, phase: 'action', score: 0 })
    const r = apply(round, { type: 'MELD', melds: [hand.map((c) => c.id)] })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toMatch(/at least 50/)
  })

  it('rejects a second meld of a rank already melded', () => {
    const existing: Meld = {
      rank: 'K',
      cards: [card('K', 'clubs'), card('K', 'hearts'), card('K', 'spades')],
    }
    const hand = [card('K', 'diamonds'), card('K', 'clubs'), card('K', 'hearts')]
    const round = makeRound({
      hand,
      phase: 'action',
      hasMelded: true,
      melds: [existing],
    })
    const r = apply(round, { type: 'MELD', melds: [hand.map((c) => c.id)] })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toMatch(/layoff/)
  })
})

describe('LAYOFF', () => {
  it('adds a matching card to an existing meld', () => {
    const existing: Meld = {
      rank: 'K',
      cards: [card('K', 'clubs'), card('K', 'hearts'), card('K', 'spades')],
    }
    const extra = card('K', 'diamonds')
    const round = makeRound({
      hand: [extra],
      phase: 'action',
      hasMelded: true,
      melds: [existing],
    })
    const next = expectOk(
      apply(round, { type: 'LAYOFF', cardIds: [extra.id], targetRank: 'K' }),
    )
    expect(next.teams[0]!.melds[0]!.cards).toHaveLength(4)
    expect(next.players[0]!.hand).toHaveLength(0)
  })

  it('rejects laying off before the initial meld', () => {
    const round = makeRound({ hand: [card('K', 'clubs')], phase: 'action' })
    const r = apply(round, {
      type: 'LAYOFF',
      cardIds: [round.players[0]!.hand[0]!.id],
      targetRank: 'K',
    })
    expect(r.ok).toBe(false)
  })
})

describe('DISCARD', () => {
  it('moves a card to the pile and advances the turn', () => {
    const c = card('9', 'hearts')
    const round = makeRound({ hand: [c, card('5', 'spades')], phase: 'action' })
    const next = expectOk(apply(round, { type: 'DISCARD', cardId: c.id }))
    expect(next.discard.cards[next.discard.cards.length - 1]!.id).toBe(c.id)
    expect(next.currentSeat).toBe(1)
    expect(next.phase).toBe('draw')
  })

  it('freezes the pile when a wild card is discarded', () => {
    const w = card('2', 'hearts')
    const round = makeRound({ hand: [w, card('5', 'spades')], phase: 'action' })
    const next = expectOk(apply(round, { type: 'DISCARD', cardId: w.id }))
    expect(next.discard.frozen).toBe(true)
  })

  it('rejects discarding your last card (going out comes later)', () => {
    const c = card('9', 'hearts')
    const round = makeRound({ hand: [c], phase: 'action' })
    expect(apply(round, { type: 'DISCARD', cardId: c.id }).ok).toBe(false)
  })
})

describe('TAKE_PILE', () => {
  it('takes an unfrozen pile by melding the top with two naturals', () => {
    const top = card('K', 'clubs')
    const h1 = card('K', 'hearts')
    const h2 = card('K', 'spades')
    const round = makeRound({
      hand: [h1, h2, card('5', 'diamonds')],
      discard: [card('4', 'clubs'), top],
      hasMelded: true,
      score: 0,
    })
    const action: Action = {
      type: 'TAKE_PILE',
      withCardIds: [h1.id, h2.id],
    }
    const next = expectOk(apply(round, action))
    expect(next.discard.cards).toHaveLength(0)
    expect(next.teams[0]!.melds[0]!.rank).toBe('K')
    expect(next.teams[0]!.melds[0]!.cards).toHaveLength(3)
    // the buried 4 came into the hand; the 5 stayed
    expect(next.players[0]!.hand.map((c) => c.rank).sort()).toEqual(['4', '5'])
    expect(next.tookDiscard).toBe(true)
  })

  it('rejects taking a pile topped by a black 3', () => {
    const round = makeRound({ discard: [card('3', 'spades')], hasMelded: true })
    const r = apply(round, { type: 'TAKE_PILE', withCardIds: [] })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toMatch(/black 3/)
  })

  it('rejects a frozen pile taken with only one natural plus a wild', () => {
    const top = card('K', 'clubs')
    const h1 = card('K', 'hearts')
    const wild = card('2', 'spades')
    const round = makeRound({
      hand: [h1, wild],
      discard: [card('4', 'clubs'), top],
      frozen: true,
      hasMelded: true,
    })
    const r = apply(round, {
      type: 'TAKE_PILE',
      withCardIds: [h1.id, wild.id],
    })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toMatch(/two natural/)
  })

  it('does not mutate the input round', () => {
    const top = card('K', 'clubs')
    const h1 = card('K', 'hearts')
    const h2 = card('K', 'spades')
    const round = makeRound({
      hand: [h1, h2],
      discard: [card('4', 'clubs'), top],
      hasMelded: true,
    })
    const before = JSON.stringify(round)
    apply(round, { type: 'TAKE_PILE', withCardIds: [h1.id, h2.id] })
    expect(JSON.stringify(round)).toBe(before)
  })
})
