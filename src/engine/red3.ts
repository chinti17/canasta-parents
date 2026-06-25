// Red-3 handling and the initial-meld minimum.
//
// Red 3s are bonus cards: a player never keeps them. Whenever one reaches a
// hand (at the deal or when drawn) it is laid in front of the team and a
// replacement is drawn from the stock.

import { isRed3, type Card } from './cards'
import type { RoundState } from './types'

/** Split a hand into the cards kept and the red 3s found. */
export function extractRedThrees(hand: readonly Card[]): {
  kept: Card[]
  redThrees: Card[]
} {
  const kept: Card[] = []
  const redThrees: Card[] = []
  for (const card of hand) {
    if (isRed3(card)) redThrees.push(card)
    else kept.push(card)
  }
  return { kept, redThrees }
}

/**
 * Move every red 3 from the opening hands to its team and draw replacements
 * from the stock (repeating if a replacement is itself a red 3). Mutates the
 * freshly-built round in place. Used by round setup.
 */
export function setupRedThrees(round: RoundState): void {
  for (const player of round.players) {
    const team = round.teams[player.teamId]!
    let hand: Card[] = player.hand
    for (;;) {
      const { kept, redThrees } = extractRedThrees(hand)
      if (redThrees.length === 0) {
        player.hand = kept
        break
      }
      team.redThrees.push(...redThrees)
      for (let i = 0; i < redThrees.length && round.stock.length > 0; i++) {
        kept.push(round.stock.pop()!)
      }
      hand = kept
    }
  }
}

/**
 * Initial-meld minimum point value a team must lay down on its first meld of
 * a round, based on its cumulative game score (PLAN.md §3).
 */
export function meldMinimum(teamScore: number): number {
  if (teamScore < 0) return 15
  if (teamScore < 1500) return 50
  if (teamScore < 3000) return 90
  return 120
}
