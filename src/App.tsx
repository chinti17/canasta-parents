import { useState } from 'react'
import StartScreen from './ui/StartScreen'
import GameView from './ui/GameView'
import { createSession, type GameSession } from './game/session'
import { DEFAULT_CONFIG } from './engine/types'

const HUMAN_SEAT = 0

export default function App() {
  // No session until the player chooses New Game or Resume — the app no longer
  // auto-deals on load, so you always start from the front door.
  const [session, setSession] = useState<GameSession | null>(null)

  if (!session) {
    return (
      <StartScreen
        onNewGame={() =>
          setSession(
            createSession(
              Math.floor(Math.random() * 1_000_000_000),
              DEFAULT_CONFIG,
              HUMAN_SEAT,
            ),
          )
        }
        onResume={setSession}
      />
    )
  }

  return <GameView initialSession={session} onHome={() => setSession(null)} />
}
