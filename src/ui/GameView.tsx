// The live, playable game view (Phases 6–7). Seat 0 is the human; the other
// five seats are bots that take their turns automatically on a timer so play is
// followable. The engine reducer (GameSession) is the single source of truth,
// driven through React's useReducer; local interaction state (selection,
// feedback, go-out confirmation) lives in the pure controller. Round-end and
// game-over flows pause play for a scoreboard / winner screen.

import { useEffect, useReducer, useState } from 'react'
import {
  createSession,
  dispatch as sessionDispatch,
  isBotTurn,
  isHumanTurn,
  type GameSession,
} from '../game/session'
import { loadSession, saveSession } from '../game/persistence'
import { DEFAULT_CONFIG } from '../engine/types'
import Seat from './Seat'
import Hand from './Hand'
import TeamMelds from './TeamMelds'
import CenterTable from './CenterTable'
import Scoreboard from './Scoreboard'
import ActionBar from './ActionBar'
import RoundEnd from './RoundEnd'
import GameOver from './GameOver'
import {
  initialUiState,
  reduceUi,
  type UiIntent,
  type UiState,
} from './controller'

const HUMAN_SEAT = 0
const BOT_STEP_MS = 800

function init(): GameSession {
  // Resume an autosaved game if one exists, otherwise deal a fresh one.
  return loadSession() ?? createSession(1, DEFAULT_CONFIG, HUMAN_SEAT)
}

export default function GameView() {
  const [session, dispatch] = useReducer(sessionDispatch, undefined, init)
  const [ui, setUi] = useState<UiState>(initialUiState)

  // Autosave to localStorage so a refresh or return resumes the game.
  useEffect(() => {
    saveSession(session)
  }, [session])

  // Let bots play themselves on a timer; pause for the human, between rounds,
  // and at game over. (No UI-reset effect needed: every emitted action returns
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
  const betweenRounds = round.over && !session.over
  const myTurn = isHumanTurn(session)
  const acting = myTurn && round.phase === 'action'
  const opponents = round.players
    .map((p) => p.seat)
    .filter((s) => s !== HUMAN_SEAT)

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

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 bg-green-900 p-3 text-white">
      <header className="flex items-center justify-between text-xs text-green-200">
        <span className="font-semibold">Canasta</span>
        <span className="rounded bg-black/20 px-1.5 py-0.5">
          1 human · 5 bots
        </span>
      </header>

      {!round.over && (
        <div
          className={`rounded-md px-3 py-1.5 text-center text-xs transition-colors ${
            myTurn
              ? 'bg-yellow-400/20 text-yellow-100'
              : 'bg-black/20 text-green-100'
          }`}
        >
          Round {session.roundNumber + 1} ·{' '}
          {myTurn
            ? `Your turn — ${round.phase === 'draw' ? 'draw or take the pile' : 'meld, lay off, or discard'}`
            : `P${round.currentSeat + 1} to ${round.phase}`}
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
        {session.over ? (
          <GameOver
            winningTeam={session.winningTeam!}
            scores={session.scores}
            onNewGame={() => dispatch({ type: 'NEW_GAME', seed: Date.now() })}
          />
        ) : betweenRounds && session.lastRoundResult ? (
          <RoundEnd
            result={session.lastRoundResult}
            roundNumber={session.roundNumber}
            onNext={() => dispatch({ type: 'NEXT_ROUND' })}
          />
        ) : (
          <>
            {seatChip(HUMAN_SEAT)}
            <Hand
              hand={round.players[HUMAN_SEAT]!.hand}
              selectable={acting}
              selected={ui.selected}
              onToggle={(cardId) => onIntent({ type: 'TOGGLE_CARD', cardId })}
            />
            {myTurn && (
              <ActionBar
                round={round}
                config={session.config}
                ui={ui}
                onIntent={onIntent}
              />
            )}
          </>
        )}
      </section>
    </main>
  )
}
