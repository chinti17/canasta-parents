// Card model, deck construction, deterministic shuffle, and dealing.
// Pure module — no React, no DOM. Classic Canasta with a 3-deck shoe.

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades'

export type Rank =
  | 'JOKER'
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'

export interface Card {
  /** Unique within a shoe; cards repeat across the 3 decks so ids disambiguate. */
  id: string
  rank: Rank
  /** Absent for jokers. */
  suit?: Suit
}

export const SUITS: readonly Suit[] = [
  'clubs',
  'diamonds',
  'hearts',
  'spades',
]

export const STANDARD_RANKS: readonly Rank[] = [
  'A',
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
]

const RED_SUITS: readonly Suit[] = ['diamonds', 'hearts']

// --- Card classifiers -------------------------------------------------------

export function isJoker(card: Card): boolean {
  return card.rank === 'JOKER'
}

/** Wild cards are jokers and natural 2s. */
export function isWild(card: Card): boolean {
  return card.rank === 'JOKER' || card.rank === '2'
}

export function isRed3(card: Card): boolean {
  return card.rank === '3' && card.suit !== undefined && RED_SUITS.includes(card.suit)
}

export function isBlack3(card: Card): boolean {
  return (
    card.rank === '3' &&
    (card.suit === 'clubs' || card.suit === 'spades')
  )
}

/** A natural card is any non-wild card (includes black/red 3s). */
export function isNatural(card: Card): boolean {
  return !isWild(card)
}

/**
 * Standard pip value of a card, used for meld point counts and hand penalties.
 * Red-3 *bonuses* (100 each) are handled separately in scoring, not here.
 */
export function cardValue(card: Card): number {
  switch (card.rank) {
    case 'JOKER':
      return 50
    case '2':
    case 'A':
      return 20
    case 'K':
    case 'Q':
    case 'J':
    case '10':
    case '9':
    case '8':
      return 10
    case '7':
    case '6':
    case '5':
    case '4':
    case '3':
      return 5
  }
}

// --- Deck construction ------------------------------------------------------

/**
 * Build the shoe: `numDecks` standard 52-card decks plus 2 jokers each.
 * Default 3 decks => 162 cards, 6 jokers (the confirmed v1 configuration).
 */
export function buildShoe(numDecks = 3): Card[] {
  const cards: Card[] = []
  for (let deck = 0; deck < numDecks; deck++) {
    for (const suit of SUITS) {
      for (const rank of STANDARD_RANKS) {
        cards.push({ id: `${deck}-${suit}-${rank}`, rank, suit })
      }
    }
    cards.push({ id: `${deck}-joker-0`, rank: 'JOKER' })
    cards.push({ id: `${deck}-joker-1`, rank: 'JOKER' })
  }
  return cards
}

// --- Deterministic RNG + shuffle -------------------------------------------

/** mulberry32 PRNG — small, fast, seedable for reproducible deals/tests. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates shuffle returning a new array; does not mutate the input. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

// --- Dealing ----------------------------------------------------------------

export interface Deal {
  /** One hand per player, in seat order. */
  hands: Card[][]
  /** Remaining draw pile; top of stock is the last element. */
  stock: Card[]
  /** Discard pile; top is the last element (single turned-up card to start). */
  discard: Card[]
}

/**
 * Deal `cardsPerPlayer` to each of `numPlayers`, then turn one card up to
 * start the discard pile. Raw deal only — red-3 replacement is applied later
 * by the round setup (see rounds.ts).
 *
 * Stock/discard "top" is the last array element so draws are O(1) pops.
 */
export function deal(
  shoe: readonly Card[],
  numPlayers: number,
  cardsPerPlayer = 11,
): Deal {
  const needed = numPlayers * cardsPerPlayer + 1
  if (shoe.length < needed) {
    throw new Error(
      `shoe too small: need ${needed} cards for ${numPlayers} players, have ${shoe.length}`,
    )
  }

  const stock = shoe.slice()
  const hands: Card[][] = Array.from({ length: numPlayers }, () => [])

  for (let c = 0; c < cardsPerPlayer; c++) {
    for (let p = 0; p < numPlayers; p++) {
      hands[p]!.push(stock.pop()!)
    }
  }

  const discard = [stock.pop()!]
  return { hands, stock, discard }
}
