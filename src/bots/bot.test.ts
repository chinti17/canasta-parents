import { describe, expect, it } from 'vitest'
import { apply } from '../engine/actions'
import type { Card, Suit } from '../engine/cards'
import { createRound } from '../engine/rounds'
import {
  DEFAULT_CONFIG,
  type RoundState,
  type TeamState,
} from '../engine/types'
import { chooseTurn, playTurn } from './bot'
import {
  discardScore,
  keepValue,
  opponentDiscardRisk,
  opponentTeams,
} from './heuristics'
import { layoffPlan, naturalNewMelds, takePileOptions } from './moves'

let n = 0
const card = (rank: Card['rank'], suit?: Suit): Card => ({
  id: `c${n++}`,
  rank,
  suit,
})
const SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']
const many = (rank: Card['rank'], count: number): Card[] =>
  Array.from({ length: count }, (_, i) => card(rank, SUITS[i % 4]))

function team(
  id: number,
  hasMelded: boolean,
  melds: TeamState['melds'] = [],
): TeamState {
  return { id, seats: [id], melds, redThrees: [], hasMelded, score: 0 }
}

function makeRound(opts: {
  players: RoundState['players']
  teams: TeamState[]
  stock?: Card[]
  discard?: RoundState['discard']
  currentSeat?: number
}): RoundState {
  return {
    players: opts.players,
    teams: opts.teams,
    stock: opts.stock ?? [],
    discard: opts.discard ?? { cards: [], frozen: false },
    currentSeat: opts.currentSeat ?? 0,
    phase: 'draw',
    tookDiscard: false,
    turnStartHasMelded: opts.teams.map((t) => t.hasMelded),
    over: false,
  }
}

function totalCards(round: RoundState): number {
  let total = round.stock.length + round.discard.cards.length
  for (const p of round.players) total += p.hand.length
  for (const t of round.teams) {
    total += t.redThrees.length
    for (const m of t.melds) total += m.cards.length
  }
  return total
}

describe('move enumeration', () => {
  it('finds natural melds of 3+, skipping wilds and melded ranks', () => {
    const hand = [...many('K', 3), card('2'), ...many('A', 2)]
    const melds = naturalNewMelds(hand, team(0, false))
    expect(melds).toHaveLength(1)
    expect(melds[0]!.rank).toBe('K')
    expect(melds[0]!.cards).toHaveLength(3)
  })

  it('does not propose a new meld for a rank the team already melds', () => {
    const t = team(0, true, [{ rank: 'K', cards: many('K', 5) }])
    expect(naturalNewMelds(many('K', 3), t)).toHaveLength(0)
  })

  it('lays off a matching natural onto an existing meld', () => {
    const t = team(0, true, [{ rank: 'K', cards: many('K', 5) }])
    const k = card('K', 'clubs')
    const plan = layoffPlan([k, card('7', 'spades')], t)
    expect(plan).toEqual([{ targetRank: 'K', cardIds: [k.id] }])
  })

  it('offers a take-pile meld when the top matches two naturals', () => {
    const top = card('5', 'spades')
    const a = card('5', 'clubs')
    const b = card('5', 'hearts')
    const round = makeRound({
      players: [{ seat: 0, teamId: 0, hand: [a, b] }],
      teams: [team(0, true)],
      discard: { cards: [card('9', 'hearts'), top], frozen: false },
    })
    const options = takePileOptions(round, round.teams[0]!, [a, b])
    expect(options).toHaveLength(1)
    expect(options[0]!.withCardIds).toEqual([a.id, b.id])
  })

  it('refuses to take a pile topped by a wild or black 3', () => {
    const wildTop = makeRound({
      players: [{ seat: 0, teamId: 0, hand: [] }],
      teams: [team(0, true)],
      discard: { cards: [card('2', 'clubs')], frozen: true },
    })
    expect(takePileOptions(wildTop, wildTop.teams[0]!, [])).toHaveLength(0)

    const black3Top = makeRound({
      players: [{ seat: 0, teamId: 0, hand: [] }],
      teams: [team(0, true)],
      discard: { cards: [card('3', 'spades')], frozen: false },
    })
    expect(takePileOptions(black3Top, black3Top.teams[0]!, [])).toHaveLength(0)
  })
})

describe('heuristics', () => {
  const round = makeRound({
    players: [{ seat: 0, teamId: 0, hand: [] }],
    teams: [
      team(0, true),
      team(1, true, [{ rank: 'K', cards: many('K', 3) }]),
      team(2, false),
    ],
    discard: { cards: [], frozen: false },
  })

  it('exposes every opponent team, not a single merged one', () => {
    expect(opponentTeams(round, 0).map((t) => t.id)).toEqual([1, 2])
  })

  it('rates a card riskier when an opponent melds that rank', () => {
    const kingRisk = opponentDiscardRisk(card('K', 'clubs'), round, 0)
    const nineRisk = opponentDiscardRisk(card('9', 'clubs'), round, 0)
    expect(kingRisk).toBeGreaterThan(nineRisk)
  })

  it('treats a black 3 as safe to discard', () => {
    expect(opponentDiscardRisk(card('3', 'spades'), round, 0)).toBe(0)
  })

  it('values keeping a wild far above a lone low card', () => {
    const hand = [card('2'), card('4', 'clubs')]
    expect(keepValue(hand[0]!, hand, team(0, true))).toBeGreaterThan(
      keepValue(hand[1]!, hand, team(0, true)),
    )
  })

  it('discards the least useful, least dangerous card', () => {
    const hand = [card('2'), card('4', 'clubs'), card('3', 'spades')]
    const t = team(0, true)
    const scores = hand.map((c) => discardScore(c, hand, round, t))
    const lowest = hand[scores.indexOf(Math.min(...scores))]!
    expect(lowest.rank).toBe('3') // the black 3 — safe and useless to keep
  })
})

describe('turn decisions', () => {
  it('is deterministic: same state yields the same actions', () => {
    const round = createRound(7)
    expect(chooseTurn(round)).toEqual(chooseTurn(round))
  })

  it('returns a fully legal turn that ends with the seat advancing', () => {
    const round = createRound(7)
    const actions = chooseTurn(round)
    expect(actions.length).toBeGreaterThan(0)

    let cur = round
    for (const action of actions) {
      const result = apply(cur, action)
      expect(result.ok).toBe(true)
      if (result.ok) cur = result.round
    }
    // The turn either ended the round or passed play to the next seat.
    expect(cur.over || cur.currentSeat !== round.currentSeat).toBe(true)
    expect(totalCards(cur)).toBe(totalCards(round))
  })

  it('takes a worthwhile discard pile instead of drawing', () => {
    const fives = [card('5', 'clubs'), card('5', 'hearts')]
    const hand = [...fives, card('8', 'diamonds'), card('8', 'spades')]
    const round = makeRound({
      players: [
        { seat: 0, teamId: 0, hand },
        { seat: 1, teamId: 1, hand: [card('6', 'clubs')] },
      ],
      teams: [team(0, true), team(1, true)],
      stock: [card('Q', 'diamonds')],
      discard: {
        cards: [card('9', 'hearts'), card('4', 'clubs'), card('5', 'spades')],
        frozen: false,
      },
    })
    const actions = chooseTurn(round)
    expect(actions[0]!.type).toBe('TAKE_PILE')
  })

  it('goes out when the hand can be emptied with two canastas down', () => {
    const round = makeRound({
      players: [
        { seat: 0, teamId: 0, hand: many('Q', 3) },
        { seat: 1, teamId: 1, hand: [card('6', 'clubs')] },
      ],
      teams: [
        team(0, true, [
          { rank: 'A', cards: many('A', 7) },
          { rank: 'K', cards: many('K', 7) },
        ]),
        team(1, true),
      ],
      stock: [card('Q', 'spades')],
      discard: { cards: [card('7', 'clubs')], frozen: false },
    })
    const end = playTurn(round, DEFAULT_CONFIG)
    expect(end.over).toBe(true)
    expect(end.wentOutSeat).toBe(0)
  })
})
