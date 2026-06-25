// Cumulative team scores with canasta counts. The leading team is highlighted.

import { countCanastas } from '../engine/melds'
import type { TeamState } from '../engine/types'
import { teamColors } from './theme'

interface ScoreboardProps {
  teams: TeamState[]
  /** Cumulative game scores by team id. */
  scores: number[]
}

export default function Scoreboard({ teams, scores }: ScoreboardProps) {
  const leader = scores.indexOf(Math.max(...scores))
  return (
    <section className="grid grid-cols-3 gap-2">
      {teams.map((team) => {
        const c = teamColors(team.id)
        const isLeader = team.id === leader
        return (
          <div
            key={team.id}
            className={`rounded-md border px-2 py-1 text-center ${c.border} ${c.panel} ${
              isLeader ? 'ring-1 ring-white/50' : ''
            }`}
          >
            <div className={`text-[0.6rem] font-semibold ${c.text}`}>
              {c.label}
            </div>
            <div className="font-mono text-sm font-bold text-white">
              {scores[team.id] ?? 0}
            </div>
            <div className="text-[0.55rem] text-white/50">
              {countCanastas(team.melds)} canasta
              {countCanastas(team.melds) === 1 ? '' : 's'}
            </div>
          </div>
        )
      })}
    </section>
  )
}
