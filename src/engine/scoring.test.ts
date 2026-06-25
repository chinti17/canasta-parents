import { describe, expect, it } from 'vitest'
import type { Card } from './cards'
import {
  canastaBonus,
  goOutBonus,
  handPenalty,
  meldCardPoints,
  redThreeBonus,
  scoreRound,
} from './scoring'
import type { Meld, RoundState, TeamState } from './types'

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

// A minimal two-team round used to test penalties, go-out, and totals.
function roundWith(opts: {
  team0Melds?: Meld[]
  team0Hand?: Card[]
  team1Hand?: Card[]
  wentOutSeat?: number
  concealed?: boolean
  team0Melded?: boolean
}): RoundState {
  const t0: TeamState = {
    id: 0,
    seats: [0],
    melds: opts.team0Melds ?? [],
    redThrees: [],
    hasMelded: opts.team0Melded ?? (opts.team0Melds?.length ? true : false),
    score: 0,
  }
  const t1: TeamState = {
    id: 1,
    seats: [1],
    melds: [],
    redThrees: [],
    hasMelded: false,
    score: 0,
  }
  return {
    players: [
      { seat: 0, teamId: 0, hand: opts.team0Hand ?? [] },
      { seat: 1, teamId: 1, hand: opts.team1Hand ?? [] },
    ],
    teams: [t0, t1],
    stock: [],
    discard: { cards: [], frozen: false },
    currentSeat: 0,
    phase: 'draw',
    tookDiscard: false,
    turnStartHasMelded: [false, false],
    over: true,
    wentOutSeat: opts.wentOutSeat,
    wentOutConcealed: opts.concealed,
  }
}

describe('handPenalty', () => {
  it('sums card values left in a team’s hands', () => {
    const round = roundWith({
      team1Hand: [card('K', 'clubs'), card('5', 'hearts'), card('JOKER')],
    })
    expect(handPenalty(round, 1)).toBe(65) // 10 + 5 + 50
    expect(handPenalty(round, 0)).toBe(0)
  })
})

describe('goOutBonus', () => {
  it('awards 100 to the team that went out', () => {
    const round = roundWith({ wentOutSeat: 0 })
    expect(goOutBonus(round, 0)).toBe(100)
    expect(goOutBonus(round, 1)).toBe(0)
  })

  it('awards 200 for a concealed go-out', () => {
    const round = roundWith({ wentOutSeat: 0, concealed: true })
    expect(goOutBonus(round, 0)).toBe(200)
  })

  it('awards nothing if nobody went out', () => {
    const round = roundWith({})
    expect(goOutBonus(round, 0)).toBe(0)
  })
})

describe('scoreRound', () => {
  it('combines melds, canasta, go-out, and hand penalty into a net total', () => {
    const canasta = meld('K', seq('K', 7)) // 70 pts + 500 bonus
    const round = roundWith({
      team0Melds: [canasta],
      team0Melded: true,
      wentOutSeat: 0,
      team1Hand: [card('A', 'spades'), card('A', 'clubs')], // 40 penalty
    })
    const [s0, s1] = scoreRound(round)
    expect(s0).toMatchObject({
      meldPoints: 70,
      canastaBonus: 500,
      goOutBonus: 100,
      handPenalty: 0,
      total: 670,
    })
    expect(s1!.total).toBe(-40)
  })
})
