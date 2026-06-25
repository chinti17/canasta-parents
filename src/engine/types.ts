// Core state types for a Canasta game. Pure data — no behaviour here.

import type { Card, Rank } from './cards'

/** A laid-down meld: 3+ cards of one rank (plus up to 3 wilds). */
export interface Meld {
  /** The natural rank this meld is built on (black-3 melds use '3'). */
  rank: Rank
  cards: Card[]
}

export interface PlayerState {
  seat: number
  teamId: number
  hand: Card[]
}

export interface TeamState {
  id: number
  seats: number[]
  melds: Meld[]
  /** Red 3s set aside by this team (bonus cards, never melded). */
  redThrees: Card[]
  /** True once the team has made its initial meld this round. */
  hasMelded: boolean
  /** Cumulative game score carried across rounds (drives the meld minimum). */
  score: number
}

export interface DiscardPile {
  /** Bottom-to-top; the last element is the visible top card. */
  cards: Card[]
  /** Frozen by a wild card or red 3 — taking it then needs two naturals. */
  frozen: boolean
}

/** A turn has two phases: first draw (or take pile), then act + discard. */
export type TurnPhase = 'draw' | 'action'

export interface RoundState {
  players: PlayerState[]
  teams: TeamState[]
  /** Draw pile; top of stock is the last element. */
  stock: Card[]
  discard: DiscardPile
  currentSeat: number
  phase: TurnPhase
  /** Set when the current player took the discard pile this turn. */
  tookDiscard: boolean
  /** Each team's `hasMelded` as of the start of the current turn (for the
   *  concealed go-out bonus). */
  turnStartHasMelded: boolean[]
  over: boolean
  /** Seat of the player who went out, if the round ended that way. */
  wentOutSeat?: number
  /** True if that player went out concealed (team had not melded before). */
  wentOutConcealed?: boolean
}

export interface GameConfig {
  numPlayers: number
  numTeams: number
  cardsPerPlayer: number
  numDecks: number
  targetScore: number
  /** Canastas a team needs before it may go out. */
  canastasToGoOut: number
}

export interface GameState {
  config: GameConfig
  round: RoundState
  roundNumber: number
  /** True once a team has reached the target score (set during scoring). */
  over: boolean
}

/** The confirmed v1 configuration (see PLAN.md §3). */
export const DEFAULT_CONFIG: GameConfig = {
  numPlayers: 6,
  numTeams: 3,
  cardsPerPlayer: 11,
  numDecks: 3,
  targetScore: 5000,
  canastasToGoOut: 2,
}

/** Team a seat belongs to: partners sit `numTeams` apart (0,3 / 1,4 / 2,5). */
export function teamOfSeat(seat: number, numTeams: number): number {
  return seat % numTeams
}
