// The perspective player's hand, fanned and sorted for readability.
// Scrolls horizontally on narrow screens rather than wrapping. When
// `selectable`, each card is a button that toggles selection (Phase 6).

import type { Card as CardModel, Rank } from '../engine/cards'
import Card from './Card'

const ORDER: Rank[] = [
  'JOKER',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
]

function sortHand(hand: readonly CardModel[]): CardModel[] {
  return hand.slice().sort((a, b) => {
    const r = ORDER.indexOf(a.rank) - ORDER.indexOf(b.rank)
    if (r !== 0) return r
    return (a.suit ?? '').localeCompare(b.suit ?? '')
  })
}

interface HandProps {
  hand: readonly CardModel[]
  selectable?: boolean
  selected?: readonly string[]
  onToggle?: (cardId: string) => void
}

export default function Hand({
  hand,
  selectable,
  selected = [],
  onToggle,
}: HandProps) {
  const cards = sortHand(hand)
  return (
    <div className="flex overflow-x-auto pb-1">
      {cards.map((c, i) => {
        const isSelected = selected.includes(c.id)
        const offset = i === 0 ? '' : '-ml-3'
        if (!selectable) {
          return (
            <div key={c.id} className={offset}>
              <Card card={c} size="md" />
            </div>
          )
        }
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle?.(c.id)}
            aria-pressed={isSelected}
            className={`${offset} rounded-md transition-transform ${
              isSelected ? '-translate-y-2 ring-2 ring-yellow-300' : ''
            }`}
          >
            <Card card={c} size="md" />
          </button>
        )
      })}
    </div>
  )
}
