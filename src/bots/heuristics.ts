// Heuristic scoring used by the bot to choose between legal moves.
//
// All scores are unitless and only meaningful relative to one another. The two
// big ideas are: keep cards that build our melds/canastas, and don't feed the
// opposing teams. Crucially there are *several* opposing teams (3-team game),
// so opponent-facing risk is evaluated per team and never collapsed into one.

import {
  cardValue,
  isBlack3,
  isNatural,
  isWild,
  type Card,
} from '../engine/cards'
import { canastaBonus, meldCardPoints } from '../engine/scoring'
import type { RoundState, TeamState } from '../engine/types'

/** The opposing teams — an array, because a 3-team game has two of them. */
export function opponentTeams(
  round: RoundState,
  myTeamId: number,
): TeamState[] {
  return round.teams.filter((t) => t.id !== myTeamId)
}

/**
 * Risk of handing a card to the opponents by discarding it, evaluated PER
 * opponent team and taken as the worst case: a discard that is lethal for one
 * team is dangerous even if the other team has no use for it. A black 3 is
 * safe to shed — it freezes the pile against everyone and can't be melded onto.
 */
export function opponentDiscardRisk(
  card: Card,
  round: RoundState,
  myTeamId: number,
): number {
  if (isBlack3(card)) return 0
  let worst = 0
  for (const opp of opponentTeams(round, myTeamId)) {
    let risk = cardValue(card) / 10 // points gifted if they scoop the pile
    if (opp.melds.some((m) => m.rank === card.rank)) risk += 8 // usable right now
    if (!round.discard.frozen && opp.hasMelded) risk += 2 // pile is takeable
    worst = Math.max(worst, risk)
  }
  return worst
}

/**
 * How much WE want to keep a card: wilds are scarce and valuable, pairs/triples
 * are meld fuel, and a card matching one of our melds can be laid off toward a
 * canasta. Black 3s only help us to go out, so they're cheap to discard.
 */
export function keepValue(
  card: Card,
  hand: readonly Card[],
  team: TeamState,
): number {
  let value = 0
  if (isWild(card)) value += 30
  if (isBlack3(card)) value -= 4
  const sameRankInHand = hand.filter(
    (c) => c.id !== card.id && isNatural(c) && c.rank === card.rank,
  ).length
  value += sameRankInHand * 4
  if (team.melds.some((m) => m.rank === card.rank)) value += 6
  return value
}

/**
 * Combined "don't discard me" score. The bot discards the card with the lowest
 * score — least useful to us and least dangerous to hand over.
 */
export function discardScore(
  card: Card,
  hand: readonly Card[],
  round: RoundState,
  team: TeamState,
): number {
  return keepValue(card, hand, team) + opponentDiscardRisk(card, round, team.id)
}

/** Points a team has already secured on the table (meld faces + canasta bonus). */
export function tableValue(team: TeamState): number {
  return meldCardPoints(team.melds) + canastaBonus(team.melds)
}
