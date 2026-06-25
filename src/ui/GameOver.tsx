// Game-over screen: the winning team, final standings, and a new-game button.

import { teamColors } from './theme'

interface GameOverProps {
  winningTeam: number
  /** Final cumulative scores by team id. */
  scores: number[]
  onNewGame: () => void
}

export default function GameOver({
  winningTeam,
  scores,
  onNewGame,
}: GameOverProps) {
  const standings = scores
    .map((score, id) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
  const winner = teamColors(winningTeam)

  return (
    <div
      className={`animate-fade-in space-y-3 rounded-lg border p-4 text-center ${winner.border} ${winner.panel}`}
    >
      <div className="text-4xl" aria-hidden>
        🏆
      </div>
      <h2 className={`text-lg font-bold ${winner.text}`}>
        {winner.label} wins the game!
      </h2>

      <ol className="space-y-1">
        {standings.map(({ id, score }, i) => {
          const c = teamColors(id)
          return (
            <li
              key={id}
              className={`flex items-center justify-between rounded px-2 py-1 text-sm ${c.panel}`}
            >
              <span className={`font-semibold ${c.text}`}>
                {i + 1}. {c.label}
              </span>
              <span className="font-mono font-bold text-white">{score}</span>
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        onClick={onNewGame}
        className="w-full rounded-md bg-white/15 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/25"
      >
        New game
      </button>
    </div>
  )
}
