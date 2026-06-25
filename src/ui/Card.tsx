// A single playing card, drawn entirely in CSS/markup (no image assets).
// Crisp at any size and fully restyleable. Supports face-down (deck back),
// jokers, and a subtle ring for wild cards (jokers and 2s).

import { isWild, type Card as CardModel } from '../engine/cards'
import { suitStyle } from './theme'

export type CardSize = 'sm' | 'md' | 'lg'

const SIZES: Record<CardSize, string> = {
  sm: 'w-7 h-10 text-[0.6rem] rounded',
  md: 'w-11 h-16 text-sm rounded-md',
  lg: 'w-14 h-20 text-base rounded-lg',
}

const PIP: Record<CardSize, string> = {
  sm: 'text-base',
  md: 'text-2xl',
  lg: 'text-3xl',
}

interface CardProps {
  card?: CardModel
  size?: CardSize
  faceDown?: boolean
}

export default function Card({ card, size = 'md', faceDown }: CardProps) {
  if (faceDown || !card) {
    return (
      <div
        className={`${SIZES[size]} shrink-0 border border-indigo-300/30 bg-indigo-700 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.12)_3px,rgba(255,255,255,0.12)_6px)] shadow-sm`}
        aria-label="face-down card"
      />
    )
  }

  const wild = isWild(card)
  const ring = wild ? 'ring-2 ring-violet-400' : ''

  if (card.rank === 'JOKER') {
    return (
      <div
        className={`${SIZES[size]} ${ring} flex shrink-0 flex-col items-center justify-center border border-violet-300 bg-white font-bold text-violet-600 shadow-sm`}
        aria-label="Joker"
      >
        <span className={PIP[size]}>★</span>
        <span className="leading-none">JKR</span>
      </div>
    )
  }

  const { symbol, red } = suitStyle(card.suit!)
  const ink = red ? 'text-red-600' : 'text-slate-900'

  return (
    <div
      className={`${SIZES[size]} ${ring} ${ink} relative flex shrink-0 flex-col justify-between border border-slate-300 bg-white p-0.5 font-semibold shadow-sm`}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <span className="leading-none">
        {card.rank}
        <span className="ml-px">{symbol}</span>
      </span>
      <span className={`${PIP[size]} self-center leading-none`}>{symbol}</span>
      <span className="self-end leading-none">
        {card.rank}
        <span className="ml-px">{symbol}</span>
      </span>
    </div>
  )
}
