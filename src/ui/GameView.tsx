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
import CenterTable from './CenterTable'
import Scoreboard from './Scoreboard'
import { teamColors } from './theme'

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
  const winnerColors = session.winningTeam !== undefined
    ? teamColors(session.winningTeam)
    : null

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
        <span className="rounded bg-black/20 px-1.5 py-0.5">spectator preview</span>
      </header>

      {session.over && winnerColors ? (
        <div
          className={`rounded-md border px-3 py-2 text-center text-sm font-bold text-white ${winnerColors.border} ${winnerColors.panel}`}
        >
          🏆 {winnerColors.label} wins the game!
        </div>
      ) : (
        <div className="rounded-md bg-black/20 px-3 py-1.5 text-center text-xs text-green-100">
          Round {session.roundNumber + 1} · P{round.currentSeat + 1} to{' '}
          <span className="font-semibold">{round.phase}</span>
        </div>
      )}

      <Scoreboard teams={round.teams} scores={session.scores} />

      {/* Opponents */}
      <section className="grid grid-cols-2 gap-2">
        {opponents.map(seatChip)}
      </section>

      <CenterTable round={round} />

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
