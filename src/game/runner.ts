// Headless game runner: drive a whole game with no UI, through the very same
// session reducer the UI uses. One seat is the "human" (filled by a stub
// strategy here) and the rest are bots, so this exercises the human-action
// path end-to-end — not just the bots' own turn loop.

import { type Action } from '../engine/actions'
import { chooseTurn } from '../bots/bot'
import {
  DEFAULT_CONFIG,
  type GameConfig,
  type RoundState,
} from '../engine/types'
import {
  createSession,
  dispatch,
  isHumanTurn,
  type GameSession,
} from './session'

/** A turn strategy: given a round, return the ordered actions to play. */
export type TurnStrategy = (round: RoundState, config: GameConfig) => Action[]

/** Default human stub — plays exactly like a bot. */
export const botStrategy: TurnStrategy = (round, config) =>
  chooseTurn(round, config)

export interface RunOptions {
  config?: GameConfig
  humanSeat?: number
  /** Strategy for the human seat (defaults to the bot strategy). */
  humanStrategy?: TurnStrategy
  /** If set, assert card conservation after every transition. */
  validate?: boolean
}

export interface RunResult {
  rounds: number
  scores: number[]
  winningTeam: number
  /** Final session, for inspection. */
  session: GameSession
}

/** Total cards visible anywhere in the round — must equal the shoe size. */
function totalCards(round: RoundState): number {
  let total = round.stock.length + round.discard.cards.length
  for (const p of round.players) total += p.hand.length
  for (const t of round.teams) {
    total += t.redThrees.length
    for (const m of t.melds) total += m.cards.length
  }
  return total
}

// Stall guards. A legitimate round ends well within a few hundred seat-turns
// (the stock depletes), and a game converges in a bounded number of rounds, so
// these generous ceilings only trip on a genuine bug (e.g. a bot that never
// lets the stock run down). The runner surfaces that by throwing fast rather
// than spinning for minutes.
const MAX_TURNS_PER_ROUND = 2_000
const MAX_ROUNDS_PER_GAME = 5_000

/**
 * Play a full game start→finish and report the winner. Drives the human seat
 * with `humanStrategy` (a bot by default) and every other seat with `BOT_STEP`.
 */
export function runHeadlessGame(
  seed: number,
  options: RunOptions = {},
): RunResult {
  const config = options.config ?? DEFAULT_CONFIG
  const humanStrategy = options.humanStrategy ?? botStrategy
  const shoeSize = config.numDecks * 54

  let session = createSession(seed, config, options.humanSeat ?? 0)
  let roundNumber = session.roundNumber
  let turnsThisRound = 0

  const check = (s: GameSession) => {
    if (options.validate && !s.over && totalCards(s.round) !== shoeSize) {
      throw new Error(
        `card conservation violated: ${totalCards(s.round)} != ${shoeSize} ` +
          `(seed ${seed}, round ${s.roundNumber})`,
      )
    }
  }
  check(session)

  while (!session.over) {
    // Reset the per-round turn counter whenever a new round is dealt.
    if (session.roundNumber !== roundNumber) {
      roundNumber = session.roundNumber
      turnsThisRound = 0
    }
    if (++turnsThisRound > MAX_TURNS_PER_ROUND) {
      throw new Error(`round ${roundNumber} did not end (seed ${seed})`)
    }
    if (roundNumber > MAX_ROUNDS_PER_GAME) {
      throw new Error(`game did not converge (seed ${seed})`)
    }

    if (isHumanTurn(session)) {
      const actions = humanStrategy(session.round, config)
      if (actions.length === 0) {
        throw new Error(`human strategy produced no actions (seed ${seed})`)
      }
      const before = session.round
      for (const action of actions) {
        session = dispatch(session, { type: 'PLAYER_ACTION', action })
        check(session)
        if (session.over) break
      }
      // A turn must make progress (advance the seat or end the round/game).
      if (!session.over && session.round === before && isHumanTurn(session)) {
        throw new Error(`human turn made no progress (seed ${seed})`)
      }
    } else {
      session = dispatch(session, { type: 'BOT_STEP' })
      check(session)
    }
  }

  return {
    rounds: session.roundNumber + 1,
    scores: session.scores,
    winningTeam: session.winningTeam!,
    session,
  }
}

export interface SoakReport {
  games: number
  /** Rounds played across all games. */
  totalRounds: number
  minRounds: number
  maxRounds: number
  /** How many games each team won, indexed by team id. */
  winsByTeam: number[]
}

/**
 * Run many seeded games back-to-back with full card-conservation checking, to
 * surface rule edge-cases (deck depletion, illegal take-pile, stalemates). Any
 * crash, non-converging game or invalid state throws; otherwise it returns a
 * summary of the run.
 */
export function soak(
  games: number,
  seedStart = 1,
  config: GameConfig = DEFAULT_CONFIG,
): SoakReport {
  const winsByTeam = Array.from({ length: config.numTeams }, () => 0)
  let totalRounds = 0
  let minRounds = Infinity
  let maxRounds = 0

  for (let i = 0; i < games; i++) {
    const result = runHeadlessGame(seedStart + i, { config, validate: true })
    winsByTeam[result.winningTeam]!++
    totalRounds += result.rounds
    minRounds = Math.min(minRounds, result.rounds)
    maxRounds = Math.max(maxRounds, result.rounds)
  }

  return {
    games,
    totalRounds,
    minRounds: games > 0 ? minRounds : 0,
    maxRounds,
    winsByTeam,
  }
}
