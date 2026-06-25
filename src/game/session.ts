// Game orchestration: the turn loop tying the engine, scoring and bots into a
// single session that runs from the first deal to a game winner.
//
// This is a pure reducer — `dispatch(session, event) => session` — so the UI
// can drive it straight through React's `useReducer` with no extra state
// library, and the headless runner can drive the very same transitions. The
// engine stays the single source of truth; we only add round-to-round flow.

import { apply, type Action } from '../engine/actions'
import { createRound } from '../engine/rounds'
import { finishRound, type RoundResult } from '../engine/scoring'
import {
  DEFAULT_CONFIG,
  type GameConfig,
  type RoundState,
} from '../engine/types'
import { playTurn } from '../bots/bot'

/** Turn order is ascending seats, wrapping around the table. */
export function nextSeat(seat: number, numPlayers: number): number {
  return (seat + 1) % numPlayers
}

/** Seats in play order starting from `startSeat` (partners sit numTeams apart). */
export function turnOrder(startSeat: number, numPlayers: number): number[] {
  return Array.from(
    { length: numPlayers },
    (_, i) => (startSeat + i) % numPlayers,
  )
}

export interface GameSession {
  config: GameConfig
  /** Base seed; each round is dealt from `seed + roundNumber` for replayability. */
  seed: number
  /** The single seat a human controls; every other seat is a bot. */
  humanSeat: number
  roundNumber: number
  round: RoundState
  /** Cumulative team scores carried across rounds (drives meld minimums). */
  scores: number[]
  /** Result of the most recently completed round, if any. */
  lastRoundResult?: RoundResult
  over: boolean
  /** Set once the game is over: the team with the highest cumulative score. */
  winningTeam?: number
}

/** A human engine action, or a request to let the current bot take its turn. */
export type GameEvent =
  | { type: 'PLAYER_ACTION'; action: Action }
  | { type: 'BOT_STEP' }

/** Start a fresh game. Round 0 is dealt from `seed`; all scores begin at zero. */
export function createSession(
  seed: number,
  config: GameConfig = DEFAULT_CONFIG,
  humanSeat = 0,
): GameSession {
  const scores = Array.from({ length: config.numTeams }, () => 0)
  return {
    config,
    seed,
    humanSeat,
    roundNumber: 0,
    round: createRound(seed, config, scores),
    scores,
    over: false,
  }
}

/** True when the game is live and it's the human seat's turn to act. */
export function isHumanTurn(session: GameSession): boolean {
  return (
    !session.over &&
    !session.round.over &&
    session.round.currentSeat === session.humanSeat
  )
}

/** True when the game is live and it's a bot's turn to act. */
export function isBotTurn(session: GameSession): boolean {
  return (
    !session.over &&
    !session.round.over &&
    session.round.currentSeat !== session.humanSeat
  )
}

/**
 * Fold a completed round into the game: score it, carry the cumulative totals
 * forward, and either declare a winner or deal the next round. A round that
 * isn't over yet passes through untouched.
 */
function settleRound(session: GameSession): GameSession {
  if (!session.round.over) return session

  const result = finishRound(session.round, session.config)
  if (result.gameOver) {
    return {
      ...session,
      scores: result.cumulative,
      lastRoundResult: result,
      over: true,
      winningTeam: result.winningTeam,
    }
  }

  const roundNumber = session.roundNumber + 1
  return {
    ...session,
    roundNumber,
    round: createRound(
      session.seed + roundNumber,
      session.config,
      result.cumulative,
    ),
    scores: result.cumulative,
    lastRoundResult: result,
  }
}

/**
 * The reducer. `PLAYER_ACTION` applies one engine action for the human (ignored
 * if it isn't their turn or the engine rejects it — the UI checks legality up
 * front via the human-action interface). `BOT_STEP` plays the current bot's
 * whole turn. Either way, a finished round is settled automatically.
 */
export function dispatch(session: GameSession, event: GameEvent): GameSession {
  if (session.over || session.round.over) return session

  switch (event.type) {
    case 'PLAYER_ACTION': {
      if (session.round.currentSeat !== session.humanSeat) return session
      const result = apply(session.round, event.action, session.config)
      if (!result.ok) return session
      return settleRound({ ...session, round: result.round })
    }
    case 'BOT_STEP': {
      if (session.round.currentSeat === session.humanSeat) return session
      const round = playTurn(session.round, session.config)
      return settleRound({ ...session, round })
    }
  }
}
