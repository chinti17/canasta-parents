import { describe, expect, it } from 'vitest'
import {
  createSession,
  dispatch,
  isBotTurn,
  isHumanTurn,
  nextSeat,
  turnOrder,
} from './session'

describe('turn order', () => {
  it('wraps around the table', () => {
    expect(nextSeat(0, 6)).toBe(1)
    expect(nextSeat(5, 6)).toBe(0)
  })

  it('lists seats in play order from a start seat', () => {
    expect(turnOrder(0, 6)).toEqual([0, 1, 2, 3, 4, 5])
    expect(turnOrder(4, 6)).toEqual([4, 5, 0, 1, 2, 3])
  })
})

describe('session reducer', () => {
  it('starts a fresh game with zeroed scores at seat 0', () => {
    const s = createSession(1)
    expect(s.roundNumber).toBe(0)
    expect(s.over).toBe(false)
    expect(s.scores).toEqual([0, 0, 0])
    expect(s.round.currentSeat).toBe(0)
    expect(isHumanTurn(s)).toBe(true)
    expect(isBotTurn(s)).toBe(false)
  })

  it('lets the human draw on their turn', () => {
    const s = createSession(1) // human is seat 0, and seat 0 starts
    const next = dispatch(s, {
      type: 'PLAYER_ACTION',
      action: { type: 'DRAW_STOCK' },
    })
    expect(next.round.phase).toBe('action')
    expect(next.round.currentSeat).toBe(0)
  })

  it('ignores a player action when it is not the human seat', () => {
    const s = createSession(1, undefined, 1) // human is seat 1, seat 0 starts
    const next = dispatch(s, {
      type: 'PLAYER_ACTION',
      action: { type: 'DRAW_STOCK' },
    })
    expect(next).toBe(s) // unchanged
  })

  it('ignores a bot step while it is the human turn', () => {
    const s = createSession(1) // human seat 0 is up
    expect(dispatch(s, { type: 'BOT_STEP' })).toBe(s)
  })

  it('plays a bot turn and passes play onward', () => {
    const s = createSession(1, undefined, 1) // human seat 1; seat 0 (a bot) is up
    const next = dispatch(s, { type: 'BOT_STEP' })
    expect(next).not.toBe(s)
    // Seat 0's turn is done; play has reached the human at seat 1.
    expect(next.round.currentSeat).toBe(1)
    expect(isHumanTurn(next)).toBe(true)
  })

  it('ignores an illegal player action (no-op)', () => {
    const s = createSession(1)
    // Discarding before drawing is illegal in the draw phase.
    const handCard = s.round.players[0]!.hand[0]!
    const next = dispatch(s, {
      type: 'PLAYER_ACTION',
      action: { type: 'DISCARD', cardId: handCard.id },
    })
    expect(next).toBe(s)
  })
})

describe('round flow', () => {
  /** A session paused between rounds (round over, game not over). */
  const betweenRounds = () => {
    const s = createSession(1)
    return {
      ...s,
      round: { ...s.round, over: true },
      scores: [120, 30, 0],
    }
  }

  it('deals the next round on NEXT_ROUND, carrying scores forward', () => {
    const next = dispatch(betweenRounds(), { type: 'NEXT_ROUND' })
    expect(next.roundNumber).toBe(1)
    expect(next.round.over).toBe(false)
    expect(next.round.phase).toBe('draw')
    // Cumulative scores carry into the new round's teams (drives meld minimums).
    expect(next.round.teams.map((t) => t.score)).toEqual([120, 30, 0])
    expect(next.lastRoundResult).toBeUndefined()
  })

  it('ignores NEXT_ROUND while a round is still in progress', () => {
    const s = createSession(1)
    expect(dispatch(s, { type: 'NEXT_ROUND' })).toBe(s)
  })

  it('ignores play events during the between-rounds pause', () => {
    const paused = betweenRounds()
    expect(dispatch(paused, { type: 'BOT_STEP' })).toBe(paused)
  })

  it('starts a fresh game on NEW_GAME, preserving config and human seat', () => {
    // human is seat 2, so seat 0 is a bot — advance the game a little first.
    const played = dispatch(createSession(1, undefined, 2), {
      type: 'BOT_STEP',
    })
    const fresh = dispatch(played, { type: 'NEW_GAME', seed: 99 })
    expect(fresh.seed).toBe(99)
    expect(fresh.roundNumber).toBe(0)
    expect(fresh.over).toBe(false)
    expect(fresh.scores).toEqual([0, 0, 0])
    expect(fresh.humanSeat).toBe(2)
    expect(fresh.round.phase).toBe('draw')
  })
})
