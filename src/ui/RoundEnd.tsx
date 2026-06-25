// Round-end scoreboard: the per-team breakdown of the round just played plus
// the new cumulative totals, with a button to deal the next round.

import type { RoundResult } from '../engine/scoring'
import { teamColors } from './theme'

interface RoundEndProps {
  result: RoundResult
  /** Zero-based index of the round that just finished. */
  roundNumber: number
  onNext: () => void
}

const HEAD = 'px-1 text-center font-medium text-white/50'
const CELL = 'px-1 text-center tabular-nums'

export default function RoundEnd({
  result,
  roundNumber,
  onNext,
}: RoundEndProps) {
  return (
    <div className="animate-fade-in space-y-3 rounded-lg border border-white/15 bg-green-800/80 p-3">
      <h2 className="text-center text-sm font-bold">
        Round {roundNumber + 1} complete
      </h2>

      <table className="w-full text-[0.7rem]">
        <thead>
          <tr>
            <th className="px-1 text-left font-medium text-white/50">Team</th>
            <th className={HEAD}>Meld</th>
            <th className={HEAD}>Can.</th>
            <th className={HEAD}>R3</th>
            <th className={HEAD}>Out</th>
            <th className={HEAD}>Hand</th>
            <th className={HEAD}>±</th>
            <th className={HEAD}>Game</th>
          </tr>
        </thead>
        <tbody>
          {result.scores.map((s) => {
            const c = teamColors(s.teamId)
            return (
              <tr key={s.teamId} className="border-t border-white/10">
                <td className={`px-1 text-left font-semibold ${c.text}`}>
                  {c.label}
                </td>
                <td className={CELL}>{s.meldPoints}</td>
                <td className={CELL}>{s.canastaBonus}</td>
                <td className={CELL}>{s.redThreeBonus}</td>
                <td className={CELL}>{s.goOutBonus}</td>
                <td className={`${CELL} text-red-300`}>
                  {s.handPenalty > 0 ? `−${s.handPenalty}` : 0}
                </td>
                <td className={`${CELL} font-bold`}>{s.total}</td>
                <td className={`${CELL} font-mono font-bold`}>
                  {result.cumulative[s.teamId]}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-md bg-indigo-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
      >
        Next round →
      </button>
    </div>
  )
}
