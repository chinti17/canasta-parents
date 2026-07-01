import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../engine/types'
import { PLAYER_NAMES, assignSeatNames, defaultSeatNames } from './players'

const { numPlayers, numTeams } = DEFAULT_CONFIG
const roster: string[] = [...PLAYER_NAMES]

describe('seat names', () => {
  it('provides neutral default labels', () => {
    expect(defaultSeatNames(6)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6'])
  })

  it('seats the human under their chosen name', () => {
    expect(assignSeatNames('Anil', 0, numPlayers, 1)[0]).toBe('Anil')
  })

  it('uses the whole six-name roster exactly once', () => {
    const names = assignSeatNames('Divya', 0, numPlayers, 7)
    expect(names).toHaveLength(numPlayers)
    expect([...names].sort()).toEqual(roster.slice().sort())
  })

  it('is deterministic for a given seed', () => {
    expect(assignSeatNames('Nita', 0, numPlayers, 42)).toEqual(
      assignSeatNames('Nita', 0, numPlayers, 42),
    )
  })

  it('drafts a partner (some other roster name) onto the partner seat', () => {
    const humanSeat = 0
    const partnerSeat = (humanSeat + numTeams) % numPlayers
    const names = assignSeatNames('Swati', humanSeat, numPlayers, 3)
    expect(names[partnerSeat]).not.toBe('Swati')
    expect(roster.includes(names[partnerSeat]!)).toBe(true)
  })

  it('varies the arrangement across seeds', () => {
    const base = assignSeatNames('Paresh', 0, numPlayers, 1).join(',')
    const differs = [2, 3, 4, 5, 6].some(
      (seed) =>
        assignSeatNames('Paresh', 0, numPlayers, seed).join(',') !== base,
    )
    expect(differs).toBe(true)
  })
})
