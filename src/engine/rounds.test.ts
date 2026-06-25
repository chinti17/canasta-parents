import { describe, expect, it } from 'vitest'
import { createGame, createRound, buildTeams } from './rounds'
import { DEFAULT_CONFIG, teamOfSeat } from './types'

describe('teamOfSeat', () => {
  it('interleaves 6 seats into 3 teams so partners sit apart', () => {
    expect([0, 1, 2, 3, 4, 5].map((s) => teamOfSeat(s, 3))).toEqual([
      0, 1, 2, 0, 1, 2,
    ])
  })
})

describe('buildTeams', () => {
  it('creates 3 teams each holding two seats', () => {
    const teams = buildTeams(6, 3)
    expect(teams).toHaveLength(3)
    expect(teams[0]!.seats).toEqual([0, 3])
    expect(teams[1]!.seats).toEqual([1, 4])
    expect(teams[2]!.seats).toEqual([2, 5])
  })

  it('seeds cumulative scores when provided', () => {
    const teams = buildTeams(6, 3, [100, 0, 250])
    expect(teams.map((t) => t.score)).toEqual([100, 0, 250])
  })
})

describe('createRound', () => {
  it('seats 6 players with 11 cards each on the right teams', () => {
    const round = createRound(1)
    expect(round.players).toHaveLength(6)
    for (const p of round.players) expect(p.hand).toHaveLength(11)
    expect(round.players.map((p) => p.teamId)).toEqual([0, 1, 2, 0, 1, 2])
  })

  it('starts on seat 0 in the draw phase with an unfinished round', () => {
    const round = createRound(1)
    expect(round.currentSeat).toBe(0)
    expect(round.phase).toBe('draw')
    expect(round.over).toBe(false)
    expect(round.tookDiscard).toBe(false)
  })

  it('has one card in the discard pile and a non-empty stock', () => {
    const round = createRound(1)
    expect(round.discard.cards).toHaveLength(1)
    // Base stock minus replacements drawn for red 3s laid down at setup.
    const redThrees = round.teams.reduce((n, t) => n + t.redThrees.length, 0)
    const base = DEFAULT_CONFIG.numDecks * 54 - 6 * 11 - 1
    expect(round.stock.length).toBe(base - redThrees)
  })

  it('is deterministic for a given seed', () => {
    const a = createRound(123)
    const b = createRound(123)
    expect(a.players[0]!.hand.map((c) => c.id)).toEqual(
      b.players[0]!.hand.map((c) => c.id),
    )
  })
})

describe('createGame', () => {
  it('wraps a round at round number 0 with default config', () => {
    const game = createGame(5)
    expect(game.roundNumber).toBe(0)
    expect(game.over).toBe(false)
    expect(game.config).toEqual(DEFAULT_CONFIG)
    expect(game.round.players).toHaveLength(6)
  })
})
