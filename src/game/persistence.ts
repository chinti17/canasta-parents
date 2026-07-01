// Save/resume the full game to browser localStorage (PLAN.md §2).
//
// The whole session — config, current round, scores, round number, seed — is
// plain JSON-serializable data (cards are simple objects), so persistence is
// just versioned JSON. A version tag lets us reject saves from an incompatible
// build instead of loading garbage. Storage is injectable so this stays
// testable under Node (where `localStorage` doesn't exist).

import type { GameSession } from './session'

export const STORAGE_KEY = 'canasta:session'
// v2: front-door release (reject pre-front-door / spectator saves).
// v3: named-players release — sessions carry a per-seat `names` array, so older
//     saves without it are rejected rather than resumed into a nameless table.
export const SCHEMA_VERSION = 3

/** The slice of the Web Storage API we rely on (injectable for tests). */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface Envelope {
  version: number
  session: GameSession
}

/** Resolve the ambient localStorage, or undefined when there's no DOM.
 *  Gated on `window` so we never touch Node's experimental `localStorage`
 *  global (which warns), keeping the headless tests/runner quiet. */
function ambientStorage(): StorageLike | undefined {
  return typeof window !== 'undefined' && window.localStorage
    ? window.localStorage
    : undefined
}

/** Serialize a session to a versioned JSON string. */
export function serializeSession(session: GameSession): string {
  const envelope: Envelope = { version: SCHEMA_VERSION, session }
  return JSON.stringify(envelope)
}

/**
 * Parse a session from a versioned JSON string. Returns null for anything
 * unreadable or from a different schema version (treated as "no save").
 */
export function deserializeSession(json: string): GameSession | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as Envelope).version !== SCHEMA_VERSION ||
    typeof (parsed as Envelope).session !== 'object'
  ) {
    return null
  }
  const session = (parsed as Envelope).session
  // Reject saves whose human seat isn't a real, playable seat (e.g. a
  // spectator session): resuming one would leave the player with no turn.
  if (
    typeof session.humanSeat !== 'number' ||
    session.humanSeat < 0 ||
    session.humanSeat >= session.config.numPlayers
  ) {
    return null
  }
  // Reject a save missing its per-seat names (shouldn't happen within a schema
  // version, but guards against a hand-edited or partial blob).
  if (
    !Array.isArray(session.names) ||
    session.names.length !== session.config.numPlayers
  ) {
    return null
  }
  return session
}

export interface SaveSummary {
  /** 1-based round number for display. */
  round: number
  /** Cumulative team scores. */
  scores: number[]
  /** Whether it's the human's turn to act right now. */
  yourTurn: boolean
  /** Seat whose turn it is (for "Anil to play" style labels). */
  currentSeat: number
  /** The human player's chosen name. */
  playerName: string
  /** Name of whoever's turn it is. */
  currentName: string
}

/** A short, display-friendly summary of a saved game (for the Resume card). */
export function summarizeSave(session: GameSession): SaveSummary {
  return {
    round: session.roundNumber + 1,
    scores: session.scores,
    yourTurn: session.round.currentSeat === session.humanSeat,
    currentSeat: session.round.currentSeat,
    playerName: session.names[session.humanSeat] ?? 'You',
    currentName: session.names[session.round.currentSeat] ?? 'P',
  }
}

/**
 * Autosave the session. No-op (returns false) when no storage is available, so
 * callers don't have to guard for the server/Node case.
 */
export function saveSession(
  session: GameSession,
  storage: StorageLike | undefined = ambientStorage(),
): boolean {
  if (!storage) return false
  storage.setItem(STORAGE_KEY, serializeSession(session))
  return true
}

/** Load a previously saved session, or null if none/invalid/no storage. */
export function loadSession(
  storage: StorageLike | undefined = ambientStorage(),
): GameSession | null {
  if (!storage) return null
  const json = storage.getItem(STORAGE_KEY)
  return json === null ? null : deserializeSession(json)
}

/** Forget any saved session (e.g. when starting a new game). */
export function clearSession(
  storage: StorageLike | undefined = ambientStorage(),
): void {
  storage?.removeItem(STORAGE_KEY)
}
