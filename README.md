# Canasta

A web-based Classic Canasta game — v1 is **1 human vs 5 bots, in 3 teams of 2**, playable in the browser.

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

> Right now this shows a placeholder shell (Phase 0). The actual game UI arrives in later phases — see `PLAN.md`.

## Other commands

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build locally
npm test         # run the test suite (Vitest)
npm run lint     # lint with ESLint
npm run format   # format with Prettier
```
