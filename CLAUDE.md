# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**FlowTyping** — клиентский SPA-тренажёр слепой печати. Ключевая идея — «визуализация движения»: вместо подсветки целевой клавиши UI рисует путь, который должен проделать палец от домашней позиции до цели и обратно. Подробности — в `docs/01-philosophy-and-vision.md` и `docs/05-adaptive-learning-system.md`.

## Stack (actual)

- **SvelteKit 2 + Svelte 5 (runes)** + Vite, статический билд через `@sveltejs/adapter-static` (SPA, `fallback: index.html`).
- **TypeScript** (strict), `svelte-check` для типов.
- **XState v5** — вся бизнес-логика (`src/machines/`).
- **Vitest** для unit-тестов; **Storybook** (`@storybook/sveltekit` + svelte-csf).
- **CSS без фреймворков**: глобальные CSS custom properties в `src/app.css` (`--color-*`, `--spacing-*`, `--radius-*`, `--font-sans`) + scoped `<style>` блоки в каждом `.svelte`-компоненте. Никаких Tailwind, shadcn, CSS-in-JS, PostCSS-плагинов.
- Персистентность настроек — `localStorage` через кастомный Svelte writable store. `convex/` присутствует в зависимостях, но в рантайме не используется (legacy от прошлого стека).

> **Важно:** Проект мигрирован на SvelteKit/Svelte 5. `README.md`, `GEMINI.md` и `docs/` синхронизированы с кодом. При расхождении доверять исходникам и этому файлу. `AUDIT.md` (от 2026-06-01) — исторический документ, описывающий архитектуру до миграции.

## Commands

Всё идёт через `Makefile` — `package.json` намеренно без npm-скриптов.

| Команда | Что делает |
| --- | --- |
| `make dev` | `vite dev` на http://localhost:5173 |
| `make build` / `make preview` | сборка SPA в `build/` / preview |
| `make test` | `vitest run` (все тесты `src/**/*.test.ts`) |
| `make check` | `svelte-kit sync` + `svelte-check` (типы Svelte+TS) |
| `make lint` / `make lint-fix` | ESLint |
| `make storybook` | Storybook dev на http://localhost:6006 |
| `make check-all` | lint + check + test + build (запускать перед коммитом) |
| `make check-dev` | быстрый цикл: lint --quiet, svelte-check, vitest --dot |
| `make generate-verses` | компиляция и запуск `src/scripts/generate-verses.ts` |

Запуск одного теста: `npx vitest run src/lib/stats-calculator.test.ts` или `npx vitest run -t "имя теста"`.

`make install` — файл-маркер `node_modules` пересоздаётся только при изменении `package*.json` и сам триггерит `svelte-kit sync` (хук `prepare` удалён из package.json намеренно).

## Architecture

### Идея: ViewModel Pipeline + dumb UI

Бизнес-логика живёт в XState-машинах, UI — «глупый». Между ними — pipeline в `src/lib/viewModel-builder.ts`, который последовательно применяет чистые трансформеры к `HandsSceneViewModel` (idle → target finger states → visible clusters → navigation paths → error finger states → press results). Свойство `keyCapStates` определяется **только** у пальцев в состоянии `TARGET` (правило «Полного Кластера»). Все правила формирования ViewModel и сценарии ошибок — в `docs/03-ui-viewmodel-contract.md`; следовать им буквально.

### Иерархия XState-машин

- `appMachine` (`src/machines/app.machine.ts`) — корневая FSM экранов (`menu`, `settings`, `allStat`, `training`, `trainingComplete`, `initializing`). Запускается как singleton-актор в `appActor.ts` (на уровне модуля, с `import.meta.hot.decline()`, чтобы Vite HMR не плодил «двойных» акторов).
- `keyboardMachine` — invoked-ребёнок `appMachine`. Принимает физические `KEY_DOWN`/`KEY_UP` (раскладка передаётся через input), классифицирует их и отправляет родителю `KEYBOARD.CHARACTER_INPUT` (массив кодов одновременно зажатых клавиш) или `KEYBOARD.NAVIGATION_KEY` (Escape/Enter). `appMachine` форвардит `CHARACTER_INPUT` в `trainingService`.
- `trainingMachine` — invoked при входе в state `training`. Машина прогоняет `TypingStream`, сравнивает нажатые `KeyCapId[]` с `targetKeyCaps` через `areKeyCapIdArraysEqual` (порядок не важен — это набор), копит `attempts` с таймстемпами и по завершении отсылает `TRAINING.COMPLETE` родителю.

Подписка из Svelte-компонента: получить дочернего актора как `state.children.trainingService`, держать локальный `$state(snapshot)` + `subscribe()`/`unsubscribe()` в `$effect` (см. `TrainingScene.svelte`, `App.svelte`).

### Ключевые точки UI

- `src/routes/+page.svelte` → `src/components/app/App.svelte` — единственная страница, всё остальное переключается через `state.matches(...)` в `MainContent.svelte`.
- `App.svelte` навешивает `onkeydown`/`onkeyup`/`onblur` на `<svelte:window>` и шлёт `KEY_DOWN`/`KEY_UP`/`PAUSE` в `appActor`. Space внутри `training` блокируется (`preventDefault`), чтобы не скроллить.
- `TrainingScene.svelte` строит `viewModel` из текущего `StreamSymbol` и передаёт в `HandsExt.svelte`. `FlowLine` показывает поток символов с курсором.

### Типы и domain language

- Идентификаторы клавиш — `KeyCapId` (литеральное объединение всех физических клавиш, см. `src/interfaces/key-cap-id.ts`).
- Пальцы — `FingerId` = `L1..L5 | R1..R5 | LB | RB` (1=большой, 5=мизинец, B=ладонь). Левая рука = `L*`, правая = `R*`.
- `StreamSymbol` (`{ targetSymbol, targetKeyCaps, attempts }`) — единица тренировочного потока `TypingStream`.
- Раскладки разделены: **физическая** (`keyboard-layout-ansi.ts`, геометрия), **символьная** (`symbol-layout-en.ts` / `symbol-layout-ru.ts`, маппинг символ→KeyCapId+модификаторы), **пальцевая** (`finger-layout-asdf.ts`, какие KeyCapId за каким пальцем).
- В `src/interfaces/types.ts` есть явный header-комментарий: **JSDoc там является частью документации единого языка проекта — не удалять при рефакторинге**.

### Settings и i18n

- Стор: `src/lib/preferences.ts` — writable, грузится из `localStorage['flow-typing-user-preferences']` с `deepMerge` поверх `DEFAULT_USER_PREFERENCES` (чтобы новые поля корректно догружались у старых пользователей). Любой `update`/`set` автоматически сохраняется обратно.
- Метаданные настроек (тип, дефолты, опции) — `src/user-preferences/user-preferences.ts`.
- i18n: `src/lib/i18n.ts` — derived store, словари — JSON в `dictionaries/{en,ru}.json`.
- URL ↔ store sync для `?exerciseId=`: в `App.svelte` один `$effect` с one-shot guard'ом `hasSyncedFromUrl` (URL побеждает один раз при инициализации, дальше store пишет в URL через `goto(..., { replaceState: true })`).

### Псевдонимы импортов (svelte.config.js)

В `svelte.config.js` определены: `$lib` → `src/lib`, `$machines` → `src/machines`, `$components` → `src/components`, `$data` → `src/data`, `$interfaces` → `src/interfaces`, `$user-preferences` → `src/user-preferences`, `@` → `src`. **Фактически весь существующий код в `src/` использует только `@/...`** (например `import ... from '@/interfaces/types'`); `$`-алиасы определены, но в импортах не встречаются. Для консистентности с остальной кодовой базой использовать `@/...`, либо явно договариваться о переходе на `$`-алиасы и менять единообразно.

## Conventions

- **Naming** (см. `docs/02-naming-conventions.md`): `PascalCase` для типов; union-типы и object-типы — в единственном числе (`KeyCapPressResult`, `StreamSymbol`, а не `...Result*s*`). Никаких `KbdLayout`, `StrSym` — полные имена.
- ESLint: `@typescript-eslint/no-unused-vars`, `no-explicit-any`, `no-unused-expressions` — `warn`, не блокируют. В `*.test.ts` `no-explicit-any` отключён.
- Branch/commit: ветки `feat/...`, `fix/...`; Conventional Commits.
- Перед коммитом — `make check-all`.

## Gotchas

- **HMR и XState:** `appActor` создаётся на уровне модуля. `import.meta.hot.decline()` форсит full reload вместо HMR этого модуля. Если меняете `appActor.ts` / `app.machine.ts` и видите «двойные» события — это full-reload, состояние тренировки теряется (это by design, snapshot-restore не реализован).
- **Single source of truth для раскладки:** `appMachine` хардкодит `keyboardLayoutANSI` в invoke (`keyboardService`), но `currentKeyboardLayout` (qwerty/йцукен) приходит из user preferences через `START_TRAINING`. Это разные слои — физика клавиш vs. символьная раскладка.
- **`stream` иммутабелен по ссылке:** `trainingMachine` каждый раз делает `[...stream]` + замену символа. UI-производные через `$derived` пересчитываются автоматически.
- **`Space` vs `SpaceLeft`/`SpaceRight`:** физическая клавиша `Space` отдельно whitelist'нута как text key в `keyboardMachine.isTextKeyGuard`, потому что виртуальная раскладка делит пробел на две клавиши.
- **`make check-all` сломан:** в Makefile тело правила — `lint check test build` без `$(MAKE)`, т.е. это строка-команда, и Make пытается выполнить программу `lint` (получаем `make: lint: No such file or directory`, exit 2). Проверено вживую. Под-цели работают по отдельности: `make lint` (0 errors, 20 warnings — все на warn-уровне), `make check` (0 errors, 0 warnings), `make test` (149/149 passed), `make build` (✔ done). Чтобы прогнать всё — `make lint check test build` одной командой или починить рецепт (`$(MAKE) lint check test build`).
