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
