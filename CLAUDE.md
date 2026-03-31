# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start           # Start dev server at http://localhost:4200/
npm run build       # Production build
npm test            # Run unit tests (Karma + Jasmine)
npm run watch       # Build in watch mode
```

Angular CLI is also available directly: `npx ng generate component path/to/component`

## Architecture

**Stack:** Angular 20 (standalone components) + TypeScript 5.8 + Supabase backend + SCSS

**App:** A Kahoot-style multiplayer drinking game — no central screen. Every player uses their own phone. Players join a round via an invitation link. Each phone shows the current game state: who is shooting, who must drink, and which drink was randomly assigned by the algorithm.

### Concept

- **No central display** — each phone is an independent view
- **Invitation link** — at the start of every round, the host shares a link; other players join with their own device
- **Drinks defined per round** — before the game starts, drinks are added (via barcode scan or manually)
- **Drink assignment** — when a player must drink, the existing `generate-drink` algorithm randomly selects a drink from the round's drink list
- **Player views** — each phone shows the player's personal state: their turn to shoot, waiting, or drinking

### Game Flow (routes in `app.routes.ts`)

```
Host flow:
  login → dashboard → game/new → game/:gameId
    → game/:gameId/round/new → add-drinks (barcode/manual)
    → round/:roundId/lobby (share invite link, start game)
    → game/:gameId/round/:roundId/settings | end

Player flow (no account needed):
  join/:roundCode → round/:roundId/lobby → round/:roundId/personal
```

### Key Directories

- `src/game/` — All game feature screens (each folder = one route/component)
  - `join-round/` — Public join page via invite link
  - `round-lobby/` — Pre-game lobby with invite link and team setup
  - `player-game-view/` — **Main player screen** — shows personal game state (shoot / wait / drink)
  - `add-drinks/` — Drink list for the round
  - `add-drinks-to-round/` — Add drink via barcode scanner or manually
  - `create-game/`, `create-round-screen/` — Host setup screens
  - `game-overview/` — Round list for a game
  - `round-end/` — Post-game screen for the host
  - `settings-page/` — Round settings
- `src/services/` — Supabase data services: `drink.ts`, `round.ts`, `task.ts`, `round-drink.service.ts`, `generate-drink.ts`, `round-player.service.ts`
- `src/model/` — TypeScript interfaces: `Drink.ts`, `Round.ts`, `Task.ts`, `GeneratedDrink.ts`, `RoundDrink.ts`, `RoundPlayer.ts`
- `src/enviroment/` — Supabase URL and anon key config (note: typo in folder name is intentional)
- `public/` — Static assets (animations, backgrounds, buttons, logo)

### Component Conventions

All components are **standalone** (no NgModules). New components should follow the pattern:
```typescript
@Component({
  standalone: true,
  imports: [...],
  ...
})
```

Services are injected via `inject()` function (not constructor injection), following Angular 20 patterns.

### Data Layer

All data persistence goes through Supabase. The `supabase.ts` service initializes the client from environment config. Services make direct Supabase queries (no intermediate API layer). Supabase Realtime is used for live game state updates on the `rounds` and `round_players` tables.

### TypeScript

Strict mode is fully enabled (`strict`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `strictTemplates`). All code paths must return a value and templates are type-checked.
