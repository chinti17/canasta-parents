// The live, playable game view (Phase 6). Seat 0 is the human; the other five
// seats are bots that take their turns automatically on a timer so play is
// followable. The engine reducer (GameSession) is the single source of truth,
// driven through React's useReducer; local interaction state (selection,
// feedback, go-out confirmation) lives in the pure controller.

import { useEffect, useReducer, useState } from 'react'
import {
  createSession,
  dispatch as sessionDispatch,
  isBotTurn,
  isHumanTurn,
  type GameSession,
} from '../game/session'
import { DEFAULT_CONFIG } from '../engine/types'
import Seat from './Seat'
import Hand from './Hand'
import TeamMelds from './TeamMelds'
import CenterTable from './CenterTable'
import Scoreboard from './Scoreboard'
import ActionBar from './ActionBar'
import {
  initialUiState,
  reduceUi,
  type UiIntent,
  type UiState,
} from './controller'
import { teamColors } from './theme'

const HUMAN_SEAT = 0
const BOT_STEP_MS = 800

function init(): GameSession {
  return createSession(1, DEFAULT_CONFIG, HUMAN_SEAT)
}

export default function GameView() {
  const [session, dispatch] = useReducer(sessionDispatch, undefined, init)
  const [ui, setUi] = useState<UiState>(initialUiState)

  // Let bots play themselves on a timer; pause when it's the human's turn.
  // (Local UI state needs no reset effect: every emitted action returns
  // `initialUiState`, and the human's turn can only end by emitting one.)
  useEffect(() => {
    if (!isBotTurn(session)) return
    const t = setTimeout(() => dispatch({ type: 'BOT_STEP' }), BOT_STEP_MS)
    return () => clearTimeout(t)
  }, [session])

  const onIntent = (intent: UiIntent) => {
    const { ui: nextUi, action } = reduceUi(
      session.round,
      session.config,
      ui,
      intent,
    )
    setUi(nextUi)
    if (action) dispatch({ type: 'PLAYER_ACTION', action })
  }

  const { round } = session
  const myTurn = isHumanTurn(session)
  const acting = myTurn && round.phase === 'action'
  const opponents = round.players
    .map((p) => p.seat)
    .filter((s) => s !== HUMAN_SEAT)
  const winnerColors =
    session.winningTeam !== undefined ? teamColors(session.winningTeam) : null

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
        you={seat === HUMAN_SEAT}
      />
    )
  }

  const status = session.over
    ? ''
    : myTurn
      ? `Your turn — ${round.phase === 'draw' ? 'draw or take the pile' : 'meld, lay off, or discard'}`
      : `P${round.currentSeat + 1} to ${round.phase}`

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 bg-green-900 p-3 text-white">
      <header className="flex items-center justify-between text-xs text-green-200">
        <span className="font-semibold">Canasta</span>
        <span className="rounded bg-black/20 px-1.5 py-0.5">
          1 human · 5 bots
        </span>
      </header>

      {session.over && winnerColors ? (
        <div
          className={`rounded-md border px-3 py-2 text-center text-sm font-bold text-white ${winnerColors.border} ${winnerColors.panel}`}
        >
          🏆 {winnerColors.label} wins the game!
        </div>
      ) : (
        <div
          className={`rounded-md px-3 py-1.5 text-center text-xs ${
            myTurn
              ? 'bg-yellow-400/20 text-yellow-100'
              : 'bg-black/20 text-green-100'
          }`}
        >
          Round {session.roundNumber + 1} · {status}
        </div>
      )}

      <Scoreboard teams={round.teams} scores={session.scores} />

      <section className="grid grid-cols-2 gap-2">
        {opponents.map(seatChip)}
      </section>

      <CenterTable round={round} />

      <section className="grid gap-2">
        {round.teams.map((t) => (
          <TeamMelds key={t.id} team={t} />
        ))}
      </section>

      <section className="mt-auto space-y-2">
        {seatChip(HUMAN_SEAT)}
        <Hand
          hand={round.players[HUMAN_SEAT]!.hand}
          selectable={acting}
          selected={ui.selected}
          onToggle={(cardId) => onIntent({ type: 'TOGGLE_CARD', cardId })}
        />
        {myTurn && !session.over && (
          <ActionBar
            round={round}
            config={session.config}
            ui={ui}
            onIntent={onIntent}
          />
        )}
      </section>
    </main>
  )
}
