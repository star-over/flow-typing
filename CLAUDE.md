# CLAUDE.md

## Project

**FlowTyping** — клиентский SPA-тренажёр слепой печати. Ключевая идея — «визуализация движения»: UI рисует путь, который должен проделать палец от домашней позиции до цели и обратно, вместо подсветки целевой клавиши. Подробности — `docs/01-philosophy-and-vision.md`, `docs/05-adaptive-learning-system.md`, `docs/06-component-contracts-and-themes.md`.

При расхождении кода с любой документацией доверять коду.

Канон решений: доменный глоссарий и сведённая текущая истина — `CONTEXT.md`; журнал архитектурных решений — `docs/adr/` (индекс и политика ведения — `docs/adr/README.md`). Перед изменением зафиксированного решения — прочитать его ADR и восстановить «почему»; смена курса оформляется новым ADR, тело принятого не переписывается.

## Design Context

Стратегия и визуальная система для дизайн-работы (skill `impeccable`) живут в корне:

- **`PRODUCT.md`** — регистр (`product`), пользователи, личность (*спокойный, точный, сосредоточенный*), anti-references (громкая геймификация / стерильный SaaS / перегруженные конкуренты) и 5 стратегических принципов: движение важнее подсветки · тишина — это функция · точность вперёд скорости · дом — это якорь · выверенность рождает доверие.
- **`DESIGN.md`** (+ sidecar `.impeccable/design.json`) — визуальная система. North Star «Тихий метроном»; нейтральный хром в оттенках серого, насыщенность только на визуализации движения; спектр пальцев; плоско по умолчанию (глубина через границы и кольца); Geist / Geist Mono.

## Stack

- **SvelteKit 2 + Svelte 5 (runes)** + Vite, статическая сборка через `@sveltejs/adapter-static` (SPA, `fallback: index.html`).
- **TypeScript** strict; типы Svelte — `svelte-check`.
- **XState v5** — вся бизнес-логика, `src/machines/`.
- **Vitest** + **Storybook** (`@storybook/sveltekit` + svelte-csf).
- **CSS без фреймворков**: `src/app.css` держит только primitives (typography/radius/spacing/shadow/motion) + body fallback; цвета и декорация компонентов живут в темах через **компонентные контракты** (см. ниже и `docs/06`). **Никаких Tailwind, shadcn, CSS-in-JS, PostCSS-плагинов.**
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

### ViewModel Pipeline + dumb UI

Бизнес-логика — в XState-машинах, UI — «глупый». Между ними — pipeline в `src/lib/hands-scene.ts`: чистые трансформеры последовательно строят `HandsSceneViewModel` (idle → target finger states → visible clusters → navigation paths → error finger states → press results). Свойство `keyCapStates` определяется **только** у пальцев в состоянии `TARGET` (правило «Полного Кластера»). Правила формирования ViewModel и сценарии ошибок — `docs/03-ui-viewmodel-contract.md`, следовать буквально.

### XState-машины

- `appMachine` (`src/machines/app.machine.ts`) — корневая FSM цикла тренировки (`menu`, `training` с substates `running`/`paused`, `sessionComplete`, `trainingStart`, `initializing`). Singleton-актор в `appActor.ts` (на уровне модуля, с `import.meta.hot.invalidate()`, чтобы HMR не плодил «двойных» акторов). Навигация между «страницами» (Settings, Stats) — настоящие SvelteKit-роуты, не состояния FSM.
- `keyboardMachine` — invoked-ребёнок `appMachine`. Принимает физические `KEY_DOWN`/`KEY_UP`, шлёт родителю `KEYBOARD.CHARACTER_INPUT` (массив одновременно зажатых кодов) или `KEYBOARD.NAVIGATION_KEY` (Escape/Enter). `appMachine` пересылает `CHARACTER_INPUT` в `sessionService` как `KEY_PRESS`.
- `sessionMachine` (`src/machines/session.machine.ts`) — invoked в state `training`. Таймерный жизненный цикл сессии: `loading` (первый fetch) → `active` (`armed`/`armedPaused` → `timing` {`running`/`refilling`} / `paused`) → `done`; таймер стартует с первого нажатия и живёт на `timing`-обёртке (ADR 0007). Собирает порцию drill'ов (`fetchDrills`), склеивает в непрерывный `TypingStream`, invoke'ит `trainingMachine` как внука, накапливает event-sourced проекцию `completed[]` из `TYPING.ADVANCED`, на чекпоинтах (перед дозагрузкой и в конце) вызывает `drillRecord` через `recordCheckpoint`. Провайдеры внедряются через `session-impl.ts`. По истечении таймера сессия сразу завершается (`done`): финальный чекпоинт + каноническая сводка `SessionSummaryPayload`, затем `SESSION.COMPLETE` родителю — без добора очереди (ADR 0007).
- `trainingMachine` — invoked внутри `sessionMachine` (внук `appMachine`). Чистый классификатор печати: прогоняет непрерывный `TypingStream`, сравнивает нажатые `KeyCapId[]` с `targetKeyCaps` через `areKeyCapIdArraysEqual` (порядок не важен), копит `attempts`, при продвижении курсора шлёт `TYPING.ADVANCED` вверх в `sessionMachine`. Завершение сессии решает таймер `sessionMachine`, не длина потока (нет `lessonComplete`).

Подписка из Svelte: `sessionService` — прямой ребёнок `appMachine` (`state.children.sessionService`); `trainingMachine` — внук под `sessionState.children.training`. `TrainingScene` подписывается на `sessionActor` (таймер, поток) и выводит вложенный `trainingActor` из `sessionState.children.training`.

### UI entry points

- Четыре роута: `/` (лендинг-placeholder с CTA на `/train`), `/train` (auth-барьер ADR 0012: гостю — приглашение войти, авторизованному — хост FSM-views `MenuScreen` / тренировка / `sessionComplete`), `/settings` (приложение: язык UI + тема + имя), `/stats` (журнал сеансов `sessionSummaries` + прогресс ступени; гостю — приглашение войти). Плюс `/signin` для auth UI.
- `src/routes/+layout.svelte` — размещает `appActor`, keyboard listener (`<svelte:window>` onkeydown/up/blur → `KEY_DOWN`/`KEY_UP`/`PAUSE`), theme effects и `Header` (nav-chrome с ссылками на `/settings` и `/stats`). При sibling-навигации layout не размонтируется — FSM состояние переживает навигацию.
- `src/routes/+page.svelte` — лендинг с CTA «Начать тренировку» (`href="/train"`). Inline-placeholder, контракт темы не выделен (tech-debt note inline; запись в `docs/backlog.md`).
- `src/routes/train/+page.svelte` → `src/components/app/App.svelte` — содержимое `/train`; рендерит `MainContent` (выбор по `state.matches(...)`) + `FooterActions` (process-controls, скрыт на `menu`).
- `Space` в `training` блокируется (`preventDefault`), чтобы не прокручивать.
- `TrainingScene.svelte` получает `sessionActor` (`state.children.sessionService`), подписывается на него для таймера и строит вложенный `trainingActor` (`sessionState.children.training`); передаёт `viewModel` в `HandsScene.svelte`; `FlowLine` показывает поток символов с курсором.

### Domain language

- `KeyCapId` (`src/interfaces/key-cap-id.ts`) — литеральное объединение всех физических клавиш.
- `FingerId` = `L1..L5 | R1..R5 | LB | RB`: 1 = большой, 5 = мизинец, B = ладонь, L/R = левая/правая рука.
- `StreamSymbol` (`{ targetSymbol, targetKeyCaps, attempts }`) — единица `TypingStream`.
- Три слоя раскладок, у каждого — тип данных + идентификатор: **физическая** `PhysicalLayout` / `PhysicalLayoutId` (геометрия железа, ANSI, инвариант); **символьная** `SymbolLayout` / `SymbolLayoutId` (`'qwerty' \| 'йцукен'`, выбор пользователя в `UserSettings.symbolLayoutId`); **пальцевая** `FingerLayout` / `FingerLayoutId` (ASDF). Имя слоя — в типе и в каждом поле: никаких `keyboardLayout`-полей с двойным смыслом.
- `src/interfaces/types.ts` имеет header-комментарий: **JSDoc там — часть документации единого языка, не удалять при рефакторинге.**

### Convex backend

Backend для синхронизированных данных (auth с Phase 2, settings sync, sessions). Запускается отдельным процессом параллельно с Vite.

- **Mode:** cloud dev deployment (`CONVEX_DEPLOYMENT=dev:wandering-ocelot-9` в `.env.local`, EU-West-1). Production-deployment — отдельный cloud-deployment позже.
- **Конфиг:** schema в `convex/schema.ts`. Функции — `convex/<module>.ts`, queries и mutations.
- **Клиент:** singleton `src/lib/convex.ts` экспортирует `convex` (ConvexClient) и `api` (типизированный ref). Компоненты импортируют `import { convex, api } from '@/lib/convex'`.
- **Env vars (.env.local, gitignored):**
  - `CONVEX_DEPLOYMENT` — вход для CLI
  - `PUBLIC_CONVEX_URL` — URL functions (для клиента)
  - `PUBLIC_CONVEX_SITE_URL` — URL HTTP-routes (для OAuth callbacks в Phase 2)
- **Запуск dev:** `make convex` в отдельном терминале параллельно с `make dev`.
- **Диагностика:** в Phase 1/2 была `/dev` страница (`health:ping/tick`); удалена в Phase 3, реальный sign-in теперь главный smoke entry point.

**Authentication.** Convex Auth (`@convex-dev/auth`). Конфигурация в `convex/auth.ts`:
- `createOrUpdateUserHandler` экспортирован отдельно (тестируется в `convex/auth.test.ts`).
- Правило **«провайдер = аккаунт»**: явно НЕ делаем link-by-email. Один email через GitHub и Google = два разных юзера. См. `docs/plans/auth.md` (Зафиксированные решения).
- Issuer whitelist: `convex/auth.config.ts`.
- HTTP routes: `convex/http.ts` (`auth.addHttpRoutes(http)`).
- Текущие провайдеры: GitHub, Google, Yandex. Apple/SberID — Roadmap V2.
- **Dev-вход (ADR 0012):** стоковый Password-провайдер за env-флагом `AUTH_DEV_LOGIN_ENABLED` (env Convex, только dev-deployment; на production флага нет — провайдера физически нет; собирается в `convex/auth.ts:buildProviders`). Кнопка на `/signin` — за клиентскими флагами `PUBLIC_DEV_LOGIN*` из `.env.local` (см. `.env.example`). Пара к нему — `resetMyProfile` («чистый лист» прогонов). Инструмент для ИИ-агентов/E2E (тренировка требует входа — `/train` и `drill*` auth-required), не продуктовый режим.

**Add new OAuth provider:**
1. Import из `@auth/core/providers/<name>` в `convex/auth.ts`.
2. Добавить в `providers` массив `convexAuth(...)`.
3. Зарегистрировать OAuth app у провайдера; callback URL = `<CONVEX_SITE_URL>/api/auth/callback/<name>` (это backend-side `.convex.site` URL, не frontend `PUBLIC_*`).
4. `npx convex env set AUTH_<NAME>_ID …` + `npx convex env set AUTH_<NAME>_SECRET …`.
5. Push: `npx convex dev --once` (или просто watcher подхватит).

**Auth-related env vars** (в Convex env, не в `.env.local`):
- `SITE_URL` — куда Convex перенаправляет после auth (Vite origin в dev: `http://localhost:5173`).
- `JWT_PRIVATE_KEY` + `JWKS` — RS256-ключи для self-issued JWT, генерируются `npx @convex-dev/auth`.
- `CONVEX_SITE_URL` — issuer URL, **НЕ устанавливать руками** (Convex выставляет автоматически для cloud).
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_YANDEX_ID`, `AUTH_YANDEX_SECRET` — credentials OAuth Apps (см. `Add new OAuth provider`).

**Viewer query:** `api.users.viewer` возвращает текущего юзера (документ из `users`) или `null`.

**Auth UI (Phase 3).** Клиентский flow строится на `@mmailaender/convex-auth-svelte` (community wrapper над `@convex-dev/auth`):
- `src/routes/+layout.svelte` — `setupConvexAuth({ client: convex, convexUrl: PUBLIC_CONVEX_URL })` + создаёт `authStore` через `createAuthStore()`, ставит в context `'auth'`.
- `src/lib/auth/auth-store.svelte.ts` — wrapper над `useAuth()` + `api.users.viewer` query. Сводит 3-state `AuthState`: `{ status: 'loading' | 'authenticated' | 'guest' }`. Loading удерживается до получения user-документа.
- `src/components/auth/SignInScreen.svelte` — экран входа на маршруте `/signin`.
- `src/components/auth/UserMenu.svelte` — компактный UI текущего юзера в Header (loading/guest/authenticated состояния).
- Контракт-токены: `SIGN_IN_SCREEN_CONTRACT` + `USER_MENU_CONTRACT` агрегированы в `THEME_CONTRACT`.
- Тесты: `auth-state.test.ts` покрывает `computeAuthState` pure-функцию (state derivation). Компоненты — Storybook stories.

**Тесты — vitest projects split (4 проекта, `vitest.config.ts`):**
- `src/**/*.test.ts` → project `src`, node environment, обычная Svelte+TS-вселенная (auth-store, компоненты, контракты).
- `convex/**/*.test.ts` → project `convex`, **`edge-runtime` environment**, `convex-test` для unit-тестов функций. Здесь `getAuthUserId`, `createOrUpdateUserHandler`, любая backend-логика, которая трогает `ctx.db`.
- `shared/**/*.test.ts` → project `shared`, node environment. Рантайм-модель, общая с сервером и инструментами (символьная раскладка, repertoire/progress, key-ladder) — без I/O.
- `auto-flow/**/*.test.ts` → project `auto-flow`, node environment. Инструментарий (сборка корпуса, загрузка раскладок с диска), в браузерную сборку не входит.

`make test` запускает все четыре проекта одной командой. Vitest предваряет вывод `|src|` / `|convex|` / `|shared|` / `|auto-flow|`.

**Куда писать тест:** правило простое — *где живёт код, там и тест*. UI/store-логика → `src/`. Backend-функции/callbacks → `convex/`. Cross-cutting интеграционные тесты (Phase 3+) — отдельный вопрос, обсуждать тогда.

### Темы и компонентные контракты

Каждый компонент с темизируемыми элементами имеет рядом `*.contract.ts` — массив имён CSS-токенов, которые компонент использует через `var()`. Имена — это **визуальные роли** (`--keycap-l2-background`, `--footer-actions-btn-success-border`, `--keycap-home-ring`), не цвет; значение каждого токена — **полное** CSS-свойство (`1px solid oklch(…)`, `0 0 0 0.25rem oklch(…)`), не только цвет.

Все 17 контрактов агрегируются в `src/themes/contract.ts → THEME_CONTRACT` (115 токенов). Контракт-тест `src/themes/contract.test.ts` enforce-ит, что каждая тема (`src/themes/<id>.css`) и `_template.css` декларируют каждый токен; значения свободны.

Темы в `src/themes/`:
- `light` / `sepia` (colorScheme=light), `dark` / `nord` (colorScheme=dark). Каталог — `THEMES` в `src/themes/registry.ts`.
- Внутри темы свободна структура: ссылки на свою внутреннюю палитру (legacy `--color-*`), формулы `oklch(from var(--key) …)`, литералы — любая смесь.
- `_template.css` — скелет для новой темы: каждый токен задан как `unset`, нужно только заполнить.
- Bootstrap синхронный — inline-script в `src/app.html` выставляет `data-theme` до первой отрисовки сцены. View Transitions API даёт crossfade при смене темы (`src/themes/registry.ts → setTheme`).

Полный гид по архитектуре и алгоритм добавления нового компонента — `docs/06-component-contracts-and-themes.md`.

### Settings и i18n

- `src/lib/settings.ts` — writable store; грузится из `localStorage['flow-typing-user-settings']` через `normalizeSettings` поверх `DEFAULT_USER_SETTINGS` (чтобы новые поля корректно догружались у старых пользователей, неизвестные — игнорировались). Любой `update`/`set` сохраняется обратно.
- Метаданные настроек (тип, дефолты, опции) — `src/user-settings/user-settings.ts`.
- i18n: `src/lib/i18n.ts` — derived store, словари `dictionaries/{en,ru}.json`. **Единое хранилище всех UI-строк (ADR 0022):** любая видимая пользователю строка приходит из i18n — компонент читает `$dictionary.<секция>.<ключ>` либо получает уже локализованную строку (передаёт как параметр); вшитых строковых литералов в разметке нет, даже у непереводимого (бренд `FlowTyping`, имена провайдеров) — оно просто совпадает по значению в `en`/`ru`, но лежит в словаре.

**Cross-device sync (Phase 5).** Для авторизованных юзеров настройки синхронизируются через Convex. Гость — только localStorage, никаких cloud-вызовов.

- **Стратегия:** «cloud wins при login». При transition authStore → `'authenticated'`: cloud пуст → push локальную копию в cloud (`upsertMine`); cloud есть → pull cloud → overwrite local (`settings.set`). При каждом локальном `update`/`set` во время authenticated → fire-and-forget `upsertMine` (silent eventually-consistent при offline).
- **Pure pipeline:** `src/lib/settings-sync.ts` — `decideSyncOnLogin`, `cloudRowToSettings`, `settingsToCloudArgs`. Тестируется без заглушек (`src/lib/settings-sync.test.ts`).
- **Orchestrator:** `attachCloudSync(...)` в `src/lib/settings.ts`. Вызывается из `src/routes/+layout.svelte` после `createAuthStore`. Internal guards: `hasSyncedThisSession` (one-shot pull/push per authentication session, защита от token-refresh flicker'а), `pushChain` (serialized push queue для in-order delivery при network reorder), `skipNextSubscribeCallback` (no echo push после pull), `isInitialSubscribe` (no push на init).
- **Backend:** `convex/userSettings.ts` — `getMine` query (auth-required, `null` при unauth), `upsertMine` mutation (auth-required, `throw 'Not authenticated'` при unauth). Логика в `getMineHandler` / `upsertMineHandler` — testable отдельно от auth-обёртки (паттерн `createOrUpdateUserHandler`). `updatedAt` ставит сервер.
- **«Провайдер = аккаунт» enforced на этом уровне:** `userSettings` row ссылается на `userId: v.id('users')`. Один email через GitHub vs Google = два юзера = два независимых settings row. By design.
- **Что НЕ реализовано:** live cross-tab/cross-device push (нужен Convex subscription, не делаем), timestamp-based LWW (нужен `local.updatedAt` хранение, не делаем — «cloud wins» простой и предсказуемый), UI sync-indicator (silent eventually-consistent через console.warn в dev).

## Conventions

- **Naming** (`docs/02-naming-conventions.md`): `PascalCase` для типов; union- и object-типы — в единственном числе (`KeyCapPressResult`, `StreamSymbol`, не `...Results`). Никаких аббревиатур (`KbdLayout`, `StrSym`) — только полные имена.
- **Импорты**: единственный псевдоним — `@/...` (= `src/`), объявлен в `svelte.config.js`. SvelteKit добавляет ещё `$lib` (built-in) автоматически, но проект его не использует.
- **Параметры функций** (для функций, которые мы объявляем сами): 1 параметр — позиционный (`fn(x)`); 2 и более — одним object literal с деструктуризацией (`fn({ a, b, c })`). Снимает зависимость от порядка аргументов и делает call-site самодокументируемым. Исключение — сигнатуры, которые мы не выбираем: коллбэки HOF (`.map((x, i) => …)`), event handlers, action/guard сигнатуры xstate, методы стандартных классов.
- **UI-строки → i18n (ADR 0022)**: ни одного строкового литерала-надписи в разметке компонента. Каждая видимая строка — из `$dictionary.<секция>.<ключ>` или получена как параметр (уже локализованная); правило держится и для непереводимого (бренд, имена провайдеров — совпадают по значению, но живут в словаре). Детали — «Settings и i18n».
- **Branch / commit**: ветки `feat/...`, `fix/...`; Conventional Commits.
- Перед коммитом — `make check-all` (включает `spell`; проверка должна быть **чистой**).
- **Орфография (CSpell) — workflow.** Во время работы над кодом и доками **не отвлекайся** на правописание: пиши как пишется. Spell-чек — отдельный шаг **перед коммитом**: `make check-all` включает `make spell` и должен быть зелёным (запускается с `--show-suggestions` — для незнакомого слова печатает варианты-подсказки). Если падает — `/fix-spell` делегирует разбор на дешёвую модель (Haiku) по правилам ниже.

- **Орфография (CSpell) — правила.** Конфиг `cspell.json` импортирует `@cspell/dict-ru_ru`, включает стоковые словари по стеку (`typescript`, `node`, `npm`, `css`, `html`, `svelte`, `git`, `fonts`, `fullstack`) и подключает проектный лексикон `.cspell/project-words.txt` через `dictionaryDefinitions` (поле `words` в `cspell.json` пустое — весь лексикон в файле-словаре). Когда `make spell` падает, каждое незнакомое слово разбирается строго по порядку:
  <!-- cSpell:ignore Cвет пользвателем клавишь лейбл иммутабельна валидируется colour initialised фича бранч синкает эндпоинт митигируем онбординга техдомене бекенд -->
  1. **Опечатка** (`Cвет` с латинской C, `пользвателем`, `клавишь`) → **fix в исходнике**.
  2. **Калька / транслитерация с понятным русским аналогом** (`лейбл`→`надпись`, `иммутабельна`→`неизменна`, `валидируется`→`проверяется`, `colour`→`color`, `initialised`→`initialized`, `фича`→`функция`, `бранч`→`ветка`, `синкает`→`синхронизирует`, `эндпоинт`→`endpoint`) → **переписать**, в whitelist **не класть**. Сложные/благозвучные аналоги тоже считаются (`митигируем`→`смягчаем`, `онбординга`→`адаптации`).
  3. **Реальное русское слово, которого нет в словаре** (`Раскомментировать`, `пересборке`, `попиксельная`, `выверенность`) → **строчной формой в `.cspell/project-words.txt`**. Но сперва проверь: `ru_ru` знает падежи известных слов — в файл идут только формы, которых он реально не знает (неологизмы, заимствования). Регистр игнорируется: одной строчной записи хватает на любой регистр.
  4. **Доменный термин или внешнее имя без аналога** (`keycap`, `viewmodel`, `FOUC`, `Backquote`, `Instapaper`, `Nord`, `ФЫВА`) → **в `.cspell/project-words.txt`**. Но сперва проверь, не покрыт ли он уже включённым стоковым словарём: многие термины и идентификаторы известны из коробки (`oklch` — словарь `css`, `crossfade` — `svelte`, camelCase-идентификаторы разбиваются на отдельные слова) — тогда добавлять не нужно.

- **Whitelist держать узким — жёстко.** Каждое новое слово в `.cspell/project-words.txt` должно проходить тест: «нет ли распространённого русского аналога? нет ли устоявшегося термина в этом техдомене? не покрыт ли он уже стоковым словарём или `ru_ru`? нет ли уже похожей формы того же слова?». При любом «да» — **не добавлять**, переписать. По регистру не дублируем — cspell не учитывает регистр, запись только строчными. Дубликаты форм одного слова (`бекенд` vs `бэкенд`) **запрещены** — оставляется одна каноническая (для бэкенда — через `э`). При сомнении дефолт — переписать в источнике, не добавлять в whitelist.

- **Inline-директивы `cSpell:ignore`** — только для редких file-locked случаев (base64/SVG-фрагмент, ASCII-диаграмма с искусственно сокращёнными именами, guard-grep по префиксу секрета вроде `GOCSPX`), не для глобальных терминов.

## Gotchas

- **HMR и XState:** `appActor` создаётся на уровне модуля. `import.meta.hot.invalidate()` форсит full reload вместо HMR. Если при правке `appActor.ts` / `app.machine.ts` видите «двойные» события — это full-reload, состояние тренировки теряется (by design, snapshot-restore не реализован).
- **`stream` неизменен по ссылке:** `trainingMachine` делает `[...stream]` + замену символа. UI-производные через `$derived` пересчитываются автоматически.
- **`Space` vs `SpaceLeft`/`SpaceRight`:** физическая `Space` отдельно whitelist'нута как text key в `keyboardMachine.isTextKeyGuard`, потому что клавиатурная сцена (`KeyboardSceneViewModel`) делит пробел на две клавиши.
