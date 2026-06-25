// The human's control panel for their turn. Phase-aware: draw-phase shows
// draw/take-pile choices; action-phase shows meld/lay-off/discard. It reads the
// legal options from the human-action interface and routes clicks to the
// interaction controller via `onIntent`. Feedback and go-out confirmation
// (illegal-move messages, "this ends the round") live here too.

import { useMemo } from 'react'
import { availableActions } from '../game/moves'
import type { GameConfig, RoundState } from '../engine/types'
import { meldHint, type UiIntent, type UiState } from './controller'

interface ActionBarProps {
  round: RoundState
  config: GameConfig
  ui: UiState
  onIntent: (intent: UiIntent) => void
}

const BTN =
  'rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

export default function ActionBar({
  round,
  config,
  ui,
  onIntent,
}: ActionBarProps) {
  // Enumerating legal moves walks the rules engine; recompute only when the
  // round actually changes, not on every unrelated re-render.
  const moves = useMemo(() => availableActions(round), [round])
  const { selected } = ui

  // Go-out confirmation takes over the bar until resolved.
  if (ui.confirmingGoOut) {
    return (
      <div className="space-y-2 rounded-md border border-yellow-400/50 bg-yellow-400/10 p-2">
        <p className="text-center text-sm font-semibold text-yellow-200">
          {ui.feedback ?? 'Go out and end the round?'}
        </p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            className={`${BTN} bg-yellow-400 text-yellow-950 hover:bg-yellow-300`}
            onClick={() => onIntent({ type: 'CONFIRM_GO_OUT' })}
          >
            Go out ✓
          </button>
          <button
            type="button"
            className={`${BTN} bg-white/15 text-white hover:bg-white/25`}
            onClick={() => onIntent({ type: 'CANCEL_GO_OUT' })}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Only hint about melding when the player is plausibly building one (2+ cards
  // selected). A single selected card reads as a discard, so a "needs 3 cards"
  // meld error there is misleading.
  const hint =
    moves.phase === 'action' && selected.length >= 2
      ? meldHint(round, config, selected)
      : null

  return (
    <div className="space-y-2">
      {ui.feedback && (
        <button
          type="button"
          onClick={() => onIntent({ type: 'DISMISS_FEEDBACK' })}
          className="block w-full rounded-md bg-red-500/20 px-3 py-1.5 text-center text-xs text-red-200"
        >
          {ui.feedback}{' '}
          <span className="text-red-300/60">(tap to dismiss)</span>
        </button>
      )}

      {moves.phase === 'draw' ? (
        <div className="flex flex-wrap justify-center gap-2">
          {moves.canDrawStock || moves.takePile.length > 0 ? (
            <button
              type="button"
              disabled={!moves.canDrawStock}
              className={`${BTN} bg-indigo-500 text-white hover:bg-indigo-400`}
              onClick={() => onIntent({ type: 'DRAW_STOCK' })}
            >
              Draw stock
            </button>
          ) : (
            // Stock is empty and nothing can be taken — without this the human
            // would have no control to act with and the round would stall.
            <button
              type="button"
              className={`${BTN} bg-amber-500 text-amber-950 hover:bg-amber-400`}
              onClick={() => onIntent({ type: 'DRAW_STOCK' })}
            >
              No cards to draw — end round
            </button>
          )}
          {moves.takePile.map((option, i) => (
            <button
              key={i}
              type="button"
              className={`${BTN} bg-sky-500 text-white hover:bg-sky-400`}
              onClick={() => onIntent({ type: 'TAKE_PILE', option })}
            >
              Take pile{option.withCardIds.length > 0 ? ' + meld' : ''}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={selected.length === 0}
              className={`${BTN} bg-emerald-500 text-white hover:bg-emerald-400`}
              onClick={() => onIntent({ type: 'MELD_SELECTED' })}
            >
              Meld
            </button>
            <button
              type="button"
              disabled={selected.length === 0}
              className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-500`}
              onClick={() => onIntent({ type: 'LAYOFF_SELECTED' })}
            >
              Lay off
            </button>
            <button
              type="button"
              disabled={selected.length !== 1}
              className={`${BTN} bg-rose-500 text-white hover:bg-rose-400`}
              onClick={() => onIntent({ type: 'DISCARD_SELECTED' })}
            >
              Discard
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                className={`${BTN} bg-white/15 text-white hover:bg-white/25`}
                onClick={() => onIntent({ type: 'CLEAR_SELECTION' })}
              >
                Clear
              </button>
            )}
          </div>
          {hint && (
            <p className="text-center text-[0.65rem] text-white/50">
              To meld: {hint}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
