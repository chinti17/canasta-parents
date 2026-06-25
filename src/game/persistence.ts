// Save/resume the full game to browser localStorage (PLAN.md §2).
//
// The whole session — config, current round, scores, round number, seed — is
// plain JSON-serializable data (cards are simple objects), so persistence is
// just versioned JSON. A version tag lets us reject saves from an incompatible
// build instead of loading garbage. Storage is injectable so this stays
// testable under Node (where `localStorage` doesn't exist).

import type { GameSession } from './session'

export const STORAGE_KEY = 'canasta:session'
export const SCHEMA_VERSION = 1

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

/** Resolve the ambient localStorage, or undefined when there's no DOM. */
function ambientStorage(): StorageLike | undefined {
  return typeof localStorage !== 'undefined' ? localStorage : undefined
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
  return (parsed as Envelope).session
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
