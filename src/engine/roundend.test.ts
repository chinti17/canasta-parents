import { describe, expect, it } from 'vitest'
import { apply } from './actions'
import type { Card } from './cards'
import type { Meld, RoundState, TeamState } from './types'

let n = 0
const card = (rank: Card['rank'], suit?: Card['suit']): Card => ({
  id: `c${n++}`,
  rank,
  suit,
})

/** Seven cards of one rank => a (natural) canasta. */
function canastaOf(rank: Card['rank']): Meld {
  const suits: Card['suit'][] = [
    'clubs',
    'hearts',
    'spades',
    'diamonds',
    'clubs',
    'hearts',
    'spades',
  ]
  return { rank, cards: suits.map((s) => card(rank, s)) }
}

interface Overrides {
  hand?: Card[]
  melds?: Meld[]
  hasMelded?: boolean
  turnStartHasMelded?: boolean
}

function makeRound(o: Overrides = {}): RoundState {
  const team: TeamState = {
    id: 0,
    seats: [0, 1],
    melds: o.melds ?? [],
    redThrees: [],
    hasMelded: o.hasMelded ?? false,
    score: 0,
  }
  return {
    players: [
      { seat: 0, teamId: 0, hand: o.hand ?? [] },
      { seat: 1, teamId: 0, hand: [] },
    ],
    teams: [team],
    stock: [card('5', 'clubs')],
    discard: { cards: [card('9', 'clubs')], frozen: false },
    currentSeat: 0,
    phase: 'action',
    tookDiscard: false,
    turnStartHasMelded: [o.turnStartHasMelded ?? (o.hasMelded ?? false)],
    over: false,
  }
}

const expectOk = (r: ReturnType<typeof apply>): RoundState => {
  if (!r.ok) throw new Error(`expected ok, got: ${r.reason}`)
  return r.round
}

describe('going out by discard', () => {
  it('ends the round when the team has the required canastas', () => {
    const last = card('9', 'hearts')
    const round = makeRound({
      hand: [last],
      hasMelded: true,
      turnStartHasMelded: true,
      melds: [canastaOf('K'), canastaOf('Q')],
    })
    const next = expectOk(apply(round, { type: 'DISCARD', cardId: last.id }))
    expect(next.over).toBe(true)
    expect(next.wentOutSeat).toBe(0)
    expect(next.wentOutConcealed).toBe(false)
    expect(next.players[0]!.hand).toHaveLength(0)
  })

  it('rejects going out without enough canastas', () => {
    const last = card('9', 'hearts')
    const round = makeRound({
      hand: [last],
      hasMelded: true,
      melds: [canastaOf('K')], // only one canasta
    })
    const r = apply(round, { type: 'DISCARD', cardId: last.id })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toMatch(/2 canastas/)
  })
})

describe('going out by melding (concealed)', () => {
  it('flags a concealed go-out when the team had not melded before', () => {
    // Lay two whole canastas in one turn from a fresh hand, emptying the hand.
    const aces = canastaOf('A').cards
    const kings = canastaOf('K').cards
    const round = makeRound({
      hand: [...aces, ...kings],
      hasMelded: false,
      turnStartHasMelded: false,
    })
    const next = expectOk(
      apply(round, {
        type: 'MELD',
        melds: [aces.map((c) => c.id), kings.map((c) => c.id)],
      }),
    )
    expect(next.over).toBe(true)
    expect(next.wentOutSeat).toBe(0)
    expect(next.wentOutConcealed).toBe(true)
  })
})

describe('black 3s', () => {
  it('can be melded on the turn a player goes out', () => {
    const blacks = [card('3', 'clubs'), card('3', 'spades'), card('3', 'clubs')]
    const round = makeRound({
      hand: blacks,
      hasMelded: true,
      turnStartHasMelded: true,
      melds: [canastaOf('K'), canastaOf('Q')],
    })
    const next = expectOk(
      apply(round, { type: 'MELD', melds: [blacks.map((c) => c.id)] }),
    )
    expect(next.over).toBe(true)
  })

  it('cannot be melded when not going out', () => {
    const blacks = [card('3', 'clubs'), card('3', 'spades'), card('3', 'clubs')]
    const round = makeRound({
      hand: [...blacks, card('9', 'hearts')], // a card remains -> not going out
      hasMelded: true,
      melds: [canastaOf('K'), canastaOf('Q')],
    })
    const r = apply(round, { type: 'MELD', melds: [blacks.map((c) => c.id)] })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toMatch(/black 3/)
  })
})
