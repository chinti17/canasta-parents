import Card from './ui/Card'
import type { Card as CardModel } from './engine/cards'

const sample: CardModel[] = [
  { id: '1', rank: 'A', suit: 'spades' },
  { id: '2', rank: 'K', suit: 'hearts' },
  { id: '3', rank: '7', suit: 'diamonds' },
  { id: '4', rank: '2', suit: 'clubs' },
  { id: '5', rank: 'JOKER' },
]

export default function App() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-green-800 px-4 py-10 text-white">
      <h1 className="text-2xl font-bold tracking-tight">Canasta</h1>
      <p className="text-sm text-green-200">Phase 5 — card rendering preview</p>
      <div className="flex items-end gap-2">
        {sample.map((c) => (
          <Card key={c.id} card={c} size="lg" />
        ))}
        <Card faceDown size="lg" />
      </div>
    </main>
  )
}
