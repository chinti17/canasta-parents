// A team's laid-down cards: its melds plus a red-3 tally. Read-only. Stays
// compact — an empty team is a single line so the table fits a phone.

import type { TeamState } from '../engine/types'
import MeldView from './MeldView'
import { teamColors } from './theme'

export default function TeamMelds({ team }: { team: TeamState }) {
  const c = teamColors(team.id)
  const empty = team.melds.length === 0
  return (
    <div className={`rounded-md border px-2 py-1 ${c.border} ${c.panel}`}>
      <div className="flex items-center justify-between text-[0.65rem]">
        <span className={`font-semibold ${c.text}`}>{c.label}</span>
        <span className="flex items-center gap-2">
          {team.redThrees.length > 0 && (
            <span className="text-red-400" title="red 3s">
              ♦♥ ×{team.redThrees.length}
            </span>
          )}
          {empty && <span className="text-white/40">no melds yet</span>}
        </span>
      </div>
      {!empty && (
        <div className="mt-1 flex flex-col gap-1">
          {team.melds.map((m) => (
            <MeldView key={m.rank} meld={m} />
          ))}
        </div>
      )}
    </div>
  )
}
