// The bot brain: pick a full turn's worth of actions for the current seat.
//
// A turn is draw → (melds/lay-offs) → discard. The bot builds the sequence by
// proposing actions and applying them through the engine as it goes, so every
// action it returns is guaranteed legal and the "light lookahead" for the draw
// decision is just: simulate each take-pile option and keep the best.

import { apply, type Action } from '../engine/actions'
import {
  DEFAULT_CONFIG,
  type GameConfig,
  type RoundState,
} from '../engine/types'
import { discardScore, tableValue } from './heuristics'
import { layoffPlan, naturalNewMelds, takePileOptions } from './moves'

/** Apply an action, returning the next round or null if the engine rejects it. */
function tryApply(
  round: RoundState,
  action: Action,
  config: GameConfig,
): RoundState | null {
  const result = apply(round, action, config)
  return result.ok ? result.round : null
}

/**
 * A meld/lay-off is only safe mid-turn if it either goes out or still leaves at
 * least two cards — one to discard and one to keep. Melting down to a single
 * card we then can't legally discard would strand the turn.
 */
function leavesTurnPlayable(next: RoundState | null, seat: number): boolean {
  if (!next) return false
  if (next.over) return true
  return next.players[seat]!.hand.length >= 2
}

/**
 * Draw decision with light lookahead: try every legal take-pile option, keep
 * the one that adds the most table value, and take it when it's clearly worth
 * it (it makes our initial meld, the pile is big, or it refuels one of our
 * melds). Otherwise draw from the stock.
 */
function chooseDraw(
  round: RoundState,
  config: GameConfig,
): { action: Action; round: RoundState } {
  const seat = round.currentSeat
  const player = round.players[seat]!
  const team = round.teams[player.teamId]!

  // Endgame: once the stock is empty, drawing ends the round. Taking the pile
  // instead would only prolong a stockless cycle that can't replenish, so we
  // draw to close the round out (the engine ends it when the stock is dry).
  if (round.stock.length === 0) {
    const drawn = tryApply(round, { type: 'DRAW_STOCK' }, config)
    return { action: { type: 'DRAW_STOCK' }, round: drawn ?? round }
  }

  const before = tableValue(team)
  let best: { action: Action; round: RoundState; gain: number } | null = null
  for (const option of takePileOptions(round, team, player.hand)) {
    const next = tryApply(round, option, config)
    if (!next) continue
    // Only take a pile that leaves a discardable hand (or goes out): committing
    // hand cards to meld the top can otherwise strand us on a single card we
    // can't legally discard, deadlocking the turn.
    if (!leavesTurnPlayable(next, seat)) continue
    const gain = tableValue(next.teams[player.teamId]!) - before
    if (!best || gain > best.gain) best = { action: option, round: next, gain }
  }

  if (best) {
    // Take the pile to make our initial meld, or to grab a pile of two or more.
    // We deliberately skip single-card piles (even ones we could use): taking
    // never draws from the stock, so always-taking would keep the stock full
    // and the round could spin forever. Skipping tiny piles forces regular
    // stock draws, which guarantees the stock depletes and the round ends.
    const worthIt = !team.hasMelded || round.discard.cards.length >= 2
    if (worthIt) return { action: best.action, round: best.round }
  }

  const drawn = tryApply(round, { type: 'DRAW_STOCK' }, config)
  return { action: { type: 'DRAW_STOCK' }, round: drawn ?? round }
}

/**
 * One meld or lay-off to make in the action phase, or null when nothing more is
 * worth doing. Before melding the team lays off to its existing melds (driving
 * canastas and helping the hand empty out for a go-out).
 */
function chooseActionMove(
  round: RoundState,
  config: GameConfig,
): Action | null {
  const seat = round.currentSeat
  const player = round.players[seat]!
  const team = round.teams[player.teamId]!

  // Initial meld: lay every natural meld at once so the combined value can
  // clear the minimum. If it can't (or would strand the turn), skip melding.
  if (!team.hasMelded) {
    const melds = naturalNewMelds(player.hand, team)
    if (melds.length === 0) return null
    const action: Action = {
      type: 'MELD',
      melds: melds.map((m) => m.cards.map((c) => c.id)),
    }
    return leavesTurnPlayable(tryApply(round, action, config), seat)
      ? action
      : null
  }

  for (const lay of layoffPlan(player.hand, team)) {
    const action: Action = {
      type: 'LAYOFF',
      cardIds: lay.cardIds,
      targetRank: lay.targetRank,
    }
    if (leavesTurnPlayable(tryApply(round, action, config), seat)) return action
  }

  for (const meld of naturalNewMelds(player.hand, team)) {
    const action: Action = {
      type: 'MELD',
      melds: [meld.cards.map((c) => c.id)],
    }
    if (leavesTurnPlayable(tryApply(round, action, config), seat)) return action
  }

  return null
}

/**
 * Choose the full sequence of actions for the current seat's turn. Every action
 * returned applies cleanly in order from the given round.
 */
export function chooseTurn(
  round: RoundState,
  config: GameConfig = DEFAULT_CONFIG,
): Action[] {
  if (round.over) return []
  const seat = round.currentSeat
  const actions: Action[] = []

  const draw = chooseDraw(round, config)
  actions.push(draw.action)
  let cur = draw.round
  if (cur.over) return actions

  // Action phase: each accepted move strictly shrinks the hand, so this loop
  // always terminates; the bound is just belt-and-braces.
  for (let i = 0; i < 64 && !cur.over; i++) {
    const move = chooseActionMove(cur, config)
    if (!move) break
    const next = apply(cur, move, config)
    if (!next.ok) break
    actions.push(move)
    cur = next.round
  }
  if (cur.over) return actions

  // Discard the least valuable, least dangerous card the engine will accept.
  const player = cur.players[seat]!
  const team = cur.teams[player.teamId]!
  const ordered = [...player.hand].sort(
    (a, b) =>
      discardScore(a, player.hand, cur, team) -
      discardScore(b, player.hand, cur, team),
  )
  for (const card of ordered) {
    const action: Action = { type: 'DISCARD', cardId: card.id }
    if (apply(cur, action, config).ok) {
      actions.push(action)
      break
    }
  }

  return actions
}

/** Play the current seat's whole turn and return the resulting round. */
export function playTurn(
  round: RoundState,
  config: GameConfig = DEFAULT_CONFIG,
): RoundState {
  let cur = round
  for (const action of chooseTurn(round, config)) {
    const result = apply(cur, action, config)
    if (!result.ok) break // chooseTurn only returns legal actions; defensive
    cur = result.round
  }
  return cur
}
