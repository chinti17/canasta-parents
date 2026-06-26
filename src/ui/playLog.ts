// Derive a short, human-readable summary of what happened between two round
// states — without instrumenting the engine. The session reducer returns whole
// new round states (one per human action, or one per whole bot turn); diffing
// before vs after gives us a play-feed entry. Pure and unit-testable.

import type { Card } from '../engine/cards'
import type { RoundState } from '../engine/types'

export interface PlayPart {
  text: string
  /** Cards to render alongside the text (e.g. the melded or discarded cards). */
  cards?: Card[]
}

export interface PlayEntry {
  /** Seat that acted (the actor is the seat whose turn it was *before*). */
  seat: number
  teamId: number
  parts: PlayPart[]
}

function meldCardIds(round: RoundState, teamId: number): Set<string> {
  const ids = new Set<string>()
  for (const meld of round.teams[teamId]!.melds) {
    for (const c of meld.cards) ids.add(c.id)
  }
  return ids
}

/**
 * Summarize the transition `before -> after` as a single play entry, or null if
 * nothing notable changed. Heuristic but reliable for display: it reads drew /
 * melded / took-the-pile / discarded / went-out / red-3 from the state diff.
 *
 * Caller should only pass transitions *within the same round* (skip new deals).
 */
export function summarizePlay(
  before: RoundState,
  after: RoundState,
): PlayEntry | null {
  const seat = before.currentSeat
  const beforePlayer = before.players[seat]!
  const afterPlayer = after.players[seat]!
  const teamId = beforePlayer.teamId

  const parts: PlayPart[] = []

  // Cards newly present in the team's melds (a meld or a lay-off).
  const had = meldCardIds(before, teamId)
  const addedToMelds: Card[] = []
  for (const meld of after.teams[teamId]!.melds) {
    for (const c of meld.cards) if (!had.has(c.id)) addedToMelds.push(c)
  }
  if (addedToMelds.length > 0) {
    parts.push({ text: 'melded', cards: addedToMelds })
  }

  // Clear take-the-pile case: the pile went from non-empty to empty.
  const tookWholePile =
    before.discard.cards.length > 0 && after.discard.cards.length === 0
  if (tookWholePile) {
    parts.push({ text: `took the pile (${before.discard.cards.length})` })
  }

  // A new card on top of the pile means a discard (covers take-then-discard,
  // where the top changes but the pile isn't empty).
  const beforeTop = before.discard.cards[before.discard.cards.length - 1]
  const afterTop = after.discard.cards[after.discard.cards.length - 1]
  if (afterTop && afterTop.id !== beforeTop?.id && !tookWholePile) {
    parts.push({ text: 'discarded', cards: [afterTop] })
  }

  // Drawing only shows up as a hand that grew with nothing else to report.
  if (parts.length === 0 && afterPlayer.hand.length > beforePlayer.hand.length) {
    parts.push({ text: 'drew' })
  }

  // Red 3s set aside this transition.
  const redAdded =
    after.teams[teamId]!.redThrees.length -
    before.teams[teamId]!.redThrees.length
  if (redAdded > 0) parts.push({ text: `red 3 ×${redAdded}` })

  if (after.over && after.wentOutSeat === seat) {
    parts.push({ text: 'went out!' })
  }

  if (parts.length === 0) return null
  return { seat, teamId, parts }
}
