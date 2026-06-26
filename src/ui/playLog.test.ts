import { describe, expect, it } from 'vitest'
import type { Card } from '../engine/cards'
import type { Meld, RoundState, TeamState } from '../engine/types'
import { summarizePlay } from './playLog'

let n = 0
const card = (rank: Card['rank'], suit?: Card['suit']): Card => ({
  id: `c${n++}`,
  rank,
  suit,
})

function round(o: {
  hand?: Card[]
  melds?: Meld[]
  redThrees?: Card[]
  discard?: Card[]
  over?: boolean
  wentOutSeat?: number
}): RoundState {
  const team: TeamState = {
    id: 0,
    seats: [0],
    melds: o.melds ?? [],
    redThrees: o.redThrees ?? [],
    hasMelded: (o.melds?.length ?? 0) > 0,
    score: 0,
  }
  return {
    players: [{ seat: 0, teamId: 0, hand: o.hand ?? [] }],
    teams: [team],
    stock: [],
    discard: { cards: o.discard ?? [], frozen: false },
    currentSeat: 0,
    phase: 'action',
    tookDiscard: false,
    turnStartHasMelded: [team.hasMelded],
    over: o.over ?? false,
    wentOutSeat: o.wentOutSeat,
  }
}

describe('summarizePlay', () => {
  it('reports a draw when the hand grew with nothing else', () => {
    const before = round({ hand: [card('5', 'clubs')] })
    const after = round({ hand: [card('5', 'clubs'), card('9', 'hearts')] })
    expect(summarizePlay(before, after)?.parts).toEqual([{ text: 'drew' }])
  })

  it('reports melded cards', () => {
    const kings = [card('K', 'clubs'), card('K', 'hearts'), card('K', 'spades')]
    const before = round({ hand: kings })
    const after = round({ melds: [{ rank: 'K', cards: kings }] })
    const entry = summarizePlay(before, after)
    expect(entry?.parts[0]!.text).toBe('melded')
    expect(entry?.parts[0]!.cards).toHaveLength(3)
  })

  it('reports a discard via the new top card', () => {
    const disc = card('8', 'diamonds')
    const before = round({ discard: [card('9', 'hearts')] })
    const after = round({ discard: [card('9', 'hearts'), disc] })
    expect(summarizePlay(before, after)?.parts).toEqual([
      { text: 'discarded', cards: [disc] },
    ])
  })

  it('reports taking the whole pile', () => {
    const before = round({ discard: [card('9', 'hearts'), card('9', 'clubs')] })
    const after = round({ discard: [] })
    expect(summarizePlay(before, after)?.parts[0]!.text).toBe(
      'took the pile (2)',
    )
  })

  it('reports going out', () => {
    const before = round({ discard: [card('9', 'hearts')] })
    const after = round({
      discard: [card('9', 'hearts'), card('5', 'spades')],
      over: true,
      wentOutSeat: 0,
    })
    const texts = summarizePlay(before, after)?.parts.map((p) => p.text)
    expect(texts).toContain('went out!')
  })

  it('returns null when nothing notable changed', () => {
    const before = round({ hand: [card('5', 'clubs')] })
    const after = round({ hand: [card('5', 'clubs')] })
    expect(summarizePlay(before, after)).toBeNull()
  })
})
