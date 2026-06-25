// The front door. Instead of auto-dealing on load, the player explicitly starts
// a New Game or Resumes a saved one (only offered when a valid save exists, with
// a short summary so resuming is never a confusing mid-game drop).

import { useState } from 'react'
import { loadSession, summarizeSave } from '../game/persistence'
import type { GameSession } from '../game/session'
import HowToPlay from './HowToPlay'
import { teamColors } from './theme'

interface StartScreenProps {
  onNewGame: () => void
  onResume: (session: GameSession) => void
}

export default function StartScreen({ onNewGame, onResume }: StartScreenProps) {
  const [help, setHelp] = useState(false)
  // Peek at any saved game once; null when there's nothing valid to resume.
  const [saved] = useState(() => loadSession())
  const summary = saved ? summarizeSave(saved) : null

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 bg-green-900 p-6 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Canasta</h1>
        <p className="mt-1 text-sm text-green-300">1 you · 5 bots · 3 teams</p>
      </div>

      {help ? (
        <div className="w-full">
          <HowToPlay onClose={() => setHelp(false)} />
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onNewGame}
            className="rounded-lg bg-emerald-500 px-4 py-3 text-lg font-bold text-white shadow hover:bg-emerald-400"
          >
            New Game
          </button>

          {saved && summary && (
            <button
              type="button"
              onClick={() => onResume(saved)}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-left hover:bg-white/15"
            >
              <span className="block text-lg font-bold">Resume</span>
              <span className="mt-0.5 block text-xs text-green-200">
                Round {summary.round} ·{' '}
                {summary.yourTurn
                  ? 'your turn'
                  : `P${summary.currentSeat + 1} to play`}{' '}
                ·{' '}
                {summary.scores
                  .map((s, i) => `${teamColors(i).label.replace('Team ', '')} ${s}`)
                  .join(' / ')}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setHelp(true)}
            className="rounded-lg bg-white/5 px-4 py-2.5 text-sm font-semibold text-green-100 hover:bg-white/10"
          >
            How to Play
          </button>
        </div>
      )}
    </main>
  )
}
