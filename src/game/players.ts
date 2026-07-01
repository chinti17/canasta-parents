// Named players and the partner draft (Phase 9). Pure helpers, no React.
//
// The six seats carry real names. The human picks theirs; the remaining five
// are dealt to the bot seats by a *seeded* shuffle, so the assignment is
// reproducible (and survives a save) and one of the five lands on the human's
// partner seat — a random draft of a partner, with the other four split across
// the opposing teams.

import { makeRng, shuffle } from '../engine/cards'

/** The fixed roster of player names (1 human + 5 bots fill these six seats). */
export const PLAYER_NAMES = [
  'Paresh',
  'Nita',
  'Anil',
  'Divya',
  'Nitin',
  'Swati',
] as const

export type PlayerName = (typeof PLAYER_NAMES)[number]

/** Neutral fallback labels when no names have been assigned (tests, headless). */
export function defaultSeatNames(numPlayers: number): string[] {
  return Array.from({ length: numPlayers }, (_, i) => `P${i + 1}`)
}

/**
 * Assign names to seats: the human's chosen name takes `humanSeat`, and the
 * remaining roster is seeded-shuffled across the other seats. With the standard
 * 3-team seating (partners sit `numTeams` apart) the shuffle drafts a random
 * partner onto the human's partner seat and splits the rest across the two
 * opposing teams.
 */
export function assignSeatNames(
  humanName: string,
  humanSeat: number,
  numPlayers: number,
  seed: number,
): string[] {
  const others = PLAYER_NAMES.filter((name) => name !== humanName)
  const shuffled = shuffle(others, makeRng(seed))
  const names: string[] = []
  let next = 0
  for (let seat = 0; seat < numPlayers; seat++) {
    names[seat] =
      seat === humanSeat ? humanName : (shuffled[next++] ?? `P${seat + 1}`)
  }
  return names
}
