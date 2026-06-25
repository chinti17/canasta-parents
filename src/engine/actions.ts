// The turn action layer: a pure reducer `apply(round, action, config)`.
//
// Every action returns either the next round state or a rejection with a
// reason. Input state is never mutated (we clone first), so callers can keep
// previous states freely.

import {
  isBlack3,
  isRed3,
  isWild,
  type Card,
  type Rank,
} from './cards'
import { meldPointValue, validateMeldCards } from './melds'
import { meldMinimum } from './red3'
import type { Meld, RoundState, TeamState } from './types'

export type Action =
  | { type: 'DRAW_STOCK' }
  | {
      type: 'TAKE_PILE'
      /** Hand card ids combined with the top discard to meld it. */
      withCardIds: string[]
      /** Extra melds laid from hand this turn (e.g. to reach the minimum). */
      additionalMelds?: string[][]
    }
  | { type: 'MELD'; melds: string[][] }
  | { type: 'LAYOFF'; cardIds: string[]; targetRank: Rank }
  | { type: 'DISCARD'; cardId: string }

export type ApplyResult =
  | { ok: true; round: RoundState }
  | { ok: false; reason: string }

const ok = (round: RoundState): ApplyResult => ({ ok: true, round })
const err = (reason: string): ApplyResult => ({ ok: false, reason })

// --- small helpers ----------------------------------------------------------

function topOf(round: RoundState): Card | undefined {
  return round.discard.cards[round.discard.cards.length - 1]
}

/** Remove the listed ids from `hand` (mutating). Returns removed cards or null. */
function removeByIds(hand: Card[], ids: readonly string[]): Card[] | null {
  const removed: Card[] = []
  for (const id of ids) {
    const idx = hand.findIndex((c) => c.id === id)
    if (idx === -1) return null
    removed.push(hand.splice(idx, 1)[0]!)
  }
  return removed
}

function teamMeldOfRank(team: TeamState, rank: Rank): Meld | undefined {
  return team.melds.find((m) => m.rank === rank)
}

function advanceTurn(round: RoundState): void {
  round.currentSeat = (round.currentSeat + 1) % round.players.length
  round.phase = 'draw'
  round.tookDiscard = false
}

// --- the reducer ------------------------------------------------------------

export function apply(round: RoundState, action: Action): ApplyResult {
  if (round.over) return err('the round is over')
  const next = structuredClone(round)
  const player = next.players[next.currentSeat]!
  const team = next.teams[player.teamId]!

  switch (action.type) {
    case 'DRAW_STOCK':
      return drawStock(next, player, team)
    case 'TAKE_PILE':
      return takePile(next, player, team, action)
    case 'MELD':
      return meld(next, player, team, action.melds)
    case 'LAYOFF':
      return layoff(next, player, team, action.cardIds, action.targetRank)
    case 'DISCARD':
      return discard(next, player, action.cardId)
  }
}

function drawStock(
  round: RoundState,
  player: { hand: Card[] },
  team: TeamState,
): ApplyResult {
  if (round.phase !== 'draw') return err('you have already drawn')
  if (round.stock.length === 0) return err('the stock is empty')

  // Draw one; if it is a red 3, set it aside and draw again.
  for (;;) {
    const card = round.stock.pop()!
    if (isRed3(card)) {
      team.redThrees.push(card)
      if (round.stock.length === 0) break
      continue
    }
    player.hand.push(card)
    break
  }

  round.phase = 'action'
  round.tookDiscard = false
  return ok(round)
}

function takePile(
  round: RoundState,
  player: { hand: Card[] },
  team: TeamState,
  action: Extract<Action, { type: 'TAKE_PILE' }>,
): ApplyResult {
  if (round.phase !== 'draw') return err('you have already drawn')
  const top = topOf(round)
  if (!top) return err('the discard pile is empty')
  if (isBlack3(top)) return err('cannot take a pile topped by a black 3')
  if (isWild(top)) return err('cannot take a pile topped by a wild card')

  const mustUseTwoNaturals = round.discard.frozen || !team.hasMelded
  const existing = teamMeldOfRank(team, top.rank)

  // Snapshot the hand so a mid-validation failure leaves state untouched.
  const handBackup = player.hand.map((c) => c)

  const fail = (reason: string): ApplyResult => {
    player.hand = handBackup
    return err(reason)
  }

  if (action.withCardIds.length === 0) {
    // Adding the top card to an existing meld — only when not "frozen".
    if (mustUseTwoNaturals) {
      return err('a frozen pile needs two natural cards from your hand')
    }
    if (!existing) return err('you have no meld to add the top card to')
  } else {
    const fromHand = removeByIds(player.hand, action.withCardIds)
    if (!fromHand) return fail('those cards are not all in your hand')
    if (mustUseTwoNaturals) {
      const naturals = fromHand.filter(
        (c) => !isWild(c) && c.rank === top.rank,
      )
      if (naturals.length < 2) {
        return fail('a frozen pile needs two natural cards of that rank')
      }
    }
    const meldCards = [...fromHand, top]
    const v = validateMeldCards(meldCards)
    if (!v.ok) return fail(v.reason ?? 'invalid meld for the top card')
    if (v.rank !== top.rank) return fail('that meld does not use the top card')
    player.hand = handBackup // restore; we apply for real below
  }

  // Gather the additional melds (validated, from hand) before mutating.
  const additional = action.additionalMelds ?? []
  const pendingMelds: Card[][] = []
  const handForCheck = player.hand.map((c) => c)
  for (const ids of additional) {
    const cards = removeByIds(handForCheck, ids)
    if (!cards) return err('those cards are not all in your hand')
    const v = validateMeldCards(cards)
    if (!v.ok) return err(v.reason ?? 'invalid additional meld')
    if (v.isBlackThreeMeld) return err('black 3s can only be melded to go out')
    pendingMelds.push(cards)
  }

  // Initial-meld minimum (only if the team has not melded yet this round).
  if (!team.hasMelded) {
    const topMeldValue =
      action.withCardIds.length === 0
        ? 0 // adding to an existing meld can't be a first meld; guarded above
        : meldPointValue(
            action.withCardIds.map(
              (id) => player.hand.find((c) => c.id === id)!,
            ),
          ) + meldPointValue([top])
    const additionalValue = pendingMelds.reduce(
      (s, m) => s + meldPointValue(m),
      0,
    )
    if (topMeldValue + additionalValue < meldMinimum(team.score)) {
      return err(
        `initial meld must total at least ${meldMinimum(team.score)} points`,
      )
    }
  }

  // --- commit ---------------------------------------------------------------
  const pile = round.discard.cards
  round.discard = { cards: [], frozen: false }
  player.hand.push(...pile)

  if (action.withCardIds.length === 0) {
    const target = teamMeldOfRank(team, top.rank)!
    const [taken] = removeByIds(player.hand, [top.id])!
    target.cards.push(taken!)
  } else {
    const fromHand = removeByIds(player.hand, [...action.withCardIds, top.id])!
    const target = teamMeldOfRank(team, top.rank)
    if (target) target.cards.push(...fromHand)
    else team.melds.push({ rank: top.rank, cards: fromHand })
  }

  for (const ids of additional) {
    const cards = removeByIds(player.hand, ids)!
    const target = teamMeldOfRank(team, cards[0]!.rank)
    if (target) target.cards.push(...cards)
    else team.melds.push({ rank: cards[0]!.rank, cards })
  }

  // Any red 3 caught in the taken pile is set aside (no stock replacement).
  const red = player.hand.filter(isRed3)
  if (red.length) {
    team.redThrees.push(...red)
    player.hand = player.hand.filter((c) => !isRed3(c))
  }

  team.hasMelded = true
  round.phase = 'action'
  round.tookDiscard = true
  return ok(round)
}

function meld(
  round: RoundState,
  player: { hand: Card[] },
  team: TeamState,
  melds: string[][],
): ApplyResult {
  if (round.phase !== 'action') return err('you must draw before melding')
  if (melds.length === 0) return err('no melds provided')

  const handForCheck = player.hand.map((c) => c)
  const prepared: { rank: Rank; cards: Card[] }[] = []
  const ranksThisAction = new Set<Rank>()

  for (const ids of melds) {
    const cards = removeByIds(handForCheck, ids)
    if (!cards) return err('those cards are not all in your hand')
    const v = validateMeldCards(cards)
    if (!v.ok) return err(v.reason ?? 'invalid meld')
    if (v.isBlackThreeMeld) return err('black 3s can only be melded to go out')
    if (ranksThisAction.has(v.rank!)) {
      return err('combine cards of the same rank into one meld')
    }
    if (teamMeldOfRank(team, v.rank!)) {
      return err(`use layoff to extend your existing ${v.rank} meld`)
    }
    ranksThisAction.add(v.rank!)
    prepared.push({ rank: v.rank!, cards })
  }

  if (!team.hasMelded) {
    const total = prepared.reduce((s, p) => s + meldPointValue(p.cards), 0)
    const min = meldMinimum(team.score)
    if (total < min) {
      return err(`initial meld must total at least ${min} points`)
    }
  }

  for (const p of prepared) {
    removeByIds(player.hand, p.cards.map((c) => c.id))
    team.melds.push({ rank: p.rank, cards: p.cards })
  }
  team.hasMelded = true
  return ok(round)
}

function layoff(
  round: RoundState,
  player: { hand: Card[] },
  team: TeamState,
  cardIds: string[],
  targetRank: Rank,
): ApplyResult {
  if (round.phase !== 'action') return err('you must draw before laying off')
  if (!team.hasMelded) return err('make your initial meld before laying off')
  const target = teamMeldOfRank(team, targetRank)
  if (!target) return err(`your team has no ${targetRank} meld`)

  const handForCheck = player.hand.map((c) => c)
  const cards = removeByIds(handForCheck, cardIds)
  if (!cards) return err('those cards are not all in your hand')

  const v = validateMeldCards([...target.cards, ...cards])
  if (!v.ok) return err(v.reason ?? 'invalid layoff')
  if (v.rank !== targetRank) return err('those cards do not fit that meld')

  removeByIds(player.hand, cardIds)
  target.cards.push(...cards)
  return ok(round)
}

function discard(
  round: RoundState,
  player: { hand: Card[] },
  cardId: string,
): ApplyResult {
  if (round.phase !== 'action') return err('you must draw before discarding')
  const removed = removeByIds(player.hand, [cardId])
  if (!removed) return err('that card is not in your hand')
  const card = removed[0]!

  // Going out (emptying the hand) is handled in a later commit.
  if (player.hand.length === 0) {
    player.hand.push(card)
    return err('you cannot discard your last card yet')
  }

  round.discard.cards.push(card)
  if (isWild(card)) round.discard.frozen = true
  advanceTurn(round)
  return ok(round)
}
