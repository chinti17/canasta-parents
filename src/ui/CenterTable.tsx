// The table centre: the stock (face-down + count), the discard pile (top card
// + count + frozen badge), and a turn/phase indicator.

import type { RoundState } from '../engine/types'
import Card from './Card'

export default function CenterTable({ round }: { round: RoundState }) {
  const top = round.discard.cards[round.discard.cards.length - 1]
  return (
    <section className="flex items-center justify-center gap-6 rounded-lg border border-white/10 bg-green-800/50 p-4">
      {/* Stock */}
      <div className="flex flex-col items-center gap-1">
        <Card faceDown size="lg" />
        <span className="font-mono text-[0.65rem] text-white/70">
          {round.stock.length} stock
        </span>
      </div>

      {/* Discard */}
      <div className="flex flex-col items-center gap-1">
        {top ? (
          <Card card={top} size="lg" />
        ) : (
          <div className="h-20 w-14 rounded-lg border border-dashed border-white/20" />
        )}
        <span className="font-mono text-[0.65rem] text-white/70">
          {round.discard.cards.length} pile
          {round.discard.frozen && (
            <span className="ml-1 rounded bg-sky-300/20 px-1 text-sky-200">
              ❄ frozen
            </span>
          )}
        </span>
      </div>
    </section>
  )
}
