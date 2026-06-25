import { describe, expect, it } from 'vitest'

// Phase 0 smoke test: confirms the Vitest toolchain runs.
// Real engine tests arrive in Phase 1.
describe('toolchain', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2)
  })
})
