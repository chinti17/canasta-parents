// Round and game scoring. Consumes end-of-round state from the engine.

import { cardValue } from './cards'
import { canastaType } from './melds'
import type { Meld, TeamState } from './types'

const NATURAL_CANASTA_BONUS = 500
const MIXED_CANASTA_BONUS = 300
const RED_THREE_VALUE = 100

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
