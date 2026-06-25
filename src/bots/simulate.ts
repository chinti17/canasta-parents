// Headless simulation harness: let the bots play themselves.
//
// This proves the Phase 3 outcome — a bot can play any legal state and a full
// table of bots can drive a round (and a whole game) to completion with no UI.
// The production turn-loop, autosave and large soak harness belong to Phase 4;
// this stays lightweight and bot-focused.

import { createRound } from '../engine/rounds'
import { finishRound } from '../engine/scoring'
import {
  DEFAULT_CONFIG,
  type GameConfig,
  type RoundState,
} from '../engine/types'
import { playTurn } from './bot'

const MAX_TURNS = 100_000

/** Play a single round to completion with a bot in every seat. */
export function simulateRound(
  round: RoundState,
  config: GameConfig = DEFAULT_CONFIG,
): RoundState {
  let cur = round
  for (let turn = 0; turn < MAX_TURNS && !cur.over; turn++) {
    const seat = cur.currentSeat
    const next = playTurn(cur, config)
    // Guard against a stuck turn that fails to advance the seat or end the
    // round — should never happen, but we never want an infinite loop.
    if (!next.over && next.currentSeat === seat) break
    cur = next
  }
  return cur
}

export interface GameSummary {
  /** Number of rounds played. */
  rounds: number
  /** Final cumulative score per team. */
  cumulative: number[]
  /** Team id with the highest cumulative score at game end. */
  winningTeam: number
}

/**
 * Play full rounds — carrying cumulative scores forward so meld minimums climb
 * correctly — until a team reaches the target score. Bots fill every seat. A
 * fresh seed per round keeps deals varied yet reproducible from `seed`.
 */
export function simulateGame(
  seed: number,
  config: GameConfig = DEFAULT_CONFIG,
): GameSummary {
  let scores = Array.from({ length: config.numTeams }, () => 0)
  let rounds = 0

  for (; rounds < 10_000; ) {
    const round = createRound(seed + rounds, config, scores)
    const finished = simulateRound(round, config)
    const result = finishRound(finished, config)
    scores = result.cumulative
    rounds++
    if (result.gameOver) {
      return { rounds, cumulative: scores, winningTeam: result.winningTeam! }
    }
  }

  // Safety fallback: declare the current leader if we somehow never converge.
  let leader = 0
  for (let i = 1; i < scores.length; i++) {
    if (scores[i]! > scores[leader]!) leader = i
  }
  return { rounds, cumulative: scores, winningTeam: leader }
}
