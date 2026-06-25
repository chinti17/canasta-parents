import { describe, expect, it } from 'vitest'
import { createRound } from '../engine/rounds'
import type { RoundState } from '../engine/types'
import { simulateGame, simulateRound } from './simulate'

function totalCards(round: RoundState): number {
  let total = round.stock.length + round.discard.cards.length
  for (const p of round.players) total += p.hand.length
  for (const t of round.teams) {
    total += t.redThrees.length
    for (const m of t.melds) total += m.cards.length
  }
  return total
}

describe('bot simulation', () => {
  it.each([1, 2, 3, 4, 5])(
    'plays a full round to completion (seed %i)',
    (seed) => {
      const end = simulateRound(createRound(seed))
      expect(end.over).toBe(true)
    },
  )

  it('conserves the 162-card shoe across a simulated round', () => {
    const start = createRound(11)
    const before = totalCards(start)
    const end = simulateRound(start)
    expect(totalCards(end)).toBe(before)
  })

  it('plays full rounds through to a game winner', () => {
    const summary = simulateGame(1)
    expect(summary.rounds).toBeGreaterThan(0)
    expect(summary.winningTeam).toBeGreaterThanOrEqual(0)
    expect(summary.winningTeam).toBeLessThan(DEFAULT_NUM_TEAMS)
    expect(Math.max(...summary.cumulative)).toBeGreaterThanOrEqual(TARGET)
    // The declared winner really is the team with the top score.
    const top = Math.max(...summary.cumulative)
    expect(summary.cumulative[summary.winningTeam]).toBe(top)
  })
})

const DEFAULT_NUM_TEAMS = 3
const TARGET = 5000
