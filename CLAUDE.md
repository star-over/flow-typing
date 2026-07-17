# CLAUDE.md

## Project

**FlowTyping** — клиентский SPA-тренажёр слепой печати. Ключевая идея — «визуализация движения»: UI рисует путь, который должен проделать палец от домашней позиции до цели и обратно, вместо подсветки целевой клавиши. Подробности — `docs/01-philosophy-and-vision.md`, `docs/05-adaptive-learning-system.md`, `docs/06-component-contracts-and-themes.md`.

При расхождении кода с любой документацией доверять коду.

Канон решений: доменный глоссарий и сведённая текущая истина — `CONTEXT.md`; журнал архитектурных решений — `docs/adr/` (индекс и политика ведения — `docs/adr/README.md`). Перед изменением зафиксированного решения — прочитать его ADR и восстановить «почему»; смена курса оформляется новым ADR, тело принятого не переписывается.

## Design Context

Дизайн-работа ведётся навыком `impeccable`; стратегия и визуальная система лежат в корне репозитория:

- **`PRODUCT.md`** — регистр (`product`), пользователи, личность, anti-references и стратегические принципы (движение важнее подсветки · тишина — функция · точность вперёд скорости · дом — якорь · выверенность рождает доверие).
- **`DESIGN.md`** — визуальная система: North Star «Тихий метроном», нейтральный серый хром, насыщенность только на визуализации движения; спектр пальцев; плоско по умолчанию (глубина через границы и кольца). Конкретные значения токенов — в коде (`src/themes/*.css`, `src/app.css`), не дублируются.

Детали читать в этих файлах при дизайн-работе.

## Stack

- **SvelteKit + Svelte (runes)** + Vite, статическая сборка через `@sveltejs/adapter-static` (SPA, `fallback: index.html`). Версии — `package.json`.
- **TypeScript** strict; типы Svelte — `svelte-check`.
- **XState** — вся бизнес-логика, `src/machines/`.
- **Vitest** + **Storybook** (`@storybook/sveltekit` + svelte-csf).
- **CSS без фреймворков**: `src/app.css` держит только primitives (typography/radius/spacing/shadow/motion) + body fallback; цвета и декорация компонентов живут в темах через **компонентные контракты** (см. `src/themes/CLAUDE.md` и `docs/06`). **Никаких Tailwind, shadcn, CSS-in-JS, PostCSS-плагинов.**
- Хранение настроек — `localStorage` через собственный Svelte writable store.

## Commands

Единая точка входа — `Makefile`. `package.json` намеренно без npm-скриптов.

| Команда | Что делает |
| --- | --- |
| `make dev` | `vite dev` на http://localhost:5173 |
| `make convex` | `npx convex dev` — sync с cloud dev deployment + watch-deploy функций |
| `make build` / `make preview` | сборка SPA в `build/` / preview |
| `make test` | `vitest run` |
| `make coverage` | `vitest run --coverage` (v8 provider, text-отчёт в консоли) |
| `make check` | `svelte-kit sync` + `svelte-check` |
| `make lint` / `make lint-fix` | ESLint |
| `make spell` | CSpell на коде + витрине + словарях (конфиг `cspell.json`, лексикон `.cspell/project-words.txt`) |
| `make storybook` | Storybook на http://localhost:6006 |
| `make check-all` | lint + check + test + spell + build + `convex dev --once` (перед коммитом) |
| `make check-dev` | быстрый цикл: eslint --quiet, svelte-check, vitest --dot |
| `make create-drills` | компиляция и запуск `src/scripts/create-drills.ts` |

Один тест: `npx vitest run src/lib/<file>.test.ts` или `npx vitest run -t "имя теста"`.

## Architecture

Бизнес-логика — в XState-машинах (`src/machines/`), UI — «глупый»; между ними — ViewModel pipeline (`src/lib/hands-scene.ts`). Глубина по подсистемам вынесена во вложенные `CLAUDE.md` (см. ниже). Здесь остаётся только сквозной глоссарий и тест-раскладка.

### Документация подсистем (грузятся по обращению к каталогу)

Детали подсистем живут во вложенных `CLAUDE.md` — Claude Code подтягивает их автоматически, когда открываешь файлы каталога, поэтому они не висят в общем контексте постоянно. **Ссылаться на них — обычным текстом, не через `@import`** (иначе загрузятся сразу при старте и экономия обнулится).

- `src/machines/CLAUDE.md` — XState-машины (`appMachine` / `keyboardMachine` / `sessionMachine` / `trainingMachine`), подписки из Svelte, machine-Gotchas (HMR, `stream`, `Space`).
- `src/lib/CLAUDE.md` — ViewModel pipeline, settings + i18n + cross-device sync, клиентский Auth UI.
- `src/routes/CLAUDE.md` — роуты, `+layout` (appActor, keyboard listener, Header), `TrainingScene`.
- `src/themes/CLAUDE.md` — темы и компонентные контракты (`*.contract.ts`, `THEME_CONTRACT`).
- `convex/CLAUDE.md` — backend: deployment, схема, auth-провайдеры, dev-вход, env vars, `userSettings`, convex-тесты.

### Domain language

- `KeyCapId` (`src/interfaces/key-cap-id.ts`) — литеральное объединение всех физических клавиш.
- `FingerId` = `L1..L5 | R1..R5 | LB | RB`: 1 = большой, 5 = мизинец, B = ладонь, L/R = левая/правая рука.
- `StreamSymbol` (`{ targetSymbol, targetKeyCaps, attempts }`) — единица `TypingStream`.
- Три слоя раскладок, у каждого — тип данных + идентификатор: **физическая** `PhysicalLayout` / `PhysicalLayoutId` (геометрия железа, ANSI, инвариант); **символьная** `SymbolLayout` / `SymbolLayoutId` (`'qwerty' \| 'йцукен'`, выбор пользователя в `UserSettings.symbolLayoutId`); **пальцевая** `FingerLayout` / `FingerLayoutId` (ASDF). Имя слоя — в типе и в каждом поле: никаких `keyboardLayout`-полей с двойным смыслом.
- `src/interfaces/types.ts` имеет header-комментарий: **JSDoc там — часть документации единого языка, не удалять при рефакторинге.**

### Тесты

**vitest projects split (`vitest.config.ts`):**
- `src/**/*.test.ts` → project `src`, node environment, обычная Svelte+TS-вселенная (auth-store, компоненты, контракты).
- `convex/**/*.test.ts` → project `convex`, **`edge-runtime` environment**, `convex-test` для unit-тестов функций. Здесь `getAuthUserId`, `createOrUpdateUserHandler`, любая backend-логика, которая трогает `ctx.db`.
- `shared/**/*.test.ts` → project `shared`, node environment. Рантайм-модель, общая с сервером и инструментами (символьная раскладка, repertoire/progress, key-ladder) — без I/O.
- `auto-flow/**/*.test.ts` → project `auto-flow`, node environment. Инструментарий (сборка корпуса, загрузка раскладок с диска), в браузерную сборку не входит.

`make test` запускает все проекты одной командой. Vitest предваряет вывод меткой проекта (`|src|` / `|convex|` / `|shared|` / `|auto-flow|`).

**Куда писать тест:** правило простое — *где живёт код, там и тест*. UI/store-логика → `src/`. Backend-функции/callbacks → `convex/`. Cross-cutting интеграционные тесты (Phase 3+) — отдельный вопрос, обсуждать тогда.

## Conventions

- **Naming** (`docs/02-naming-conventions.md`): `PascalCase` для типов; union- и object-типы — в единственном числе (`KeyCapPressResult`, `StreamSymbol`, не `...Results`). Никаких аббревиатур (`KbdLayout`, `StrSym`) — только полные имена.
- **Импорты**: единственный псевдоним — `@/...` (= `src/`), объявлен в `svelte.config.js`. SvelteKit добавляет ещё `$lib` (built-in) автоматически, но проект его не использует.
- **Параметры функций** (для функций, которые мы объявляем сами): 1 параметр — позиционный (`fn(x)`); 2 и более — одним object literal с деструктуризацией (`fn({ a, b, c })`). Снимает зависимость от порядка аргументов и делает call-site самодокументируемым. Исключение — сигнатуры, которые мы не выбираем: коллбэки HOF (`.map((x, i) => …)`), event handlers, action/guard сигнатуры xstate, методы стандартных классов.
- **Type-safety — без escape-hatch'ей** (поведенческий инвариант; инструментом enforced лишь частично, уровень правил — в ESLint-конфиге): избегать `any`, `@ts-ignore`/`@ts-expect-error` без пояснения-причины, non-null `!`; промисы не «ронять» (`await` либо явный `void`); для discriminated union и состояний XState — исчерпывающий разбор (`never`-ветка в `default`).
- **Границы слоёв** (по договорённости, dependency-cruiser не подключён — держим руками): `src` не импортирует `shared` (ADR 0014, развязка); `auto-flow` не импортирует `convex`; UI (`src/components`) не обращается к Convex за данными напрямую — только через `src/lib/convex.ts` (единственное исключение — type-only `Id` из `convex/_generated`).
- **UI-строки → i18n (ADR 0022)**: ни одного строкового литерала-надписи в разметке компонента. Каждая видимая строка — из `$dictionary.<секция>.<ключ>` или получена как параметр (уже локализованная); правило держится и для непереводимого (бренд, имена провайдеров — совпадают по значению, но живут в словаре). Детали — «Settings и i18n» в `src/lib/CLAUDE.md`.
- **Branch / commit**: ветки `feat/...`, `fix/...`; Conventional Commits.
- Перед коммитом — `make check-all` (включает `spell`; проверка должна быть **чистой**).
- **Орфография (CSpell).** Во время работы над кодом и доками **не отвлекаться** на правописание — писать как пишется. Spell-чек — отдельный шаг **перед коммитом**: `make check-all` включает `make spell` (с `--show-suggestions`), должен быть зелёным. Если падает — навык **`/fix-spell`** (на Haiku) разбирает каждое незнакомое слово по строгим правилам классификации: опечатка → фикс в источнике; калька с русским аналогом → переписать, в whitelist не класть; реальное русское слово, которого нет в `ru_ru`, или доменный термин / внешнее имя без аналога → строчной формой в `.cspell/project-words.txt` (сперва проверив, не покрыт ли он уже стоковым словарём). Whitelist держать **узким**, дубликаты форм запрещены; при сомнении — переписать в источнике, не добавлять. Конфиг — `cspell.json`, лексикон — `.cspell/project-words.txt`. Inline-директивы `cSpell:ignore` — только для редких file-locked случаев (base64/SVG-фрагмент, guard-grep по префиксу секрета).
<!-- cSpell:ignore лейбл бранч -->
