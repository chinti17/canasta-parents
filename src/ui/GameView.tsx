// The live game view. Drives a GameSession through React's useReducer (the
// engine reducer is the single source of truth) and auto-advances every seat
// on a timer so Phase 5 shows a full game playing out, read-only.
//
// Phase 5 is a spectator preview: there is no human seat yet (humanSeat = -1),
// so all six seats are bot-driven. Interaction arrives in Phase 6.

import { useEffect, useReducer } from 'react'
import {
  createSession,
  dispatch as sessionDispatch,
  type GameSession,
} from '../game/session'
import { DEFAULT_CONFIG } from '../engine/types'
import Seat from './Seat'
import Hand from './Hand'
import TeamMelds from './TeamMelds'

const SPECTATOR_SEAT = -1
const STEP_MS = 700
const PERSPECTIVE = 0

function init(): GameSession {
  return createSession(1, DEFAULT_CONFIG, SPECTATOR_SEAT)
}

export default function GameView() {
  const [session, dispatch] = useReducer(sessionDispatch, undefined, init)

  // Auto-step the table until the game is over.
  useEffect(() => {
    if (session.over || session.round.over) return
    const t = setTimeout(() => dispatch({ type: 'BOT_STEP' }), STEP_MS)
    return () => clearTimeout(t)
  }, [session])

  const { round } = session
  const seats = round.players.map((p) => p.seat)
  const opponents = seats.filter((s) => s !== PERSPECTIVE)

  const seatChip = (seat: number) => {
    const p = round.players[seat]!
    return (
      <Seat
        key={seat}
        label={`P${seat + 1}`}
        teamId={p.teamId}
        handCount={p.hand.length}
        isActive={!round.over && round.currentSeat === seat}
        hasMelded={round.teams[p.teamId]!.hasMelded}
        you={seat === PERSPECTIVE}
      />
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 bg-green-900 p-3 text-white">
      <header className="flex items-center justify-between text-xs text-green-200">
        <span className="font-semibold">Canasta</span>
        <span>
          Round {session.roundNumber + 1} ·{' '}
          {session.over ? 'game over' : `seat P${round.currentSeat + 1} to ${round.phase}`}
        </span>
      </header>

      {/* Opponents */}
      <section className="grid grid-cols-2 gap-2">
        {opponents.map(seatChip)}
      </section>

      {/* Center table — discard/stock/scores arrive in the next commit */}
      <section className="flex items-center justify-center rounded-lg border border-white/10 bg-green-800/50 p-3 text-center text-xs text-white/50">
        table centre (discard · stock · scores) — coming next
      </section>

      {/* Melds, grouped by team */}
      <section className="grid gap-2">
        {round.teams.map((t) => (
          <TeamMelds key={t.id} team={t} />
        ))}
      </section>

      {/* Perspective seat + hand */}
      <section className="mt-auto space-y-2">
        {seatChip(PERSPECTIVE)}
        <Hand hand={round.players[PERSPECTIVE]!.hand} />
      </section>
    </main>
  )
}
