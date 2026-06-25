# Canasta — v1 Plan

> A web-based Classic Canasta game. **v1 = 1 human player vs 5 heuristic bots, in 3 teams of 2.**
> This document is the source of truth for v1 scope. It is meant to be reviewed manually and by other agents before build starts.

---

## 1. Product summary

- **Game:** Classic Canasta (partnership rules).
- **v1 table:** 6 seats — **1 human + 5 bots**, arranged as **3 teams of 2**.
- **End goal (post-v1):** real multi-human play over the network.
- **Hosting:** web app, host to be decided at deploy time (kept portable).

## 2. Locked decisions

### Frontend

| Decision      | Choice                                                        |
| ------------- | ------------------------------------------------------------- |
| Framework     | **React 18 + TypeScript** (Vite)                              |
| Device target | **Mobile-first** (phone primary; must also work on desktop)   |
| Card visuals  | **CSS/SVG-drawn cards** (no image assets, restyleable, crisp) |
| Styling       | **Tailwind CSS**                                              |

### Backend / architecture

| Decision                  | Choice                                                                      |
| ------------------------- | --------------------------------------------------------------------------- |
| v1 architecture           | **Client-only** — all rules + bots run in the browser. **No server in v1.** |
| Future multiplayer server | **Python + FastAPI**                                                        |
| Future transport          | **REST + polling**                                                          |
| Persistence (v1)          | **Browser `localStorage`** autosave (resume on refresh/return)              |
| Hosting                   | **Decide later** — keep the build host-agnostic (static site for v1)        |

### Gameplay

| Decision    | Choice                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Bots        | **Stronger heuristics + light lookahead** (hold for canasta, deny pile, avoid feeding opponents) |
| Save/resume | **Yes**, via `localStorage`                                                                      |

### Key architectural principle

The **rules engine is an isolated, pure TypeScript module** (`engine/`) with **no React and no DOM dependencies**. It takes game state + an action and returns new state. This:

1. keeps rules testable in isolation, and
2. makes the eventual **Python/FastAPI port a near-mechanical translation**, not a redesign (we explicitly accept that v1 TS engine will be re-implemented server-side for multiplayer).

### Build constraints

- **Minimal dependencies.** Lean on the platform and standard tooling; add a package only when it clearly beats writing it ourselves. No state library, no UI-component library, no extra utility libs unless justified. (Core deps for v1: React, Vite, Tailwind, Vitest — that's the intended ceiling.)
- **Simple, flat folder structure.** Keep the tree shallow and obvious — avoid deep nesting and premature "architecture" folders. Grow structure only when a real need appears.

---

## 3. Rules parameters — ✅ CONFIRMED

Classic Canasta is standardized for **2 or 4 players**. The **6-player / 3-team** form is a variant, so several numbers needed an explicit house decision. All values below are **confirmed** and the engine is built against them.

| Parameter                                       | Proposed default                                          | Notes                                                  |
| ----------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| Number of decks                                 | **3 standard decks + 6 jokers** (162 cards)               | Common for 5–6 players                                 |
| Cards dealt per player                          | **11**                                                    | Confirmed (same as classic 4-player).                  |
| Wild cards                                      | Jokers = 50 pts, 2s = 20 pts; **max 3 wilds per meld**    | Standard                                               |
| Red 3 value                                     | **100 each**                                              | 6 red 3s exist across 3 decks                          |
| Canasta bonus                                   | Natural **500**, mixed **300**                            | Standard                                               |
| Canastas required to go out                     | **2**                                                     | Variant tables with extra decks require 2              |
| Go-out bonus                                    | **100**, concealed **200**                                | Standard                                               |
| Initial meld minimum (by team cumulative score) | `<0` → 15, `0–1495` → 50, `1500–2995` → 90, `3000+` → 120 | Standard classic thresholds                            |
| Game-winning score                              | **5000**                                                  | (Some tables play to 8500/10000)                       |
| Frozen pile / black 3 rules                     | Standard classic                                          | Black 3s block discard pile; minimum-count rules apply |

> **Status:** ✅ Confirmed by Rishav (2026-06-25). 11 cards dealt; all other defaults accepted. Engine may be built against these values.

---

## 4. Phases

Each phase: **Objective → Commit-plan → Outcome.** Phases are ordered so the engine is correct and testable before any UI is built.

---

### Phase 0 — Scaffolding & guardrails

**Objective:** Stand up the repo, toolchain, and conventions so every later phase is fast and consistent.

**Commit-plan:**

- [x] `chore: init Vite + React + TS project`
- [x] `chore: add Tailwind CSS + base mobile-first layout shell`
- [x] `chore: add ESLint + Prettier + tsconfig strict`
- [x] `chore: add Vitest + first smoke test`
- [x] `docs: add README with run/build/test instructions`

**Outcome:** `npm run dev` serves an empty styled shell; `npm test` runs; lint/format enforced. Nothing playable yet.

---

### Phase 1 — Rules engine: data model & core moves (no UI, no bots)

**Objective:** A pure, fully-tested TypeScript engine that models Classic Canasta state and validates/applies legal moves for 6 players / 3 teams.

**Commit-plan:**

- [x] `feat(engine): card, deck, and shuffle/deal model (3 decks, 6 jokers)`
- [x] `feat(engine): game + round + team + player state types`
- [x] `feat(engine): meld validation (naturals, wilds ≤3, canastas)`
- [x] `feat(engine): red 3 handling + initial meld minimums`
- [x] `feat(engine): draw, discard, and take-the-pile (frozen/black-3 rules)`
- [x] `feat(engine): go-out validation + round-end detection`
- [x] `test(engine): exhaustive unit tests for each rule path`

**Outcome:** Given a state + action, the engine returns the next state or a rejection with a reason. 100% of rules in §3 covered by tests. No randomness in tests (seeded deals).

---

### Phase 2 — Scoring engine

**Objective:** Correct round and game scoring for 3 teams.

**Commit-plan:**

- [x] `feat(engine): meld/canasta/red-3 scoring`
- [x] `feat(engine): hand-count penalties + go-out bonuses`
- [x] `feat(engine): cumulative game scoring + win detection (to 5000)`
- [x] `test(engine): scoring scenarios incl. concealed go-out`

**Outcome:** Engine produces a verifiable scoreboard at round end and declares a game winner. Fully tested.

---

### Phase 3 — Bot AI (stronger heuristics + light lookahead)

**Objective:** Bots that choose sensible legal actions and make the game fun to play.

> **3-team note:** With 3 teams there are **two distinct opponent teams**, not one. The bot's opponent model must be an **array of opposing teams** — "avoid feeding" is evaluated **per opponent team** (a discard can be safe for one and lethal for another). Do not collapse opponents into a single entity.

**Commit-plan:**

- [x] `feat(bots): legal-move enumeration from engine state`
- [x] `feat(bots): heuristic scoring of moves (meld value, pile risk)`
- [x] `feat(bots): hold-for-canasta + deny-pile + per-opponent-team avoid-feeding`
- [x] `feat(bots): light lookahead for take-pile vs draw decisions`
- [x] `test(bots): deterministic bot decisions on fixed states`

**Outcome:** A bot can play a full turn given any legal state. 5 bots can play a full game to completion headlessly (simulation harness).

---

### Phase 4 — Game orchestration (headless single-player session)

**Objective:** Tie engine + bots into a runnable turn loop with autosave — still no UI.

> **State bridge:** the engine is already a pure `(state, action) => state` reducer, so React will drive it via **`useReducer`** (engine actions = reducer actions) — no extra state library (no Redux/Zustand). Keeps the engine the single source of truth and avoids scattered `useState`.

**Commit-plan:**

- [x] `feat(game): turn loop + turn order for 6 seats / 3 teams`
- [x] `feat(game): human-action interface (engine actions surfaced for a UI)`
- [x] `feat(game): localStorage save/load of full game state`
- [x] `feat(game): headless simulation runner (1 human stub + 5 bots)`
- [x] `test(game): full game plays start→win without errors`
- [x] `test(game): seeded soak run — 10k+ games to surface rule edge-cases (deck depletion, illegal take-pile, stalemates)`

**Outcome:** `simulate()` runs complete games to a winner. A many-game seeded soak run passes with zero crashes/invalid states. State survives a reload via `localStorage`. UI can now be layered on a stable core.

---

### Phase 5 — UI: table, hands, melds (mobile-first, read-only render)

**Objective:** Render the full game state beautifully on a phone screen — display only, no interaction yet.

**Commit-plan:**

- [x] `feat(ui): CSS/SVG card component + deck/back rendering`
- [x] `feat(ui): mobile-first 6-seat table layout (3 teams)`
- [x] `feat(ui): player hand fan + melds-by-team panels`
- [x] `feat(ui): discard pile, stock, scores, turn indicator`
- [x] `feat(ui): bind read-only render to live game state`

**Outcome:** A running game (driven by the headless loop) is fully visible and legible on a phone. No clicks wired yet.

---

### Phase 6 — Interaction & turn flow

**Objective:** Let the human actually play — select, meld, draw, take pile, discard, go out.

**Commit-plan:**

- [x] `feat(ui): card selection + draw/discard interactions`
- [x] `feat(ui): build/extend meld interactions with legality hints`
- [x] `feat(ui): take-the-pile flow incl. frozen-pile rules`
- [x] `feat(ui): go-out confirmation + illegal-move feedback`
- [x] `feat(ui): bot turn pacing/animation so play is followable`
- [x] `test(ui): key interaction flows (component tests)`

**Outcome:** A human can play a complete game vs 5 bots end-to-end on a phone, with clear feedback on legal/illegal moves.

---

### Phase 7 — Round/game end, polish & deploy

**Objective:** Close the loop and ship a hostable static site.

**Commit-plan:**

- [x] `feat(ui): round-end scoreboard + next-round flow`
- [x] `feat(ui): game-over / winner screen + new game`
- [x] `polish: card/transition animations + empty/edge states`
- [x] `chore: production build + static hosting config (host-agnostic)`
- [x] `docs: how to deploy + how to play`

**Outcome:** A polished, self-contained static web app that plays full Classic Canasta vs bots on a phone, deployable to any static host. **v1 complete.**

---

## 5. Explicitly out of scope for v1 (future phases)

- Python/FastAPI multiplayer server (REST + polling) — engine will be ported from the v1 TS engine.
- Real-time multi-human lobbies, matchmaking, accounts.
- Reconnect handling across devices, server-side persistence.
- Spectators, chat, replays.

## 6. Risks / watch items

- **6-seat layout on a phone** is the hardest UI problem (Phase 5). Mitigate with collapsible per-team meld panels and a focus on the active turn.
- **6-player rule ambiguity** (§3) — ✅ resolved; all values confirmed.
- **Engine portability** — keep `engine/` free of React/DOM so the Python port stays mechanical.
- **Pacing (tuning, not a v1 change)** — with 3 decks/6 players, scores may climb faster, so the 5000 target and standard meld thresholds could make games feel short. Confirmed values stay as-is for v1; revisit only if the Phase 4 soak run + real play show games ending too quickly.
