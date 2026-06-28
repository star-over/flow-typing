# Gemini Project Context: FlowTyping

This document provides a comprehensive overview of the FlowTyping project, its architecture, and development conventions to be used as instructional context.

## Project Overview

**FlowTyping** is a client-side SPA typing tutor application. Its core philosophy is **"reflexive-adaptive learning,"** focusing on building muscle memory through practice on real words rather than rote memorization.

The key innovation is **"movement visualization,"** an interface that shows the user the entire path a finger should travel from its home position to the target key and back, fostering a proprioceptive "feel" for the keyboard.

The application's logic is driven by an adaptive engine ("Dynamic Flow") that adjusts lesson difficulty based on performance metrics like speed, accuracy, and rhythm, aiming to keep the user in a state of "flow."

**Technology Stack:**
- **Framework:** SvelteKit 2 (SPA mode, static build via `@sveltejs/adapter-static`)
- **Language:** TypeScript (strict)
- **UI Library:** Svelte 5 (runes)
- **State Management:** XState v5 (for core logic), custom Svelte writable store (for UI settings)
- **Styling:** Plain CSS — global CSS custom properties (`src/app.css`) + scoped `<style>` blocks in each `.svelte` component
- **Testing:** Vitest
- **Component Development:** Storybook (`@storybook/sveltekit` + svelte-csf)

## Building and Running

All primary project commands are centralized in the `Makefile` for simplicity and consistency. `package.json` intentionally has no npm scripts.

- **Run development server:**
  ```bash
  make dev
  ```
  *The application will be available at `http://localhost:5173`.*

- **Run tests:**
  ```bash
  make test
  ```

- **Run all checks (lint, types, tests, build):**
  ```bash
  make check-all
  ```
  *This is the main command to run before committing changes to ensure code quality.*

- **Build for production:**
  ```bash
  make build
  ```

## Development Conventions

### Key Architectural Patterns

1.  **ViewModel Pipeline:** The architecture strictly separates business logic from the UI. State is managed by XState machines, and the output of this logic is transformed by `viewModel-builder.ts` into a "dumb" data structure called `HandsSceneViewModel`.
2.  **"Dumb" UI Components:** Svelte components (e.g., `HandsScene.svelte`) are responsible *only* for rendering the `HandsSceneViewModel`. They contain no business logic, ensuring they are simple, predictable, and easy to test.
3.  **Hierarchical State Management:** A global `app.machine.ts` models the training cycle (`menu`, `training`, `sessionComplete`), while an invoked `training.machine.ts` handles the complex logic of an individual typing session. Settings and stats live on dedicated SvelteKit routes (`/settings`, `/stats`), not as FSM states.
4.  **Settings Management:** User-facing settings are managed by a custom Svelte writable store (`src/lib/settings.ts`), which is decoupled from the core training logic and persists to `localStorage`.

### Naming Conventions

- All types, interfaces, and enums use `PascalCase`.
- Type names should be descriptive and avoid abbreviations (e.g., `KeyboardLayout` instead of `KbdLayout`).
- Union types representing IDs or states are in the singular (e.g., `type HandSide = 'Left' | 'Right'`).
- Object types are singular nouns (e.g., `interface StreamSymbol { ... }`).
- For a complete reference, see `docs/02-naming-conventions.md`.

## Key Directories and Files

- `docs/`: **The single source of truth for architecture.** Contains detailed documentation on project philosophy, naming conventions, the ViewModel contract, and the adaptive learning system.
- `src/machines/`: Contains the core application logic implemented as XState state machines (`app.machine.ts`, `training.machine.ts`, `keyboard.machine.ts`).
- `src/lib/hands-scene.ts`: The crucial file that transforms state machine output into the `HandsSceneViewModel` for the UI.
- `src/lib/`: Contains most of the project's business logic, including utilities for layout management, statistics calculation, pathfinding, settings, and i18n.
- `src/routes/+layout.svelte`: Hosts the singleton `appActor`, the global keyboard listener (`<svelte:window>` onkeydown/up/blur), theme effects, and the `Header` nav-chrome. Persists across sibling-route navigation so the FSM survives moving between `/`, `/settings`, and `/stats`.
- `src/components/app/App.svelte`: The content of the `/` route. Renders `MainContent` (FSM-driven view) and `FooterActions` (process controls, hidden on menu).
- `src/components/app/MainContent.svelte`: Switches between screens (`MenuScreen`, `TrainingScene`, `LessonStatsDisplay`, pause heading) based on `appMachine` state.
- `src/components/hands-scene/HandsScene.svelte`: The "dumb" Svelte component responsible for visualizing the hands and keyboard based on the ViewModel.
- `src/lib/settings.ts`: The Svelte store for managing user settings with `localStorage` persistence.
- `Makefile`: Centralized script runner for all common development tasks.
