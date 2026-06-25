import { describe, expect, it } from 'vitest'
import type { Card, Suit } from '../engine/cards'
import { createRound } from '../engine/rounds'
import {
  DEFAULT_CONFIG,
  type RoundState,
  type TeamState,
} from '../engine/types'
import {
  initialUiState,
  layoffTargets,
  meldHint,
  reduceUi,
  type UiState,
} from './controller'

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

function actionRound(hand: Card[], teams: TeamState[]): RoundState {
  return {
    players: [{ seat: 0, teamId: 0, hand }],
    teams,
    stock: [card('8', 'spades')],
    discard: { cards: [card('9', 'hearts')], frozen: false },
    currentSeat: 0,
    phase: 'action',
    tookDiscard: false,
    turnStartHasMelded: teams.map((t) => t.hasMelded),
    over: false,
  }
}

const sel = (...ids: string[]): UiState => ({
  selected: ids,
  feedback: null,
  confirmingGoOut: null,
})

describe('selection', () => {
  it('toggles a card on and off and clears feedback', () => {
    const start: UiState = {
      selected: [],
      feedback: 'oops',
      confirmingGoOut: null,
    }
    const round = createRound(1)
    const added = reduceUi(round, DEFAULT_CONFIG, start, {
      type: 'TOGGLE_CARD',
      cardId: 'x',
    })
    expect(added.ui.selected).toEqual(['x'])
    expect(added.ui.feedback).toBeNull()
    expect(added.action).toBeNull()

    const removed = reduceUi(round, DEFAULT_CONFIG, added.ui, {
      type: 'TOGGLE_CARD',
      cardId: 'x',
    })
    expect(removed.ui.selected).toEqual([])
  })
})

describe('draw phase', () => {
  it('emits DRAW_STOCK and resets the ui', () => {
    const round = createRound(1) // seat 0, draw phase
    const r = reduceUi(round, DEFAULT_CONFIG, sel('a', 'b'), {
      type: 'DRAW_STOCK',
    })
    expect(r.action).toEqual({ type: 'DRAW_STOCK' })
    expect(r.ui).toEqual(initialUiState)
  })

  it('emits a chosen take-pile option', () => {
    const fives = [card('5', 'clubs'), card('5', 'hearts')]
    const round: RoundState = {
      players: [
        { seat: 0, teamId: 0, hand: [...fives, card('8', 'diamonds')] },
      ],
      teams: [team(0, true)],
      stock: [card('8', 'spades')],
      discard: {
        cards: [card('9', 'hearts'), card('5', 'spades')],
        frozen: false,
      },
      currentSeat: 0,
      phase: 'draw',
      tookDiscard: false,
      turnStartHasMelded: [true],
      over: false,
    }
    const option = {
      type: 'TAKE_PILE' as const,
      withCardIds: fives.map((c) => c.id),
      additionalMelds: [],
    }
    const r = reduceUi(round, DEFAULT_CONFIG, sel(), {
      type: 'TAKE_PILE',
      option,
    })
    expect(r.action).toEqual(option)
  })
})

describe('action phase', () => {
  it('discards exactly one selected card', () => {
    const hand = [card('5', 'clubs'), card('6', 'diamonds')]
    const round = actionRound(hand, [team(0, true)])
    const r = reduceUi(round, DEFAULT_CONFIG, sel(hand[0]!.id), {
      type: 'DISCARD_SELECTED',
    })
    expect(r.action).toEqual({ type: 'DISCARD', cardId: hand[0]!.id })
    expect(r.ui).toEqual(initialUiState)
  })

  it('refuses to discard unless exactly one card is selected', () => {
    const hand = [card('5', 'clubs'), card('6', 'diamonds')]
    const round = actionRound(hand, [team(0, true)])
    const none = reduceUi(round, DEFAULT_CONFIG, sel(), {
      type: 'DISCARD_SELECTED',
    })
    expect(none.action).toBeNull()
    expect(none.ui.feedback).toBeTruthy()
    const two = reduceUi(round, DEFAULT_CONFIG, sel(hand[0]!.id, hand[1]!.id), {
      type: 'DISCARD_SELECTED',
    })
    expect(two.action).toBeNull()
    expect(two.ui.feedback).toBeTruthy()
  })

  it('melds a valid selected set', () => {
    const kings = many('K', 3)
    const hand = [...kings, card('5', 'clubs'), card('6', 'diamonds')]
    const round = actionRound(hand, [team(0, true)])
    const r = reduceUi(round, DEFAULT_CONFIG, sel(...kings.map((c) => c.id)), {
      type: 'MELD_SELECTED',
    })
    expect(r.action).toEqual({ type: 'MELD', melds: [kings.map((c) => c.id)] })
  })

  it('surfaces the engine reason for an invalid meld', () => {
    const hand = [card('5', 'clubs'), card('6', 'diamonds')]
    const round = actionRound(hand, [team(0, true)])
    const r = reduceUi(round, DEFAULT_CONFIG, sel(...hand.map((c) => c.id)), {
      type: 'MELD_SELECTED',
    })
    expect(r.action).toBeNull()
    expect(r.ui.feedback).toMatch(/at least 3 cards/)
  })

  it('lays off onto an existing meld, or reports when it fits none', () => {
    const k = card('K', 'clubs')
    const hand = [k, card('7', 'spades'), card('8', 'hearts')]
    const round = actionRound(hand, [
      team(0, true, [{ rank: 'K', cards: many('K', 5) }]),
    ])
    const ok = reduceUi(round, DEFAULT_CONFIG, sel(k.id), {
      type: 'LAYOFF_SELECTED',
    })
    expect(ok.action).toEqual({
      type: 'LAYOFF',
      cardIds: [k.id],
      targetRank: 'K',
    })

    const miss = reduceUi(round, DEFAULT_CONFIG, sel(hand[1]!.id), {
      type: 'LAYOFF_SELECTED',
    })
    expect(miss.action).toBeNull()
    expect(miss.ui.feedback).toMatch(/extend/)
  })

  it('reports an illegal action (drawing after the draw phase)', () => {
    const round = actionRound(
      [card('5', 'clubs'), card('6', 'hearts')],
      [team(0, true)],
    )
    const r = reduceUi(round, DEFAULT_CONFIG, initialUiState, {
      type: 'DRAW_STOCK',
    })
    expect(r.action).toBeNull()
    expect(r.ui.feedback).toMatch(/already drawn/)
  })
})

describe('go-out confirmation', () => {
  const goOutRound = () =>
    actionRound(many('Q', 3), [
      team(0, true, [
        { rank: 'A', cards: many('A', 7) },
        { rank: 'K', cards: many('K', 7) },
      ]),
    ])

  it('holds a round-ending action for confirmation, then emits on confirm', () => {
    const round = goOutRound()
    const queens = round.players[0]!.hand.map((c) => c.id)

    const pending = reduceUi(round, DEFAULT_CONFIG, sel(...queens), {
      type: 'MELD_SELECTED',
    })
    expect(pending.action).toBeNull() // not emitted yet
    expect(pending.ui.confirmingGoOut).toEqual({
      type: 'MELD',
      melds: [queens],
    })
    expect(pending.ui.feedback).toMatch(/ends the round/i)

    const confirmed = reduceUi(round, DEFAULT_CONFIG, pending.ui, {
      type: 'CONFIRM_GO_OUT',
    })
    expect(confirmed.action).toEqual({ type: 'MELD', melds: [queens] })
    expect(confirmed.ui).toEqual(initialUiState)
  })

  it('cancels a pending go-out', () => {
    const round = goOutRound()
    const queens = round.players[0]!.hand.map((c) => c.id)
    const pending = reduceUi(round, DEFAULT_CONFIG, sel(...queens), {
      type: 'MELD_SELECTED',
    })
    const cancelled = reduceUi(round, DEFAULT_CONFIG, pending.ui, {
      type: 'CANCEL_GO_OUT',
    })
    expect(cancelled.ui.confirmingGoOut).toBeNull()
    expect(cancelled.action).toBeNull()
  })
})

describe('hints', () => {
  it('flags an invalid selection and clears for a valid meld', () => {
    const kings = many('K', 3)
    const hand = [...kings, card('5', 'clubs')]
    const round = actionRound(hand, [team(0, true)])
    expect(meldHint(round, DEFAULT_CONFIG, [hand[3]!.id])).toMatch(/at least 3/)
    expect(
      meldHint(
        round,
        DEFAULT_CONFIG,
        kings.map((c) => c.id),
      ),
    ).toBeNull()
  })

  it('lists the team meld ranks as layoff targets', () => {
    const round = actionRound(
      [card('5', 'clubs')],
      [
        team(0, true, [
          { rank: 'K', cards: many('K', 3) },
          { rank: 'A', cards: many('A', 3) },
        ]),
      ],
    )
    expect(layoffTargets(round)).toEqual(['K', 'A'])
  })
})
