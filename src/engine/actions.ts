// The turn action layer: a pure reducer `apply(round, action, config)`.
//
// Every action returns either the next round state or a rejection with a
// reason. Input state is never mutated (we clone first), so callers can keep
// previous states freely.

import { isBlack3, isRed3, isWild, type Card, type Rank } from './cards'
import { countCanastas, meldPointValue, validateMeldCards } from './melds'
import { meldMinimum } from './red3'
import {
  DEFAULT_CONFIG,
  type GameConfig,
  type Meld,
  type PlayerState,
  type RoundState,
  type TeamState,
} from './types'

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

function canGoOut(team: TeamState, config: GameConfig): boolean {
  return countCanastas(team.melds) >= config.canastasToGoOut
}

function finishGoOut(round: RoundState, player: PlayerState): void {
  round.over = true
  round.wentOutSeat = player.seat
  round.wentOutConcealed = !round.turnStartHasMelded[player.teamId]
}

function advanceTurn(round: RoundState): void {
  round.currentSeat = (round.currentSeat + 1) % round.players.length
  round.phase = 'draw'
  round.tookDiscard = false
  round.turnStartHasMelded = round.teams.map((t) => t.hasMelded)
}

// --- the reducer ------------------------------------------------------------

export function apply(
  round: RoundState,
  action: Action,
  config: GameConfig = DEFAULT_CONFIG,
): ApplyResult {
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
      return meld(next, player, team, action.melds, config)
    case 'LAYOFF':
      return layoff(next, player, team, action.cardIds, action.targetRank, config)
    case 'DISCARD':
      return discard(next, player, team, action.cardId, config)
  }
}

function drawStock(
  round: RoundState,
  player: PlayerState,
  team: TeamState,
): ApplyResult {
  if (round.phase !== 'draw') return err('you have already drawn')
  // No card to draw and the player chose to draw: the round ends in a draw.
  if (round.stock.length === 0) {
    round.over = true
    return ok(round)
  }

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
  player: PlayerState,
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

  if (action.withCardIds.length === 0) {
    // Adding the top card to an existing meld — only when not "frozen".
    if (mustUseTwoNaturals) {
      return err('a frozen pile needs two natural cards from your hand')
    }
    if (!existing) return err('you have no meld to add the top card to')
  } else {
    // Validate the new meld using a copy of the hand (no mutation yet).
    const handCopy = player.hand.map((c) => c)
    const fromHand = removeByIds(handCopy, action.withCardIds)
    if (!fromHand) return err('those cards are not all in your hand')
    if (mustUseTwoNaturals) {
      const naturals = fromHand.filter((c) => !isWild(c) && c.rank === top.rank)
      if (naturals.length < 2) {
        return err('a frozen pile needs two natural cards of that rank')
      }
    }
    const v = validateMeldCards([...fromHand, top])
    if (!v.ok) return err(v.reason ?? 'invalid meld for the top card')
    if (v.rank !== top.rank) return err('that meld does not use the top card')
  }

  // Validate the additional melds from a hand copy too.
  const additional = action.additionalMelds ?? []
  const handForCheck = player.hand.map((c) => c)
  if (action.withCardIds.length > 0) removeByIds(handForCheck, action.withCardIds)
  let additionalValue = 0
  for (const ids of additional) {
    const cards = removeByIds(handForCheck, ids)
    if (!cards) return err('those cards are not all in your hand')
    const v = validateMeldCards(cards)
    if (!v.ok) return err(v.reason ?? 'invalid additional meld')
    if (v.isBlackThreeMeld) return err('black 3s can only be melded to go out')
    if (teamMeldOfRank(team, v.rank!)) {
      return err(`use layoff to extend your existing ${v.rank} meld`)
    }
    additionalValue += meldPointValue(cards)
  }

  // Initial-meld minimum (only if the team has not melded yet this round).
  if (!team.hasMelded) {
    const topMeldValue =
      action.withCardIds.length === 0
        ? 0
        : meldPointValue(
            action.withCardIds.map((id) => player.hand.find((c) => c.id === id)!),
          ) + meldPointValue([top])
    const min = meldMinimum(team.score)
    if (topMeldValue + additionalValue < min) {
      return err(`initial meld must total at least ${min} points`)
    }
  }

  // --- commit ---------------------------------------------------------------
  const pile = round.discard.cards
  round.discard = { cards: [], frozen: false }
  player.hand.push(...pile)

  if (action.withCardIds.length === 0) {
    const target = teamMeldOfRank(team, top.rank)!
    target.cards.push(removeByIds(player.hand, [top.id])![0]!)
  } else {
    const fromHand = removeByIds(player.hand, [...action.withCardIds, top.id])!
    const target = teamMeldOfRank(team, top.rank)
    if (target) target.cards.push(...fromHand)
    else team.melds.push({ rank: top.rank, cards: fromHand })
  }

  for (const ids of additional) {
    const cards = removeByIds(player.hand, ids)!
    team.melds.push({ rank: cards[0]!.rank, cards })
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
  player: PlayerState,
  team: TeamState,
  melds: string[][],
  config: GameConfig,
): ApplyResult {
  if (round.phase !== 'action') return err('you must draw before melding')
  if (melds.length === 0) return err('no melds provided')

  const handForCheck = player.hand.map((c) => c)
  const prepared: { rank: Rank; cards: Card[]; black3: boolean }[] = []
  const ranksThisAction = new Set<Rank>()

  for (const ids of melds) {
    const cards = removeByIds(handForCheck, ids)
    if (!cards) return err('those cards are not all in your hand')
    const v = validateMeldCards(cards)
    if (!v.ok) return err(v.reason ?? 'invalid meld')
    if (ranksThisAction.has(v.rank!)) {
      return err('combine cards of the same rank into one meld')
    }
    if (teamMeldOfRank(team, v.rank!)) {
      return err(`use layoff to extend your existing ${v.rank} meld`)
    }
    ranksThisAction.add(v.rank!)
    prepared.push({ rank: v.rank!, cards, black3: v.isBlackThreeMeld ?? false })
  }

  const willEmptyHand = handForCheck.length === 0

  // Black 3s may only be melded on the turn the player goes out.
  if (prepared.some((p) => p.black3) && !willEmptyHand) {
    return err('black 3s can only be melded to go out')
  }

  if (!team.hasMelded) {
    const total = prepared.reduce((s, p) => s + meldPointValue(p.cards), 0)
    const min = meldMinimum(team.score)
    if (total < min) return err(`initial meld must total at least ${min} points`)
  }

  // Apply.
  for (const p of prepared) {
    removeByIds(
      player.hand,
      p.cards.map((c) => c.id),
    )
    team.melds.push({ rank: p.rank, cards: p.cards })
  }
  team.hasMelded = true

  if (player.hand.length === 0) {
    if (!canGoOut(team, config)) {
      return err(`you need ${config.canastasToGoOut} canastas to go out`)
    }
    finishGoOut(round, player)
  }
  return ok(round)
}

function layoff(
  round: RoundState,
  player: PlayerState,
  team: TeamState,
  cardIds: string[],
  targetRank: Rank,
  config: GameConfig,
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

  if (player.hand.length === 0) {
    if (!canGoOut(team, config)) {
      return err(`you need ${config.canastasToGoOut} canastas to go out`)
    }
    finishGoOut(round, player)
  }
  return ok(round)
}

function discard(
  round: RoundState,
  player: PlayerState,
  team: TeamState,
  cardId: string,
  config: GameConfig,
): ApplyResult {
  if (round.phase !== 'action') return err('you must draw before discarding')
  const removed = removeByIds(player.hand, [cardId])
  if (!removed) return err('that card is not in your hand')
  const card = removed[0]!

  const goingOut = player.hand.length === 0
  if (goingOut && !canGoOut(team, config)) {
    player.hand.push(card) // restore
    return err(`you need ${config.canastasToGoOut} canastas to go out`)
  }

  round.discard.cards.push(card)
  if (isWild(card)) round.discard.frozen = true

  if (goingOut) finishGoOut(round, player)
  else advanceTurn(round)
  return ok(round)
}
