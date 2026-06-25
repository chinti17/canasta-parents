// A team's laid-down cards: its melds plus a red-3 tally. Read-only.

import type { TeamState } from '../engine/types'
import MeldView from './MeldView'
import { teamColors } from './theme'

export default function TeamMelds({ team }: { team: TeamState }) {
  const c = teamColors(team.id)
  return (
    <div className={`rounded-md border p-2 ${c.border} ${c.panel}`}>
      <div className="mb-1 flex items-center justify-between text-[0.65rem]">
        <span className={`font-semibold ${c.text}`}>{c.label}</span>
        {team.redThrees.length > 0 && (
          <span className="text-red-400" title="red 3s">
            ♦♥ ×{team.redThrees.length}
          </span>
        )}
      </div>
      {team.melds.length === 0 ? (
        <p className="text-[0.65rem] text-white/40">no melds yet</p>
      ) : (
        <div className="flex flex-col gap-1">
          {team.melds.map((m) => (
            <MeldView key={m.rank} meld={m} />
          ))}
        </div>
      )}
    </div>
  )
}
