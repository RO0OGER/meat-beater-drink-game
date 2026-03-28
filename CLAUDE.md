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

**App:** A multiplayer drinking game where teams take turns, track hits, complete tasks, and scan/add drinks via barcode or manually.

### Game Flow (routes in `app.routes.ts`)
```
start-screen → create-round-screen → add-drinks → add-drinks-to-round
  → game-page (main gameplay loop)
    ├── animation-screen-start-round
    ├── animation-screen-task
    ├── animation-screen-hit
    └── animation-screen-drink-mix-and-amount
  → round-end → settings-page
```

### Key Directories

- `src/app/game/` — All game feature screens (each folder = one route/component)
- `src/app/animation-screens/` — Fullscreen overlay animations triggered during gameplay
- `src/app/services/` — Supabase data services: `drink.ts`, `round.ts`, `task.ts`, `round-drink.service.ts`, `generate-drink.ts`
- `src/app/model/` — TypeScript interfaces: `Drink.ts`, `Round.ts`, `Task.ts`, `GeneratedDrink.ts`, `RoundDrink.ts`
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

All data persistence goes through Supabase. The `supabase.ts` service initializes the client from environment config. Services make direct Supabase queries (no intermediate API layer).

### TypeScript

Strict mode is fully enabled (`strict`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `strictTemplates`). All code paths must return a value and templates are type-checked.
