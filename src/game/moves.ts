// Human-action interface: surface the engine actions a player may take right
// now, so a UI can render affordances and validate a choice before dispatching.
//
// Legal-move enumeration already lives in the bots layer (it's generic, not
// bot-specific), so we reuse it here rather than duplicate rule knowledge. The
// engine's `apply` remains the final arbiter of legality.

import { apply, type Action } from '../engine/actions'
import type { Rank } from '../engine/cards'
import {
  layoffPlan,
  naturalNewMelds,
  takePileOptions,
  topDiscard,
} from '../bots/moves'
import type { GameConfig, RoundState } from '../engine/types'

export interface AvailableActions {
  /** Whose turn it is and which phase they're in. */
  seat: number
  phase: RoundState['phase']
  /** Draw phase: may draw from the stock. */
  canDrawStock: boolean
  /** Draw phase: legal ways to take the discard pile (empty if not allowed). */
  takePile: Extract<Action, { type: 'TAKE_PILE' }>[]
  /** Action phase: natural melds that could be laid from hand. */
  melds: { rank: Rank; cardIds: string[] }[]
  /** Action phase: cards that can extend the team's existing melds. */
  layoffs: { targetRank: Rank; cardIds: string[] }[]
  /** Action phase: hand card ids that may be discarded. */
  discardable: string[]
}

/**
 * Enumerate the actions available to the current seat. Melds/lay-offs surface
 * the canonical natural options (the finer free-form selection a human gets is
 * Phase 6 UI work); the engine still validates whatever action is dispatched.
 */
export function availableActions(round: RoundState): AvailableActions {
  const player = round.players[round.currentSeat]!
  const team = round.teams[player.teamId]!
  const drawing = round.phase === 'draw'

  return {
    seat: round.currentSeat,
    phase: round.phase,
    canDrawStock: drawing && round.stock.length > 0,
    takePile: drawing ? takePileOptions(round, team, player.hand) : [],
    melds: !drawing
      ? naturalNewMelds(player.hand, team).map((m) => ({
          rank: m.rank,
          cardIds: m.cards.map((c) => c.id),
        }))
      : [],
    layoffs: !drawing ? layoffPlan(player.hand, team) : [],
    discardable: !drawing ? player.hand.map((c) => c.id) : [],
  }
}

/** Whether a proposed action is currently legal, without committing to it. */
export function canApply(
  round: RoundState,
  action: Action,
  config: GameConfig,
): boolean {
  return apply(round, action, config).ok
}

/** The reason an action is illegal, or null if it's legal. For UI feedback. */
export function rejectionReason(
  round: RoundState,
  action: Action,
  config: GameConfig,
): string | null {
  const result = apply(round, action, config)
  return result.ok ? null : result.reason
}

/** The current top card of the discard pile (re-exported for UI convenience). */
export { topDiscard }
