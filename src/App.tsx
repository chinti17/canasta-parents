import { useState } from 'react'
import StartScreen from './ui/StartScreen'
import GameView from './ui/GameView'
import { createSession, type GameSession } from './game/session'
import { assignSeatNames } from './game/players'
import { DEFAULT_CONFIG } from './engine/types'

const HUMAN_SEAT = 0

export default function App() {
  // No session until the player chooses New Game or Resume — the app no longer
  // auto-deals on load, so you always start from the front door.
  const [session, setSession] = useState<GameSession | null>(null)

  // Start a fresh game under the chosen name: it takes the human's seat and the
  // rest of the roster is drafted across the bot seats (random partner + teams).
  const startNewGame = (name: string) => {
    const seed = Math.floor(Math.random() * 1_000_000_000)
    const names = assignSeatNames(
      name,
      HUMAN_SEAT,
      DEFAULT_CONFIG.numPlayers,
      seed,
    )
    setSession(createSession(seed, DEFAULT_CONFIG, HUMAN_SEAT, names))
  }

  if (!session) {
    return <StartScreen onNewGame={startNewGame} onResume={setSession} />
  }

  return <GameView initialSession={session} onHome={() => setSession(null)} />
}
