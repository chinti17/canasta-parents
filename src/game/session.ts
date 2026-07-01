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
import { defaultSeatNames } from './players'

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
  /** Display name per seat (index = seat). The human's pick sits at `humanSeat`. */
  names: string[]
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

/**
 * Drive the session: a human engine action, a request to let the current bot
 * take its turn, advancing past a finished round, or starting a new game.
 */
export type GameEvent =
  | { type: 'PLAYER_ACTION'; action: Action }
  | { type: 'BOT_STEP' }
  | { type: 'NEXT_ROUND' }
  | { type: 'NEW_GAME'; seed: number }

/**
 * Start a fresh game. Round 0 is dealt from `seed`; all scores begin at zero.
 * `names` sets each seat's display name (defaults to P1…Pn for headless/tests).
 */
export function createSession(
  seed: number,
  config: GameConfig = DEFAULT_CONFIG,
  humanSeat = 0,
  names: string[] = defaultSeatNames(config.numPlayers),
): GameSession {
  const scores = Array.from({ length: config.numTeams }, () => 0)
  return {
    config,
    seed,
    humanSeat,
    names,
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
 * Score a completed round and fold the totals into the cumulative scores. If a
 * team has reached the target the game is over; otherwise the round stays
 * `over` (a between-rounds pause) so the UI can show the scoreboard before the
 * next deal — `NEXT_ROUND` advances. A round that isn't over passes through.
 */
function settleRound(session: GameSession): GameSession {
  if (!session.round.over) return session

  const result = finishRound(session.round, session.config)
  return {
    ...session,
    scores: result.cumulative,
    lastRoundResult: result,
    over: result.gameOver,
    winningTeam: result.gameOver ? result.winningTeam : undefined,
  }
}

/**
 * The reducer. `PLAYER_ACTION` applies one engine action for the human (ignored
 * if it isn't their turn or the engine rejects it — the UI checks legality up
 * front via the human-action interface). `BOT_STEP` plays the current bot's
 * whole turn; both settle a finished round into a between-rounds pause.
 * `NEXT_ROUND` deals the next round from that pause, and `NEW_GAME` restarts.
 */
export function dispatch(session: GameSession, event: GameEvent): GameSession {
  switch (event.type) {
    case 'NEW_GAME':
      return createSession(event.seed, session.config, session.humanSeat)

    case 'NEXT_ROUND': {
      if (session.over || !session.round.over) return session
      const roundNumber = session.roundNumber + 1
      return {
        ...session,
        roundNumber,
        round: createRound(
          session.seed + roundNumber,
          session.config,
          session.scores,
        ),
        lastRoundResult: undefined,
      }
    }

    case 'PLAYER_ACTION': {
      if (session.over || session.round.over) return session
      if (session.round.currentSeat !== session.humanSeat) return session
      const result = apply(session.round, event.action, session.config)
      if (!result.ok) return session
      return settleRound({ ...session, round: result.round })
    }

    case 'BOT_STEP': {
      if (session.over || session.round.over) return session
      if (session.round.currentSeat === session.humanSeat) return session
      const round = playTurn(session.round, session.config)
      return settleRound({ ...session, round })
    }
  }
}
