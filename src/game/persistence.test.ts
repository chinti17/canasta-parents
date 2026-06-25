import { describe, expect, it } from 'vitest'
import { createSession, dispatch } from './session'
import {
  clearSession,
  deserializeSession,
  loadSession,
  saveSession,
  serializeSession,
  STORAGE_KEY,
  summarizeSave,
  type StorageLike,
} from './persistence'

/** A tiny in-memory Storage stand-in for tests. */
function memoryStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

describe('persistence', () => {
  it('round-trips a session through serialize/deserialize', () => {
    // Advance a little so the state isn't trivially the initial deal.
    const session = dispatch(createSession(7), {
      type: 'PLAYER_ACTION',
      action: { type: 'DRAW_STOCK' },
    })
    const restored = deserializeSession(serializeSession(session))
    expect(restored).toEqual(session)
  })

  it('returns null for unreadable or wrong-version data', () => {
    expect(deserializeSession('not json')).toBeNull()
    expect(
      deserializeSession(JSON.stringify({ version: 999, session: {} })),
    ).toBeNull()
    expect(deserializeSession(JSON.stringify({ foo: 'bar' }))).toBeNull()
  })

  it('saves to and loads from injected storage', () => {
    const storage = memoryStorage()
    const session = createSession(3)
    expect(saveSession(session, storage)).toBe(true)
    expect(storage.map.has(STORAGE_KEY)).toBe(true)
    expect(loadSession(storage)).toEqual(session)
  })

  it('loads null when nothing is saved, and clears a save', () => {
    const storage = memoryStorage()
    expect(loadSession(storage)).toBeNull()
    saveSession(createSession(1), storage)
    clearSession(storage)
    expect(loadSession(storage)).toBeNull()
  })

  it('is a safe no-op when no storage is available', () => {
    expect(saveSession(createSession(1), undefined)).toBe(false)
    expect(loadSession(undefined)).toBeNull()
    expect(() => clearSession(undefined)).not.toThrow()
  })

  it('rejects a save whose human seat is not a playable seat', () => {
    // A spectator-style session (humanSeat -1) must not be resumable.
    const spectator = { ...createSession(1), humanSeat: -1 }
    expect(deserializeSession(serializeSession(spectator))).toBeNull()
  })
})

describe('summarizeSave', () => {
  it('summarizes round, scores, and whose turn it is', () => {
    const summary = summarizeSave(createSession(7))
    expect(summary.round).toBe(1)
    expect(summary.scores).toEqual([0, 0, 0])
    expect(summary.yourTurn).toBe(true) // seat 0 == humanSeat 0 on the first deal
    expect(summary.currentSeat).toBe(0)
  })
})
