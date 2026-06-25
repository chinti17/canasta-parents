// Interaction controller for the human player's turn — pure and UI-framework
// free, so it's unit-testable in Node without a DOM (the repo's dep ceiling is
// React/Vite/Tailwind/Vitest). React components hold this state and dispatch
// intents; the controller turns an intent into the engine `Action` to apply
// (if any) and the next bit of local UI state (selection, feedback, go-out
// confirmation). The engine remains the source of truth for legality.

import { apply, type Action } from '../engine/actions'
import type { Rank } from '../engine/cards'
import type { GameConfig, RoundState } from '../engine/types'

export interface UiState {
  /** Hand card ids the player has selected, in click order. */
  selected: string[]
  /** Transient message: an illegal-move reason or a confirmation prompt. */
  feedback: string | null
  /** A pending action that would end the round, awaiting confirmation. */
  confirmingGoOut: Action | null
}

export const initialUiState: UiState = {
  selected: [],
  feedback: null,
  confirmingGoOut: null,
}

export type UiIntent =
  | { type: 'TOGGLE_CARD'; cardId: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'DRAW_STOCK' }
  | { type: 'TAKE_PILE'; option: Extract<Action, { type: 'TAKE_PILE' }> }
  | { type: 'MELD_SELECTED' }
  | { type: 'LAYOFF_SELECTED' }
  | { type: 'DISCARD_SELECTED' }
  | { type: 'CONFIRM_GO_OUT' }
  | { type: 'CANCEL_GO_OUT' }
  | { type: 'DISMISS_FEEDBACK' }

export interface ControllerResult {
  ui: UiState
  /** Engine action the React layer should dispatch to the session, if any. */
  action: Action | null
}

const stay = (ui: UiState): ControllerResult => ({ ui, action: null })
const note = (ui: UiState, feedback: string): ControllerResult =>
  stay({ ...ui, feedback })

/**
 * Validate a candidate action against the engine and decide what to do:
 * - illegal → keep the selection and surface the engine's reason;
 * - legal but ends the round → hold it for an explicit go-out confirmation;
 * - legal otherwise → emit it and reset the selection.
 */
function attempt(
  round: RoundState,
  config: GameConfig,
  action: Action,
  ui: UiState,
): ControllerResult {
  const result = apply(round, action, config)
  if (!result.ok) return note(ui, result.reason)

  // Only a genuine go-out (someone emptied their hand) needs confirmation. A
  // round that ends another way — e.g. drawing from an exhausted stock — is not
  // a go-out and should just proceed.
  const isGoOut = result.round.over && result.round.wentOutSeat !== undefined
  if (isGoOut && ui.confirmingGoOut === null) {
    return stay({
      ...ui,
      confirmingGoOut: action,
      feedback: 'This goes out and ends the round — confirm?',
    })
  }

  return { ui: initialUiState, action }
}

/** Find a layoff onto one of the team's melds that the selection legally fits. */
function findLayoff(
  round: RoundState,
  config: GameConfig,
  cardIds: string[],
): Action | null {
  const player = round.players[round.currentSeat]!
  const team = round.teams[player.teamId]!
  for (const meld of team.melds) {
    const action: Action = { type: 'LAYOFF', cardIds, targetRank: meld.rank }
    if (apply(round, action, config).ok) return action
  }
  return null
}

/**
 * The interaction reducer. Pure: `(round, config, ui, intent) -> { ui, action }`.
 * `action` is the engine action to dispatch (null when the intent only changed
 * local UI state or was rejected).
 */
export function reduceUi(
  round: RoundState,
  config: GameConfig,
  ui: UiState,
  intent: UiIntent,
): ControllerResult {
  switch (intent.type) {
    case 'TOGGLE_CARD': {
      const selected = ui.selected.includes(intent.cardId)
        ? ui.selected.filter((id) => id !== intent.cardId)
        : [...ui.selected, intent.cardId]
      return stay({ ...ui, selected, feedback: null })
    }

    case 'CLEAR_SELECTION':
      return stay({ ...ui, selected: [], feedback: null })

    case 'DISMISS_FEEDBACK':
      return stay({ ...ui, feedback: null })

    case 'DRAW_STOCK':
      return attempt(round, config, { type: 'DRAW_STOCK' }, ui)

    case 'TAKE_PILE':
      return attempt(round, config, intent.option, ui)

    case 'MELD_SELECTED': {
      if (ui.selected.length === 0) return note(ui, 'Select cards to meld.')
      return attempt(round, config, { type: 'MELD', melds: [ui.selected] }, ui)
    }

    case 'LAYOFF_SELECTED': {
      if (ui.selected.length === 0) return note(ui, 'Select cards to lay off.')
      const action = findLayoff(round, config, ui.selected)
      if (!action)
        return note(ui, "Those cards don't extend any of your melds.")
      return attempt(round, config, action, ui)
    }

    case 'DISCARD_SELECTED': {
      if (ui.selected.length !== 1) {
        return note(ui, 'Select exactly one card to discard.')
      }
      const cardId = ui.selected[0]!
      return attempt(round, config, { type: 'DISCARD', cardId }, ui)
    }

    case 'CONFIRM_GO_OUT': {
      if (ui.confirmingGoOut === null) return stay(ui)
      return { ui: initialUiState, action: ui.confirmingGoOut }
    }

    case 'CANCEL_GO_OUT':
      return stay({ ...ui, confirmingGoOut: null, feedback: null })
  }
}

/** A live legality hint for the current selection (null when it's a valid meld). */
export function meldHint(
  round: RoundState,
  config: GameConfig,
  selected: readonly string[],
): string | null {
  if (selected.length === 0) return null
  const result = apply(round, { type: 'MELD', melds: [[...selected]] }, config)
  return result.ok ? null : result.reason
}

/** Ranks of the team's existing melds (layoff targets), for UI hints. */
export function layoffTargets(round: RoundState): Rank[] {
  const player = round.players[round.currentSeat]!
  return round.teams[player.teamId]!.melds.map((m) => m.rank)
}
