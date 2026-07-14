# src/lib — ViewModel, settings/i18n, клиентский auth

XState-машины — `src/machines/CLAUDE.md`; backend — `convex/CLAUDE.md`.

## Домены session и survey — раскладка

Принцип (Волна C аудита имён): **чистая логика — плоско в `src/lib/`; стор — в подкаталоге.** Новый logic-каталог не заводим, если рядом останутся неровно лежащие сиблинги; существующий маленький доменный каталог — достраиваем.

- **session, живая логика (плоско):** `session-config`, `session-queue`, `session-summarize`, `session-timer` — трансформеры, питающие `machines/session.machine.ts`. Лежат плоско единообразно с соседями `drill-summarize` / `drill-stream` / `batch-budget` / `exposure-reading` / `typing-stream` — это **самостоятельные термины глоссария** (`CONTEXT.md`: Drill / Batch / Exposure / DrillSummary / TypingStream), не под-части session; в `session/` их не собирать.
- **session, журнал (`session-history/`):** `sessions-store.svelte.ts` — стор завершённых сеансов (таблица `/stats`). Имя `session-history` (не плюральный `sessions/`) снимает двусмысленность «живые vs прошлые сессии».
- **survey (`survey/`):** весь домен в одном каталоге — `micro-survey.ts` (чистая логика показа, ADR 0013) + `survey-store.svelte.ts` (стор ответов). Асимметрия с плоской session-логикой сознательна: `survey/` уже существовал и домен крошечный, достроить дешевле, чем плодить `session/`.

## ViewModel Pipeline + dumb UI

Бизнес-логика — в XState-машинах, UI — «глупый». Между ними — pipeline в `src/lib/hands-scene.ts`: чистые трансформеры последовательно строят `HandsSceneViewModel` (idle → target finger states → visible clusters → navigation paths → error finger states → press results). Свойство `keyCapStates` определяется **только** у пальцев в состоянии `TARGET` (правило «Полного Кластера»). Правила формирования ViewModel и сценарии ошибок — `docs/03-ui-viewmodel-contract.md`, следовать буквально.

## Settings и i18n

- `src/lib/settings.ts` — writable store; грузится из `localStorage['flow-typing-user-settings']` через `normalizeSettings` поверх `DEFAULT_USER_SETTINGS` (чтобы новые поля корректно догружались у старых пользователей, неизвестные — игнорировались). Любой `update`/`set` сохраняется обратно.
- Метаданные настроек (тип, дефолты, опции) — `src/user-settings/defaults.ts`.
- i18n: `src/lib/i18n.ts` — derived store, словари `dictionaries/{en,ru}.json`. **Единое хранилище всех UI-строк (ADR 0022):** любая видимая пользователю строка приходит из i18n — компонент читает `$dictionary.<секция>.<ключ>` либо получает уже локализованную строку (передаёт как параметр); вшитых строковых литералов в разметке нет, даже у непереводимого (бренд `FlowTyping`, имена провайдеров) — оно просто совпадает по значению в `en`/`ru`, но лежит в словаре.

## Cross-device sync (Phase 5)

Для авторизованных юзеров настройки синхронизируются через Convex. Гость — только localStorage, никаких cloud-вызовов. Backend-часть (`getMine`/`upsertMine`, «провайдер = аккаунт») — `convex/CLAUDE.md`.

- **Стратегия:** «cloud wins при login». При transition authStore → `'authenticated'`: cloud пуст → push локальную копию в cloud (`upsertMine`); cloud есть → pull cloud → overwrite local (`settings.set`). При каждом локальном `update`/`set` во время authenticated → fire-and-forget `upsertMine` (silent eventually-consistent при offline).
- **Pure pipeline:** `src/lib/settings-sync.ts` — `decideSyncOnLogin`, `cloudRowToSettings`, `settingsToCloudArgs`. Тестируется без заглушек (`src/lib/settings-sync.test.ts`).
- **Orchestrator:** `attachCloudSync(...)` в `src/lib/settings.ts`. Вызывается из `src/routes/+layout.svelte` после `createAuthStore`. Internal guards: `hasSyncedThisSession` (one-shot pull/push per authentication session, защита от token-refresh flicker'а), `pushChain` (serialized push queue для in-order delivery при network reorder), `skipNextSubscribeCallback` (no echo push после pull), `isInitialSubscribe` (no push на init).
- **Что НЕ реализовано:** live cross-tab/cross-device push (нужен Convex subscription, не делаем), timestamp-based LWW (нужен `local.updatedAt` хранение, не делаем — «cloud wins» простой и предсказуемый), UI sync-indicator (silent eventually-consistent через console.warn в dev).

## Auth UI (Phase 3) — клиентский flow

Строится на `@mmailaender/convex-auth-svelte` (community wrapper над `@convex-dev/auth`). Backend auth (провайдеры, dev-вход, env) — `convex/CLAUDE.md`.

- `src/routes/+layout.svelte` — `setupConvexAuth({ client: convex, convexUrl: PUBLIC_CONVEX_URL })` + создаёт `authStore` через `createAuthStore()`, ставит в context `'auth'`.
- `src/lib/auth/auth-store.svelte.ts` — wrapper над `useAuth()` + `api.users.viewer` query. Сводит 3-state `AuthState`: `{ status: 'loading' | 'authenticated' | 'guest' }`. Loading удерживается до получения user-документа.
- `src/components/auth/SignInScreen.svelte` — экран входа на маршруте `/signin`.
- `src/components/auth/UserMenu.svelte` — компактный UI текущего юзера в Header (loading/guest/authenticated состояния).
- Контракт-токены: `SIGN_IN_SCREEN_CONTRACT` + `USER_MENU_CONTRACT` агрегированы в `THEME_CONTRACT`.
- Тесты: `auth-state.test.ts` покрывает `computeAuthState` pure-функцию (state derivation). Компоненты — Storybook stories.
