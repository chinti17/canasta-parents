// Round/game setup: turn a seed + config into an initial state.
// Red-3 extraction from opening hands is layered on in red3.ts (a later commit).

import { buildShoe, deal, isRed3, isWild, makeRng, shuffle } from './cards'
import {
  DEFAULT_CONFIG,
  teamOfSeat,
  type GameConfig,
  type GameState,
  type PlayerState,
  type RoundState,
  type TeamState,
} from './types'

/** Build the team seating: team index -> seats that belong to it. */
export function buildTeams(
  numPlayers: number,
  numTeams: number,
  scores: number[] = [],
): TeamState[] {
  const teams: TeamState[] = Array.from({ length: numTeams }, (_, id) => ({
    id,
    seats: [],
    melds: [],
    redThrees: [],
    hasMelded: false,
    score: scores[id] ?? 0,
  }))
  for (let seat = 0; seat < numPlayers; seat++) {
    teams[teamOfSeat(seat, numTeams)]!.seats.push(seat)
  }
  return teams
}

/**
 * Create a fresh round from a seed. `scores` carries cumulative game scores
 * into the new round (defaults to all zero) so meld minimums work across rounds.
 */
export function createRound(
  seed: number,
  config: GameConfig = DEFAULT_CONFIG,
  scores: number[] = [],
): RoundState {
  const shoe = shuffle(buildShoe(config.numDecks), makeRng(seed))
  const { hands, stock, discard } = deal(
    shoe,
    config.numPlayers,
    config.cardsPerPlayer,
  )

  const players: PlayerState[] = hands.map((hand, seat) => ({
    seat,
    teamId: teamOfSeat(seat, config.numTeams),
    hand,
  }))

  const teams = buildTeams(config.numPlayers, config.numTeams, scores)

  // The pile starts frozen if the turned-up card is a wild or a red 3.
  const top = discard[discard.length - 1]!
  const frozen = isWild(top) || isRed3(top)

  return {
    players,
    teams,
    stock,
    discard: { cards: discard, frozen },
    currentSeat: 0,
    phase: 'draw',
    tookDiscard: false,
    over: false,
  }
}

/** Create a new game (round 0) from a seed. */
export function createGame(
  seed: number,
  config: GameConfig = DEFAULT_CONFIG,
): GameState {
  return {
    config,
    round: createRound(seed, config),
    roundNumber: 0,
    over: false,
  }
}
