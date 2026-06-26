// The live, playable game view (Phases 6–7). Seat 0 is the human; the other
// five seats are bots that take their turns automatically on a timer so play is
// followable. The engine reducer (GameSession) is the single source of truth,
// driven through React's useReducer; local interaction state (selection,
// feedback, go-out confirmation) lives in the pure controller. Round-end and
// game-over flows pause play for a scoreboard / winner screen.

import { useEffect, useReducer, useRef, useState } from 'react'
import {
  dispatch as sessionDispatch,
  isBotTurn,
  isHumanTurn,
  type GameSession,
} from '../game/session'
import { clearSession, saveSession } from '../game/persistence'
import Seat from './Seat'
import Hand from './Hand'
import TeamMelds from './TeamMelds'
import CenterTable from './CenterTable'
import Scoreboard from './Scoreboard'
import ActionBar from './ActionBar'
import RoundEnd from './RoundEnd'
import GameOver from './GameOver'
import PlayFeed from './PlayFeed'
import { summarizePlay, type PlayEntry } from './playLog'
import {
  initialUiState,
  reduceUi,
  type UiIntent,
  type UiState,
} from './controller'

const HUMAN_SEAT = 0
const BOT_STEP_MS = 800

interface GameViewProps {
  /** The session to play — created by the start screen (New Game or Resume). */
  initialSession: GameSession
  /** Return to the start screen (front door). */
  onHome: () => void
}

export default function GameView({ initialSession, onHome }: GameViewProps) {
  const [session, dispatch] = useReducer(sessionDispatch, initialSession)
  const [ui, setUi] = useState<UiState>(initialUiState)
  // One-time first-turn nudge, dismissed on the player's first action.
  const [tipDismissed, setTipDismissed] = useState(false)

  // Recent-plays feed, derived by diffing the round on each change (display
  // only; ephemeral — not persisted). Skip new deals / game transitions.
  const [feed, setFeed] = useState<PlayEntry[]>([])
  const prev = useRef({
    round: initialSession.round,
    roundNumber: initialSession.roundNumber,
  })
  useEffect(() => {
    const p = prev.current
    if (p.round === session.round) return
    if (p.roundNumber === session.roundNumber) {
      const entry = summarizePlay(p.round, session.round)
      if (entry) setFeed((f) => [entry, ...f].slice(0, 8))
    } else {
      setFeed([]) // new round dealt — start the feed fresh
    }
    prev.current = { round: session.round, roundNumber: session.roundNumber }
  }, [session.round, session.roundNumber])

  // Autosave so a refresh resumes the game — but forget a finished game so the
  // start screen never offers to "resume" something that's already over.
  useEffect(() => {
    if (session.over) clearSession()
    else saveSession(session)
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
    if (action) {
      dispatch({ type: 'PLAYER_ACTION', action })
      setTipDismissed(true)
    }
  }

  const { round } = session
  const betweenRounds = round.over && !session.over
  const myTurn = isHumanTurn(session)
  // Show the new-player nudge only on the opening turn, until first acted.
  const showTip = myTurn && !tipDismissed && session.roundNumber === 0
  const acting = myTurn && round.phase === 'action'
  const opponents = round.players
    .map((p) => p.seat)
    .filter((s) => s !== HUMAN_SEAT)

  const humanTeam = round.players[HUMAN_SEAT]!.teamId
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
        partner={seat !== HUMAN_SEAT && p.teamId === humanTeam}
      />
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 bg-green-900 p-3 text-white">
      <header className="flex items-center justify-between text-xs text-green-200">
        <span className="font-semibold">Canasta</span>
        <button
          type="button"
          onClick={onHome}
          className="rounded bg-black/20 px-1.5 py-0.5 hover:bg-black/30"
        >
          ☰ Menu
        </button>
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

      <PlayFeed entries={feed} />

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
            {showTip && (
              <div className="animate-fade-in rounded-md border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-[0.7rem] text-yellow-100">
                👋 Your turn. First <b>draw the stock</b> (or take the pile), then
                tap cards to <b>meld</b> and <b>discard</b> one to finish.
              </div>
            )}
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
