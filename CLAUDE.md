# CLAUDE.md

## Project

**FlowTyping** — клиентский SPA-тренажёр слепой печати. Ключевая идея — «визуализация движения»: UI рисует путь, который должен проделать палец от домашней позиции до цели и обратно, вместо подсветки целевой клавиши. Подробности — `docs/01-philosophy-and-vision.md`, `docs/05-adaptive-learning-system.md`.

При расхождении кода с любой документацией доверять коду.

## Stack

- **SvelteKit 2 + Svelte 5 (runes)** + Vite, статический билд через `@sveltejs/adapter-static` (SPA, `fallback: index.html`).
- **TypeScript** strict; типы Svelte — `svelte-check`.
- **XState v5** — вся бизнес-логика, `src/machines/`.
- **Vitest** + **Storybook** (`@storybook/sveltekit` + svelte-csf).
- **CSS без фреймворков**: CSS custom properties в `src/app.css` + scoped `<style>` в каждом компоненте. **Никаких Tailwind, shadcn, CSS-in-JS, PostCSS-плагинов.**
- Персистентность настроек — `localStorage` через кастомный Svelte writable store.

## Commands

Единая точка входа — `Makefile`. `package.json` намеренно без npm-скриптов.

| Команда | Что делает |
| --- | --- |
| `make dev` | `vite dev` на http://localhost:5173 |
| `make build` / `make preview` | сборка SPA в `build/` / preview |
| `make test` | `vitest run` |
| `make check` | `svelte-kit sync` + `svelte-check` |
| `make lint` / `make lint-fix` | ESLint |
| `make storybook` | Storybook на http://localhost:6006 |
| `make check-all` | lint + check + test + build (перед коммитом) |
| `make check-dev` | быстрый цикл: eslint --quiet, svelte-check, vitest --dot |
| `make generate-verses` | компиляция и запуск `src/scripts/generate-verses.ts` |

Один тест: `npx vitest run src/lib/<file>.test.ts` или `npx vitest run -t "имя теста"`.

## Architecture

### ViewModel Pipeline + dumb UI

Бизнес-логика — в XState-машинах, UI — «глупый». Между ними — pipeline в `src/lib/viewModel-builder.ts`: чистые трансформеры последовательно строят `HandsSceneViewModel` (idle → target finger states → visible clusters → navigation paths → error finger states → press results). Свойство `keyCapStates` определяется **только** у пальцев в состоянии `TARGET` (правило «Полного Кластера»). Правила формирования ViewModel и сценарии ошибок — `docs/03-ui-viewmodel-contract.md`, следовать буквально.

### XState-машины

- `appMachine` (`src/machines/app.machine.ts`) — корневая FSM экранов (`menu`, `settings`, `allStat`, `training`, `trainingComplete`, `initializing`). Singleton-актор в `appActor.ts` (на уровне модуля, с `import.meta.hot.decline()`, чтобы HMR не плодил «двойных» акторов).
- `keyboardMachine` — invoked-ребёнок `appMachine`. Принимает физические `KEY_DOWN`/`KEY_UP`, шлёт родителю `KEYBOARD.CHARACTER_INPUT` (массив одновременно зажатых кодов) или `KEYBOARD.NAVIGATION_KEY` (Escape/Enter). `appMachine` форвардит `CHARACTER_INPUT` в `trainingService`.
- `trainingMachine` — invoked в state `training`. Прогоняет `TypingStream`, сравнивает нажатые `KeyCapId[]` с `targetKeyCaps` через `areKeyCapIdArraysEqual` (порядок не важен), копит `attempts` с таймстемпами, по завершении шлёт `TRAINING.COMPLETE`.

Подписка из Svelte: дочерний актор через `state.children.trainingService`, локальный `$state(snapshot)` + `subscribe()`/`unsubscribe()` в `$effect` — образец в `TrainingScene.svelte`, `App.svelte`.

### UI entry points

- `src/routes/+page.svelte` → `src/components/app/App.svelte` — единственная страница; экраны переключаются через `state.matches(...)` в `MainContent.svelte`.
- `App.svelte` навешивает `onkeydown`/`onkeyup`/`onblur` на `<svelte:window>` и шлёт `KEY_DOWN`/`KEY_UP`/`PAUSE` в `appActor`. `Space` в `training` блокируется (`preventDefault`), чтобы не скроллить.
- `TrainingScene.svelte` строит `viewModel` и передаёт в `HandsExt.svelte`; `FlowLine` показывает поток символов с курсором.

### Domain language

- `KeyCapId` (`src/interfaces/key-cap-id.ts`) — литеральное объединение всех физических клавиш.
- `FingerId` = `L1..L5 | R1..R5 | LB | RB`: 1 = большой, 5 = мизинец, B = ладонь, L/R = левая/правая рука.
- `StreamSymbol` (`{ targetSymbol, targetKeyCaps, attempts }`) — единица `TypingStream`.
- Раскладки разделены: **физическая** (`keyboard-layout-ansi.ts`, геометрия), **символьная** (`symbol-layout-{en,ru}.ts`, символ → KeyCapId + модификаторы), **пальцевая** (`finger-layout-asdf.ts`, KeyCapId → FingerId).
- `src/interfaces/types.ts` имеет header-комментарий: **JSDoc там — часть документации единого языка, не удалять при рефакторинге.**

### Settings и i18n

- `src/lib/preferences.ts` — writable store; грузится из `localStorage['flow-typing-user-preferences']` через `deepMerge` поверх `DEFAULT_USER_PREFERENCES` (чтобы новые поля корректно догружались у старых пользователей). Любой `update`/`set` сохраняется обратно.
- Метаданные настроек (тип, дефолты, опции) — `src/user-preferences/user-preferences.ts`.
- i18n: `src/lib/i18n.ts` — derived store, словари `dictionaries/{en,ru}.json`.
- URL ↔ store sync для `?exerciseId=`: в `App.svelte` один `$effect` с one-shot guard'ом `hasSyncedFromUrl` (URL побеждает один раз при init, дальше store пишет в URL через `goto(..., { replaceState: true })`).

## Conventions

- **Naming** (`docs/02-naming-conventions.md`): `PascalCase` для типов; union- и object-типы — в единственном числе (`KeyCapPressResult`, `StreamSymbol`, не `...Results`). Никаких аббревиатур (`KbdLayout`, `StrSym`) — только полные имена.
- **Импорты**: используется алиас `@/...` (= `src/`). `$lib`/`$machines`/... в `svelte.config.js` объявлены, но **в коде не используются** — для новых файлов следовать `@/`.
- **Branch / commit**: ветки `feat/...`, `fix/...`; Conventional Commits.
- Перед коммитом — `make check-all`.

## Gotchas

- **HMR и XState:** `appActor` создаётся на уровне модуля. `import.meta.hot.decline()` форсит full reload вместо HMR. Если при правке `appActor.ts` / `app.machine.ts` видите «двойные» события — это full-reload, состояние тренировки теряется (by design, snapshot-restore не реализован).
- **Два слоя раскладки:** `appMachine` хардкодит `keyboardLayoutANSI` (**физическая** геометрия, инвариант), а `currentKeyboardLayout` (qwerty/йцукен — **символьная**) приходит из preferences через `START_TRAINING`. Не путать слои.
- **`stream` иммутабелен по ссылке:** `trainingMachine` делает `[...stream]` + замену символа. UI-производные через `$derived` пересчитываются автоматически.
- **`Space` vs `SpaceLeft`/`SpaceRight`:** физическая `Space` отдельно whitelist'нута как text key в `keyboardMachine.isTextKeyGuard`, потому что виртуальная раскладка делит пробел на две клавиши.
