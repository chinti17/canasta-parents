import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../engine/types'
import { runHeadlessGame } from './runner'

describe('headless game runner', () => {
  it.each([1, 2, 3])('plays a full game start to win (seed %i)', (seed) => {
    const result = runHeadlessGame(seed, { validate: true })
    expect(result.session.over).toBe(true)
    expect(result.rounds).toBeGreaterThan(0)
    expect(result.winningTeam).toBeGreaterThanOrEqual(0)
    expect(result.winningTeam).toBeLessThan(DEFAULT_CONFIG.numTeams)
    // The winner really holds the top cumulative score, at or past target.
    const top = Math.max(...result.scores)
    expect(result.scores[result.winningTeam]).toBe(top)
    expect(top).toBeGreaterThanOrEqual(DEFAULT_CONFIG.targetScore)
  })

  it('completes regardless of which seat the human occupies', () => {
    for (
      let humanSeat = 0;
      humanSeat < DEFAULT_CONFIG.numPlayers;
      humanSeat++
    ) {
      const result = runHeadlessGame(42, { humanSeat, validate: true })
      expect(result.session.over).toBe(true)
    }
  })
})
