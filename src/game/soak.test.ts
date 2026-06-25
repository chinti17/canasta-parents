import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../engine/types'
import { soak } from './runner'

// Node's `process` (the project has no @types/node; this keeps the file typed).
declare const process: { env: Record<string, string | undefined> } | undefined

// The plan's target is a 10k+ game soak. A full 10k run takes ~2 minutes, so
// the committed default is a fast smoke (every game fully card-conservation
// checked); set SOAK_GAMES to run the deep target, e.g. `SOAK_GAMES=10000`.
const GAMES = Number(process?.env.SOAK_GAMES ?? 500)

describe('soak', () => {
  it(`plays ${GAMES} seeded games with no crashes or invalid states`, () => {
    const report = soak(GAMES, 1)

    expect(report.games).toBe(GAMES)
    // Every game reached a winner (reaching here means none stalled — the
    // runner throws on a non-converging game or any card-conservation breach).
    expect(report.winsByTeam.reduce((sum, w) => sum + w, 0)).toBe(GAMES)
    expect(report.winsByTeam).toHaveLength(DEFAULT_CONFIG.numTeams)
    expect(report.minRounds).toBeGreaterThan(0)
  }, 600000)
})
