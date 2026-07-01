// The front door. Instead of auto-dealing on load, the player explicitly starts
// a New Game or Resumes a saved one (only offered when a valid save exists, with
// a short summary so resuming is never a confusing mid-game drop). New Game
// first asks which of the six names is yours; the rest are drafted into teams.

import { useState } from 'react'
import { loadSession, summarizeSave } from '../game/persistence'
import { PLAYER_NAMES } from '../game/players'
import type { GameSession } from '../game/session'
import HowToPlay from './HowToPlay'
import { teamColors } from './theme'

interface StartScreenProps {
  onNewGame: (name: string) => void
  onResume: (session: GameSession) => void
}

export default function StartScreen({ onNewGame, onResume }: StartScreenProps) {
  const [help, setHelp] = useState(false)
  // Once "New Game" is tapped we ask for the player's name before dealing.
  const [choosingName, setChoosingName] = useState(false)
  const [name, setName] = useState<string>(PLAYER_NAMES[0])
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
      ) : choosingName ? (
        <div className="animate-fade-in flex w-full flex-col gap-3">
          <label
            className="text-sm font-semibold text-green-100"
            htmlFor="player-name"
          >
            Choose your name
          </label>
          <select
            id="player-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-white/20 bg-green-800 px-4 py-3 text-lg font-semibold text-white"
          >
            {PLAYER_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <p className="text-xs text-green-300">
            You'll be dealt a random partner and two opposing teams.
          </p>
          <button
            type="button"
            onClick={() => onNewGame(name)}
            className="rounded-lg bg-emerald-500 px-4 py-3 text-lg font-bold text-white shadow hover:bg-emerald-400"
          >
            Start Game
          </button>
          <button
            type="button"
            onClick={() => setChoosingName(false)}
            className="rounded-lg bg-white/5 px-4 py-2.5 text-sm font-semibold text-green-100 hover:bg-white/10"
          >
            Back
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => setChoosingName(true)}
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
              <span className="block text-lg font-bold">
                Resume as {summary.playerName}
              </span>
              <span className="mt-0.5 block text-xs text-green-200">
                Round {summary.round} ·{' '}
                {summary.yourTurn
                  ? 'your turn'
                  : `${summary.currentName} to play`}{' '}
                ·{' '}
                {summary.scores
                  .map(
                    (s, i) =>
                      `${teamColors(i).label.replace('Team ', '')} ${s}`,
                  )
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
