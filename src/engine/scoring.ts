// Round and game scoring. Consumes end-of-round state from the engine.

import { cardValue } from './cards'
import { canastaType } from './melds'
import type { GameConfig, Meld, RoundState, TeamState } from './types'

const NATURAL_CANASTA_BONUS = 500
const MIXED_CANASTA_BONUS = 300
const RED_THREE_VALUE = 100
const GO_OUT_BONUS = 100
const CONCEALED_GO_OUT_BONUS = 200

/** Face-value points of every card laid in a team's melds. */
export function meldCardPoints(melds: readonly Meld[]): number {
  let total = 0
  for (const m of melds) {
    for (const c of m.cards) total += cardValue(c)
  }
  return total
}

/** Bonus for each completed canasta: 500 natural, 300 mixed. */
export function canastaBonus(melds: readonly Meld[]): number {
  let total = 0
  for (const m of melds) {
    const type = canastaType(m)
    if (type === 'natural') total += NATURAL_CANASTA_BONUS
    else if (type === 'mixed') total += MIXED_CANASTA_BONUS
  }
  return total
}

/**
 * Red 3s are worth 100 each — but only if the team has melded. A team that
 * never melded has its red 3s counted *against* it.
 */
export function redThreeBonus(team: TeamState): number {
  const magnitude = RED_THREE_VALUE * team.redThrees.length
  return team.hasMelded ? magnitude : -magnitude
}

/** Penalty for cards left in the hands of a team's players at round end. */
export function handPenalty(round: RoundState, teamId: number): number {
  let total = 0
  for (const p of round.players) {
    if (p.teamId !== teamId) continue
    for (const c of p.hand) total += cardValue(c)
  }
  return total
}

/** Go-out bonus for the team that went out (200 if concealed), else 0. */
export function goOutBonus(round: RoundState, teamId: number): number {
  if (round.wentOutSeat === undefined) return 0
  const outTeam = round.players[round.wentOutSeat]!.teamId
  if (outTeam !== teamId) return 0
  return round.wentOutConcealed ? CONCEALED_GO_OUT_BONUS : GO_OUT_BONUS
}

export interface TeamRoundScore {
  teamId: number
  meldPoints: number
  canastaBonus: number
  redThreeBonus: number
  goOutBonus: number
  handPenalty: number
  /** Net points for the round (bonuses + meld points − hand penalty). */
  total: number
}

/** Score every team for a completed round. */
export function scoreRound(round: RoundState): TeamRoundScore[] {
  return round.teams.map((team) => {
    const meldPoints = meldCardPoints(team.melds)
    const canasta = canastaBonus(team.melds)
    const red3 = redThreeBonus(team)
    const goOut = goOutBonus(round, team.id)
    const penalty = handPenalty(round, team.id)
    return {
      teamId: team.id,
      meldPoints,
      canastaBonus: canasta,
      redThreeBonus: red3,
      goOutBonus: goOut,
      handPenalty: penalty,
      total: meldPoints + canasta + red3 + goOut - penalty,
    }
  })
}

export interface RoundResult {
  scores: TeamRoundScore[]
  /** New cumulative game scores by team id, after adding this round. */
  cumulative: number[]
  gameOver: boolean
  /** Team with the highest cumulative score, set only when the game is over. */
  winningTeam?: number
}

/**
 * Score a completed round and fold the results into cumulative game scores.
 * The game ends when any team reaches the target; on a tie the highest score
 * wins (lowest team id breaks an exact tie).
 */
export function finishRound(
  round: RoundState,
  config: GameConfig,
): RoundResult {
  const scores = scoreRound(round)
  const cumulative = round.teams.map(
    (team) => team.score + scores[team.id]!.total,
  )

  const gameOver = cumulative.some((s) => s >= config.targetScore)
  let winningTeam: number | undefined
  if (gameOver) {
    let best = 0
    for (let i = 1; i < cumulative.length; i++) {
      if (cumulative[i]! > cumulative[best]!) best = i
    }
    winningTeam = best
  }

  return { scores, cumulative, gameOver, winningTeam }
}
