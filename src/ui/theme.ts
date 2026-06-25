// Shared visual helpers for the UI: team colours and suit rendering.

import type { Suit } from '../engine/cards'

/** Per-team colour set (3 teams). Tailwind classes kept literal so they ship. */
export interface TeamColors {
  /** Solid accent background (chips, dots). */
  bg: string
  /** Text colour matching the accent. */
  text: string
  /** Subtle border for panels. */
  border: string
  /** Soft panel background. */
  panel: string
  label: string
}

const TEAMS: TeamColors[] = [
  {
    bg: 'bg-emerald-500',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    panel: 'bg-emerald-500/10',
    label: 'Team A',
  },
  {
    bg: 'bg-sky-500',
    text: 'text-sky-300',
    border: 'border-sky-500/40',
    panel: 'bg-sky-500/10',
    label: 'Team B',
  },
  {
    bg: 'bg-amber-500',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    panel: 'bg-amber-500/10',
    label: 'Team C',
  },
]

export function teamColors(teamId: number): TeamColors {
  return TEAMS[teamId % TEAMS.length]!
}

export interface SuitStyle {
  symbol: string
  /** True for hearts/diamonds (rendered red). */
  red: boolean
}

const SUIT_STYLES: Record<Suit, SuitStyle> = {
  clubs: { symbol: '♣', red: false },
  spades: { symbol: '♠', red: false },
  hearts: { symbol: '♥', red: true },
  diamonds: { symbol: '♦', red: true },
}

export function suitStyle(suit: Suit): SuitStyle {
  return SUIT_STYLES[suit]
}
