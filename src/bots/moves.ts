// Legal-move enumeration for bots: turn engine state into candidate actions.
//
// Pure TypeScript, no React/DOM — builds only on the engine's public surface.
// Enumeration is deliberately generous; the engine's `apply` is the source of
// truth for legality, so the bot proposes candidates and lets `apply` reject
// any that don't hold up. That keeps rule knowledge in one place (the engine).

import {
  isBlack3,
  isNatural,
  isWild,
  type Card,
  type Rank,
} from '../engine/cards'
import type { Action } from '../engine/actions'
import type { RoundState, TeamState } from '../engine/types'

/** Group cards by rank, preserving encounter order within each rank. */
export function groupByRank(cards: readonly Card[]): Map<Rank, Card[]> {
  const groups = new Map<Rank, Card[]>()
  for (const card of cards) {
    const existing = groups.get(card.rank)
    if (existing) existing.push(card)
    else groups.set(card.rank, [card])
  }
  return groups
}

const ids = (cards: readonly Card[]): string[] => cards.map((c) => c.id)

/** Ranks the team has already laid a meld for (so they're layoff targets). */
function meldedRanks(team: TeamState): Set<Rank> {
  return new Set(team.melds.map((m) => m.rank))
}

/** The visible top card of the discard pile, if any. */
export function topDiscard(round: RoundState): Card | undefined {
  return round.discard.cards[round.discard.cards.length - 1]
}

/**
 * New melds the bot can lay from naturals alone — three or more of a rank it
 * hasn't melded yet. Natural-only melds keep our scarce wilds free to complete
 * canastas later; 2s, jokers and 3s are never the basis of a normal meld here
 * (2s/jokers are wild, red 3s can't be melded, black 3s only to go out).
 */
export function naturalNewMelds(
  hand: readonly Card[],
  team: TeamState,
): { rank: Rank; cards: Card[] }[] {
  const already = meldedRanks(team)
  const melds: { rank: Rank; cards: Card[] }[] = []
  for (const [rank, cards] of groupByRank(hand)) {
    if (rank === '2' || rank === 'JOKER' || rank === '3') continue
    if (already.has(rank)) continue
    const naturals = cards.filter(isNatural)
    if (naturals.length >= 3) melds.push({ rank, cards: naturals })
  }
  return melds
}

/**
 * Lay-offs onto the team's existing melds: naturals matching a meld's rank,
 * plus — only to *complete a canasta* (reach 7 cards) — enough wilds to get
 * there, never exceeding the 3-wild ceiling. One entry per existing meld.
 */
export function layoffPlan(
  hand: readonly Card[],
  team: TeamState,
): { targetRank: Rank; cardIds: string[] }[] {
  const plan: { targetRank: Rank; cardIds: string[] }[] = []
  for (const meld of team.melds) {
    if (meld.rank === '3') continue // black-3 melds can't be extended
    const naturals = hand.filter((c) => isNatural(c) && c.rank === meld.rank)
    const cards = [...naturals]

    const projected = meld.cards.length + naturals.length
    if (projected < 7) {
      const room = 3 - meld.cards.filter(isWild).length
      const need = 7 - projected
      const wilds = hand.filter(isWild).slice(0, Math.min(room, need))
      cards.push(...wilds)
    }

    if (cards.length > 0) {
      plan.push({ targetRank: meld.rank, cardIds: ids(cards) })
    }
  }
  return plan
}

/**
 * Candidate TAKE_PILE actions for the current top card. Returns an
 * "add to an existing meld" variant and/or a "form a new meld" variant; empty
 * if the pile can't be taken (no pile, or topped by a wild or black 3). When
 * the team hasn't melded yet, other natural melds from hand are attached as
 * `additionalMelds` so the take can clear the initial-meld minimum.
 */
export function takePileOptions(
  round: RoundState,
  team: TeamState,
  hand: readonly Card[],
): Extract<Action, { type: 'TAKE_PILE' }>[] {
  const top = topDiscard(round)
  if (!top || isBlack3(top) || isWild(top)) return []

  const options: Extract<Action, { type: 'TAKE_PILE' }>[] = []
  const mustUseTwoNaturals = round.discard.frozen || !team.hasMelded
  const hasMeldOfRank = team.melds.some((m) => m.rank === top.rank)
  const naturalsOfTop = hand.filter((c) => isNatural(c) && c.rank === top.rank)
  const wilds = hand.filter(isWild)

  const additionalMelds = !team.hasMelded
    ? naturalNewMelds(hand, team)
        .filter((m) => m.rank !== top.rank)
        .map((m) => ids(m.cards))
    : []

  // Variant A — drop the top card onto an existing meld (only when unfrozen).
  if (!mustUseTwoNaturals && hasMeldOfRank) {
    options.push({ type: 'TAKE_PILE', withCardIds: [], additionalMelds })
  }

  // Variant B — form/extend a meld using hand cards plus the top card.
  if (naturalsOfTop.length >= 2) {
    options.push({
      type: 'TAKE_PILE',
      withCardIds: ids(naturalsOfTop),
      additionalMelds,
    })
  } else if (
    !mustUseTwoNaturals &&
    naturalsOfTop.length === 1 &&
    wilds.length >= 1
  ) {
    options.push({
      type: 'TAKE_PILE',
      withCardIds: [naturalsOfTop[0]!.id, wilds[0]!.id],
      additionalMelds,
    })
  }

  return options
}
