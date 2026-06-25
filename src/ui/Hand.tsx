// The perspective player's hand, fanned and sorted for readability.
// Scrolls horizontally on narrow screens rather than wrapping.

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

export default function Hand({ hand }: { hand: readonly CardModel[] }) {
  const cards = sortHand(hand)
  return (
    <div className="flex overflow-x-auto pb-1">
      {cards.map((c, i) => (
        <div key={c.id} className={i === 0 ? '' : '-ml-3'}>
          <Card card={c} size="md" />
        </div>
      ))}
    </div>
  )
}
