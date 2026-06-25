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
}

export default function Seat({
  label,
  teamId,
  handCount,
  isActive,
  hasMelded,
  you,
}: SeatProps) {
  const c = teamColors(teamId)
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 ${c.border} ${c.panel} ${
        isActive ? 'ring-2 ring-white/80' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 truncate">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.bg}`} />
        <span className="truncate text-xs font-semibold text-white">
          {label}
          {you && <span className="ml-1 text-white/60">(you)</span>}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[0.65rem] text-white/70">
        {hasMelded && <span title="has melded">●</span>}
        <span className="rounded bg-black/30 px-1 font-mono">{handCount}🂠</span>
      </div>
    </div>
  )
}
