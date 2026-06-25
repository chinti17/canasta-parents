# Canasta

A web-based Classic Canasta game — v1 is **1 human vs 5 bots, in 3 teams of 2**, playable in the browser on a phone or desktop. All rules and bots run client-side; there is no server.

See [`PLAN.md`](./PLAN.md) for the full v1 plan, locked decisions, and phases.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (project built on Node 26)

## Setup

```bash
git clone git@github.com:chinti17/canasta-parents.git
cd canasta-parents
npm install
```

## Run the dev server

```bash
npm run dev
```

Then open **http://localhost:5173/** in your browser. The server hot-reloads on save.

## How to play

You are **P1 (seat 0)**; the other five seats are bots, arranged into three teams of two (partners sit three seats apart). The five bots take their turns automatically — the banner shows whose turn it is. On **your turn**:

1. **Draw** — tap **Draw stock**, or **Take pile** when offered (taking the discard pile requires melding its top card; a ❄ _frozen_ pile needs two natural cards of that rank from your hand).
2. **Meld / lay off** — tap cards in your hand to select them (they lift), then:
   - **Meld** lays a new meld (3+ cards, same rank, ≤3 wilds). Your team's first meld must meet the initial minimum shown by the rules.
   - **Lay off** adds the selected cards to one of your team's existing melds.
   - A hint explains why a selection isn't a legal meld.
3. **Discard** — select exactly one card and tap **Discard** to end your turn.

Complete a **canasta** (7+ cards); a team needs **two canastas** before it can **go out** (empty its hand) — you'll be asked to confirm, since that ends the round. After each round a **scoreboard** breaks down the points; tap **Next round** to deal again. First team to **5000** wins; the **New game** button starts over.

## Build & deploy

```bash
npm run build      # type-checks, then builds a static site to dist/
npm run preview    # serve the production build locally to verify
```

The build is **host-agnostic**: assets use relative paths (`base: './'`), so the contents of `dist/` are a self-contained static site that works at a domain root or any sub-path. Deploy by uploading `dist/` to any static host — GitHub Pages, Netlify, Vercel, S3/CloudFront, or `npx serve dist`. No server, environment variables, or build-time host configuration are required. There is no client-side routing, so no SPA rewrite rule is needed.

## Other commands

```bash
npm test           # run the test suite (Vitest)
npm run lint       # lint with ESLint
npm run format     # format with Prettier
```

Game progress autosaves to the browser's `localStorage`, so a refresh resumes where you left off.
