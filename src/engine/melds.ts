// Meld validation, point values, and canasta detection.

import {
  cardValue,
  isBlack3,
  isRed3,
  isWild,
  type Card,
  type Rank,
} from './cards'
import type { Meld } from './types'

export interface MeldValidation {
  ok: boolean
  rank?: Rank
  reason?: string
  /** A pure black-3 meld — legal only when going out (enforced by actions). */
  isBlackThreeMeld?: boolean
}

/**
 * Validate that a set of cards forms a structurally legal meld:
 * - at least 3 cards,
 * - at least 2 natural cards, all of the same rank,
 * - at most 3 wild cards,
 * - no red 3s,
 * - black-3 melds must be pure (all black 3s, no wilds).
 *
 * Does not enforce the initial-meld minimum or the going-out-only rule for
 * black 3s — those are turn-level concerns handled by the action layer.
 */
export function validateMeldCards(cards: readonly Card[]): MeldValidation {
  if (cards.length < 3) {
    return { ok: false, reason: 'a meld needs at least 3 cards' }
  }
  if (cards.some(isRed3)) {
    return { ok: false, reason: 'red 3s cannot be melded' }
  }

  const wilds = cards.filter(isWild)
  const naturals = cards.filter((c) => !isWild(c))

  if (wilds.length > 3) {
    return { ok: false, reason: 'a meld may contain at most 3 wild cards' }
  }
  if (naturals.length < 2) {
    return { ok: false, reason: 'a meld needs at least 2 natural cards' }
  }

  const ranks = new Set(naturals.map((c) => c.rank))
  if (ranks.size !== 1) {
    return { ok: false, reason: 'all natural cards must share a rank' }
  }
  const rank = naturals[0]!.rank

  if (rank === '3') {
    // Naturals of rank 3 here are all black 3s (red 3s already rejected).
    if (!naturals.every(isBlack3)) {
      return { ok: false, reason: 'invalid 3 in meld' }
    }
    if (wilds.length > 0) {
      return { ok: false, reason: 'black 3 melds cannot contain wild cards' }
    }
    return { ok: true, rank: '3', isBlackThreeMeld: true }
  }

  return { ok: true, rank }
}

/** Total pip value of the cards (used for meld minimums and scoring). */
export function meldPointValue(cards: readonly Card[]): number {
  return cards.reduce((sum, c) => sum + cardValue(c), 0)
}

/** A canasta is a completed meld of 7 or more cards. */
export function isCanasta(meld: Meld): boolean {
  return meld.cards.length >= 7
}

/** 'natural' (no wilds, 500), 'mixed' (has wilds, 300), or null if < 7 cards. */
export function canastaType(meld: Meld): 'natural' | 'mixed' | null {
  if (!isCanasta(meld)) return null
  return meld.cards.some(isWild) ? 'mixed' : 'natural'
}

/** Count completed canastas a team currently holds. */
export function countCanastas(melds: readonly Meld[]): number {
  return melds.filter(isCanasta).length
}
