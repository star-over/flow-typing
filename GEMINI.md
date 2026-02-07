# Gemini Project Context: FlowTyping

This document provides a comprehensive overview of the FlowTyping project, its architecture, and development conventions to be used as instructional context.

## Project Overview

**FlowTyping** is a sophisticated typing tutor application built with Next.js, React, and TypeScript. Its core philosophy is **"reflexive-adaptive learning,"** focusing on building muscle memory through practice on real words rather than rote memorization.

The key innovation is **"movement visualization,"** an interface that shows the user the entire path a finger should travel from its home position to the target key and back, fostering a proprioceptive "feel" for the keyboard.

The application's logic is driven by an adaptive engine ("Dynamic Flow") that adjusts lesson difficulty based on performance metrics like speed, accuracy, and rhythm, aiming to keep the user in a state of "flow."

**Technology Stack:**
- **Framework:** Next.js (with App Router)
- **Language:** TypeScript
- **UI Library:** React
- **State Management:** XState (for core logic), Zustand (for UI settings)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Testing:** Vitest
- **Component Development:** Storybook

## Building and Running

All primary project commands are centralized in the `Makefile` for simplicity and consistency.

- **Run development server:**
  ```bash
  make dev
  ```
  *The application will be available at `http://localhost:3000`.*

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
2.  **"Dumb" UI Components:** React components (e.g., `HandsExt.tsx`) are responsible *only* for rendering the `HandsSceneViewModel`. They contain no business logic, ensuring they are simple, predictable, and easy to test.
3.  **Hierarchical State Management:** A global `app.machine.ts` orchestrates high-level application states (like 'idle' or 'training'), while a spawned `training.machine.ts` handles the complex logic of an individual typing session.
4.  **Settings Management:** User-facing settings are managed by a `Zustand` store (`user-preferences.store.ts`), which is decoupled from the core training logic and persists to `localStorage`.

### Naming Conventions

- All types, interfaces, and enums use `PascalCase`.
- Type names should be descriptive and avoid abbreviations (e.g., `KeyboardLayout` instead of `KbdLayout`).
- Union types representing IDs or states are in the singular (e.g., `type HandSide = 'Left' | 'Right'`).
- Object types are singular nouns (e.g., `interface StreamSymbol { ... }`).
- For a complete reference, see `docs/02-naming-conventions.md`.

## Key Directories and Files

- `docs/`: **The single source of truth for architecture.** Contains detailed documentation on project philosophy, naming conventions, the ViewModel contract, and the adaptive learning system.
- `src/machines/`: Contains the core application logic implemented as XState state machines (`app.machine.ts`, `training.machine.ts`).
- `src/lib/viewModel-builder.ts`: The crucial file that transforms state machine output into the `HandsSceneViewModel` for the UI.
- `src/lib/`: Contains most of the project's business logic, including utilities for layout management, statistics calculation, and pathfinding.
- `src/components/app/MainContent.tsx`: The primary client-side component that wires together the state machines and the main UI.
- `src/components/ui/hands-ext.tsx`: The "dumb" React component responsible for visualizing the hands and keyboard based on the ViewModel.
- `src/store/user-preferences.store.ts`: The Zustand store for managing user settings.
- `Makefile`: Centralized script runner for all common development tasks.
