// The table centre: the stock (face-down + count) and the discard pile shown as
// a fanned row of the last few real cards (most-recent on top), with the pile
// count and frozen badge.

import type { RoundState } from '../engine/types'
import Card from './Card'

// How many of the most recent discards to show as cards.
const RECENT = 5

export default function CenterTable({ round }: { round: RoundState }) {
  const pile = round.discard.cards
  const recent = pile.slice(-RECENT) // oldest -> newest (newest is the top)

  return (
    <section className="flex items-center justify-center gap-6 rounded-lg border border-white/10 bg-green-800/50 p-4">
      {/* Stock */}
      <div className="flex flex-col items-center gap-1">
        <Card faceDown size="lg" />
        <span className="font-mono text-[0.65rem] text-white/70">
          {round.stock.length} stock
        </span>
      </div>

      {/* Discard pile — recent cards fanned, newest highlighted */}
      <div className="flex flex-col items-center gap-1">
        {recent.length > 0 ? (
          <div className="flex">
            {recent.map((c, i) => {
              const newest = i === recent.length - 1
              return (
                <div
                  key={c.id}
                  className={`${i === 0 ? '' : '-ml-6'} ${
                    newest ? 'z-10' : 'opacity-80'
                  }`}
                >
                  <Card card={c} size="lg" />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-20 w-14 rounded-lg border border-dashed border-white/20" />
        )}
        <span className="font-mono text-[0.65rem] text-white/70">
          {pile.length} pile
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
