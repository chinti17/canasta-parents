import { describe, expect, it } from 'vitest'
import { apply, type Action } from './actions'
import type { Card } from './cards'
import { createRound } from './rounds'
import type { RoundState, TeamState } from './types'

let n = 0
const card = (rank: Card['rank'], suit?: Card['suit']): Card => ({
  id: `c${n++}`,
  rank,
  suit,
})

/** Total cards visible anywhere in the round — must stay constant. */
function totalCards(round: RoundState): number {
  let total = round.stock.length + round.discard.cards.length
  for (const p of round.players) total += p.hand.length
  for (const t of round.teams) {
    total += t.redThrees.length
    for (const m of t.melds) total += m.cards.length
  }
  return total
}

const expectOk = (r: ReturnType<typeof apply>): RoundState => {
  if (!r.ok) throw new Error(`expected ok, got: ${r.reason}`)
  return r.round
}

describe('end-to-end turn flow', () => {
  it('drives draw -> meld -> discard -> go out with cards conserved', () => {
    const aces = Array.from({ length: 7 }, (_, i) =>
      card('A', (['clubs', 'hearts', 'spades', 'diamonds'] as const)[i % 4]),
    )
    const kings = Array.from({ length: 7 }, (_, i) =>
      card('K', (['clubs', 'hearts', 'spades', 'diamonds'] as const)[i % 4]),
    )
    const team0: TeamState = {
      id: 0,
      seats: [0],
      melds: [],
      redThrees: [],
      hasMelded: false,
      score: 0,
    }
    const team1: TeamState = {
      id: 1,
      seats: [1],
      melds: [],
      redThrees: [],
      hasMelded: false,
      score: 0,
    }
    let round: RoundState = {
      players: [
        { seat: 0, teamId: 0, hand: [...aces, ...kings] },
        { seat: 1, teamId: 1, hand: [card('6', 'clubs')] },
      ],
      teams: [team0, team1],
      stock: [card('8', 'spades')],
      discard: { cards: [card('9', 'hearts')], frozen: false },
      currentSeat: 0,
      phase: 'draw',
      tookDiscard: false,
      turnStartHasMelded: [false, false],
      over: false,
    }

    const start = totalCards(round)

    const run = (action: Action) => {
      round = expectOk(apply(round, action))
      expect(totalCards(round)).toBe(start) // conserved after every action
    }

    // Draw from stock (now 15 cards in hand).
    run({ type: 'DRAW_STOCK' })
    expect(round.phase).toBe('action')

    // Lay both canastas in one meld action (initial meld well over minimum).
    run({
      type: 'MELD',
      melds: [aces.map((c) => c.id), kings.map((c) => c.id)],
    })
    expect(round.teams[0]!.melds).toHaveLength(2)
    expect(round.teams[0]!.hasMelded).toBe(true)

    // One card remains — discard it to go out (team has two canastas).
    const last = round.players[0]!.hand[0]!
    run({ type: 'DISCARD', cardId: last.id })

    expect(round.over).toBe(true)
    expect(round.wentOutSeat).toBe(0)
  })

  it('advances the turn after a normal draw + discard', () => {
    const round = createRound(3)
    const afterDraw = expectOk(apply(round, { type: 'DRAW_STOCK' }))
    const handCard = afterDraw.players[0]!.hand[0]!
    const afterDiscard = expectOk(
      apply(afterDraw, { type: 'DISCARD', cardId: handCard.id }),
    )
    expect(afterDiscard.currentSeat).toBe(1)
    expect(afterDiscard.phase).toBe('draw')
  })
})
