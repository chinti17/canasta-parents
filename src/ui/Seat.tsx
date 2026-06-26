// A compact seat summary: who sits here, their team, card count, and whether
// it's their turn. Used for the five opponents and the player's own header.

import { teamColors } from './theme'

interface SeatProps {
  label: string
  teamId: number
  handCount: number
  isActive: boolean
  hasMelded: boolean
  /** Highlight the human's perspective seat. */
  you?: boolean
  /** This seat is the human's partner (same team). */
  partner?: boolean
}

export default function Seat({
  label,
  teamId,
  handCount,
  isActive,
  hasMelded,
  you,
  partner,
}: SeatProps) {
  const c = teamColors(teamId)
  const teamLetter = c.label.replace('Team ', '')
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 transition-all ${c.border} ${c.panel} ${
        isActive ? 'ring-2 ring-white/80' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 truncate">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.55rem] font-bold text-white ${c.bg}`}
          title={c.label}
        >
          {teamLetter}
        </span>
        <span className="truncate text-xs font-semibold text-white">
          {label}
          {you && <span className="ml-1 text-white/60">(you)</span>}
          {partner && <span className="ml-1 text-white/60">(partner)</span>}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[0.65rem] text-white/70">
        {hasMelded && <span title="has melded">●</span>}
        <span className="rounded bg-black/30 px-1 font-mono">{handCount}🂠</span>
      </div>
    </div>
  )
}
