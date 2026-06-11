# Phase 5: Settings Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Настройки пользователя (interfaceLanguage, textLanguage, symbolLayoutId, theme) синхронизируются между устройствами через Convex для залогиненных юзеров. Гость продолжает работать с localStorage без cloud-вызовов. Стратегия: **«cloud wins при логине»** — если в cloud есть row, она перетирает локальную копию; если cloud пуст, локальная копия push'ится туда. После логина каждый локальный update пушится в cloud fire-and-forget (silent eventually-consistent при offline).

**Architecture:** Три слоя:
1. **Backend** (`convex/schema.ts` + `convex/userSettings.ts`) — таблица `userSettings` с index `by_user`; `getMine` query (auth-required), `upsertMine` mutation (auth-required, insert-or-patch по `userId`). Логика вынесена в testable handlers (`getMineHandler` / `upsertMineHandler`) по паттерну Phase 2 `createOrUpdateUserHandler`. `updatedAt` ставит сам Convex (`Date.now()` на сервере).
2. **Pure pipeline** (`src/lib/settings-sync.ts`) — pure-функции `decideSyncOnLogin` и `cloudRowToSettings`. Никаких side-effects, тестируются без заглушек.
3. **Orchestrator** (`attachCloudSync` в `src/lib/settings.ts` + вызов из `src/routes/+layout.svelte`) — слушает `authStore.state`, при transition в `'authenticated'` делает pull/push decision; subscribe'ится на settings updates и пушит в cloud. Skip-first-call защищает от push'а на init. Тестируется browser-smoke'ом.

**Tech Stack:** Convex (`convex@~1.20`) + `@convex-dev/auth` + `convex-test` (edge-runtime project) · SvelteKit 2 + Svelte 5 (runes) · TypeScript strict · vitest projects split (`src` node / `convex` edge-runtime).

> **Стек в одном предложении:** Backend — Convex queries/mutations с `getAuthUserId` для авторизации (`@convex-dev/auth/server`); тесты — `convex-test` в edge-runtime. Фронт — pure-функции в `src/lib/`, orchestrator в layout'е, тесты pure-части в `src/lib/*.test.ts` (node env). Тесты бизнес-логики синхронизируются с реальной формой данных через TS-типы из `convex/_generated/dataModel`.

---

## Starting state (после Phase 4)

- **Master HEAD:** `0f3b3ee feat(auth): add Google OAuth as second provider` (41 commits ahead of origin/master). Working tree clean.
- **Backend:** `convex/schema.ts` — только `...authTables` + `health` table. `convex/auth.ts` — GitHub + Google providers, тестируемый `createOrUpdateUserHandler`. `convex/users.ts` — `viewer` query (использует `getAuthUserId`).
- **Frontend:** `src/lib/settings.ts` — writable store с `normalizeSettings` + `STORAGE_KEY`. Subscribe'ы пишут в `localStorage[STORAGE_KEY]` + mirror `localStorage[THEME_STORAGE_KEY]`. Никакой интеграции с auth.
- **Auth store:** `createAuthStore()` в `src/lib/auth/auth-store.svelte.ts` — runes-based, экспортирует reactive `state` (3-state: `loading`/`authenticated`/`guest`).
- **Layout:** `src/routes/+layout.svelte` — bootstrap auth, ставит `setContext('auth', authStore)`. Уже импортирует `{ settings } from '@/lib/settings'` (для текущих theme/lang $effect'ов). Phase 5 добавляет вызов `attachCloudSync` после `createAuthStore`.
- **Convex env (set in Phase 1-4):** `AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET`, `SITE_URL=http://localhost:5173`, `JWT_PRIVATE_KEY`, `JWKS`. Phase 5 НЕ требует новых env.
- **Tests baseline:** `src` project + `convex` project (Phase 2). `convex/auth.test.ts` тестирует `createOrUpdateUserHandler` через `convex-test` — паттерн для Phase 5.
- **THEME_CONTRACT:** 111 токенов в 17 контрактах (`grep ... | wc -l = 111`). Phase 5 НЕ добавляет UI-компонентов → счётчик не меняется.

## Phase 5 deliverables

- `convex/schema.ts` — +`userSettings` table с `by_user` index
- `convex/userSettings.ts` — `getMineHandler`, `upsertMineHandler` (pure-ish, testable), `getMine` query (auth-check), `upsertMine` mutation (auth-check)
- `convex/userSettings.test.ts` — handler-tests + auth-fail тест для mutation
- `src/lib/settings-sync.ts` — `decideSyncOnLogin`, `cloudRowToSettings`, типы `CloudSettings`, `SyncOnLoginDecision`
- `src/lib/settings-sync.test.ts` — TDD-тесты pure-функций
- `src/lib/settings.ts` — экспорт функции `attachCloudSync(...)` (orchestrator)
- `src/routes/+layout.svelte` — вызов `attachCloudSync({ authStore, settings, pullCloud, pushCloud })` + onDestroy cleanup
- `CLAUDE.md` — обновить «Settings и i18n» секцию (упомянуть Phase 5 sync поведение)
- **Browser smoke** (Task 5): cross-device theme change visible + guest без cloud работает

## Зафиксированные решения

- **`updatedAt` — server-gen.** Convex mutation сам ставит `Date.now()`. Клиент не передаёт его в args и не использует для LWW-решений. Аргумент: проще и надёжнее. Цена: offline edits во второй сессии того же юзера могут проиграть pull'у (теряются), но это narrow edge case для одного активного юзера за раз. Подтверждено user'ом.
- **Без UI-индикатора sync-состояния.** Silent eventually-consistent. Если push fail (offline) — следующее изменение его повторит; при следующем pull cloud перетрёт. UI добавим позже, если придёт реальный запрос. Подтверждено user'ом.
- **«Cloud wins при login».** При логине: cloud пуст → push local (first sync); cloud есть → pull cloud (overwrite local). Это **не** classic LWW (без явного `cloud.updatedAt` vs `local.updatedAt` сравнения) — простой и предсказуемый rule. Альтернатива (timestamp-based LWW) требовала бы хранить `local.updatedAt` в localStorage и обновлять его при каждом локальном edit — сложнее и не даёт реального value для одного-активного-юзера паттерна. Если потом понадобится — добавится в Phase 5.1.
- **Push-on-update — fire-and-forget без debounce.** Каждый `settings.update`/`set` → один `upsertMine` вызов. User меняет настройки нечасто (1-2 раза за сессию); debounce пока не нужен. Если push fail (network) — silent catch, следующий update перешлёт. При offline → online настройки подтянутся со следующим изменением или с pull при следующем mount.
- **Логика handler'ов — testable, auth-check — в обёртке.** Pattern Phase 2: `getMineHandler({ ctx, userId })` / `upsertMineHandler({ ctx, userId, settings })` принимают уже резолвленный `userId: Id<'users'>` → тестируются напрямую через `t.run(ctx)`. Query/mutation обёртка делает `getAuthUserId(ctx)`, query возвращает `null` при unauth, mutation throws. Это критично — `getAuthUserId` отсутствие в mutation = cross-user write backdoor (та же дыра что Phase 4 review поймал на dev-mutation).
- **Sync синхронизирует все 4 поля UserSettings.** `interfaceLanguage`, `textLanguage`, `symbolLayoutId`, `theme`. Сейчас это весь shape; других device-local-only полей нет. Если в будущем добавится device-only поле (e.g. `lastDrillId`) — оно живёт ВНЕ `UserSettings`, в отдельном storage.
- **Хранение `theme: 'auto'` в cloud.** Cloud получает буквальное значение `theme` из store, включая `'auto'`. Кросс-устройство — если на A была `'auto'`, на B после pull тоже `'auto'` (= системная тема на B). Это разумно: `'auto'` — пользовательское предпочтение, не значение.
- **При logout localStorage НЕ сбрасывается.** Текущие settings остаются, гость продолжает с тем что было. Альтернатива (reset to DEFAULT_USER_SETTINGS) — surprise factor для юзера. Подтверждённый паттерн: «logout — это локальный operation, не data wipe».
- **Не используем `Storage` event для cross-tab sync.** Если две вкладки одного браузера — каждая делает свой pull/push отдельно. Может быть transient inconsistency, разрешается следующим mutation. Cross-tab `'storage'` event — вне scope Phase 5.
- **Field shape таблицы `userSettings` следует текущему `UserSettings` (4 поля: `interfaceLanguage`, `textLanguage`, `symbolLayoutId`, `theme`), а НЕ устаревшему umbrella-наброску (`languageId`, `themeId`, `fingerLayoutId`).** Umbrella `docs/plans/auth.md:510-516` написан до Phase 3 финального shape'а `UserSettings` (Phase 3 переименовал поля). Источник правды — `src/interfaces/user-settings.ts`. План синхронизирует ровно тот shape, что есть в store; добавление полей в Phase 6+ — отдельная schema-migration с явным планом.
- **Push сериализация (per-tab in-order).** `attachCloudSync` поддерживает `pushChain` Promise — каждый новый push цепляется через `.then`, что гарантирует, что push'и одной вкладки отправляются и обрабатываются Convex'ом в порядке user-actions. Без этой защиты network-reorder двух последовательных `upsertMine` мог бы дать «cloud видит первое значение последним» (toggle dark → light → dark в cloud вместо light). Цена — небольшая задержка при rapid sequential edits; user-flow это не нагружает.
- **Single-session sync guard.** Pull/push при login-sync делается **один раз за authentication session** — флаг `hasSyncedThisSession`. Token-refresh flicker (`authenticated → loading → authenticated` без logout) НЕ запускает повторный pull, что защищает pending local edit'ы от перетирания. Logout (`'guest'`) сбрасывает флаг; при следующем login снова one-shot sync. Failure пути (pull throws, push throws в `else`-ветке) сбрасывают флаг → следующий state-tick повторит попытку.

## File Structure

```
convex/
├── schema.ts                     # MODIFY: + userSettings table
├── userSettings.ts               # NEW: handlers + query + mutation
└── userSettings.test.ts          # NEW: handler tests + auth-fail test

src/
├── lib/
│   ├── settings.ts               # MODIFY: + export attachCloudSync, refactor subscribe layout
│   ├── settings.test.ts          # UNTOUCHED: normalizeSettings tests
│   ├── settings-sync.ts          # NEW: pure decideSyncOnLogin + cloudRowToSettings
│   └── settings-sync.test.ts     # NEW: pure tests
└── routes/
    └── +layout.svelte            # MODIFY: + attachCloudSync wire after authStore

CLAUDE.md                          # MODIFY: update Settings и i18n section
```

**Untouched (с обоснованиями):**
- `convex/auth.ts`, `convex/auth.test.ts`, `convex/auth.config.ts`, `convex/http.ts` — auth-backend, orthogonal к settings sync.
- `convex/users.ts` — `viewer` query orthogonal.
- `src/interfaces/user-settings.ts` — `UserSettings` type без изменений (sync синхронизирует существующий shape).
- `src/user-settings/user-settings.ts` — `DEFAULT_USER_SETTINGS` без изменений.
- `src/lib/auth/*` — auth-store API уже даёт reactive `state`; никаких правок.
- `src/themes/*` — Phase 5 не UI-фаза, контрактов не добавляет.
- `cspell.json` — никаких новых слов (TS/CSS identifiers и так whitelisted).

---

## Pre-flight Checks

**Требования.**
- Convex deployment `wandering-ocelot-9` работает (Phase 1-4 baseline). `.env.local` содержит `CONVEX_DEPLOYMENT` и `PUBLIC_CONVEX_URL`.
- Залогиненный GitHub или Google аккаунт для browser smoke в Task 5 (Phase 4 baseline; никакой новой регистрации не нужно).
- ~45-60 минут непрерывного времени.

- [ ] **Чистый `master`:**

```bash
git status --porcelain          # пусто
git log -1 --oneline            # ожидаемо: 0f3b3ee feat(auth): add Google OAuth as second provider
git switch master
git switch feat/settings-sync 2>/dev/null || git switch -C feat/settings-sync
```

> **Resume support.** Если ветка `feat/settings-sync` уже существует (второй заход после прерывания) — `git switch` без `-C` подхватит существующее состояние. Чтобы понять, на каком task'е остановился — `git log master..HEAD --oneline` (commit-messages привязаны к task'ам).

- [ ] **Watcher в отдельном терминале:**

```bash
make convex
```

Должен подключиться к `wandering-ocelot-9.eu-west-1.convex.cloud`. Оставить running на всё время Phase 5 — schema migration в Task 1 + codegen для новых `convex/userSettings.ts` функций требуют watcher push.

> **Watcher = mandatory для Phase 5.** Отличие от Phase 4: Phase 5 добавляет новые Convex функции (`api.userSettings.getMine/upsertMine`) — типы в `convex/_generated/api.d.ts` регенерируются watcher'ом. Без него `make check` в Task 3+ упадёт на missing `api.userSettings`. Если забыл — `npx convex dev --once` за один push.

- [ ] **Verify env:**

```bash
npx convex env list | grep -E 'AUTH_|SITE_URL|JWT_'
```

Ожидаемо: `AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET`, `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`. Если пусто — Phase 1-4 baseline сломан, не start Phase 5.

- [ ] **Baseline green:**

```bash
make check-all 2>&1 | tail -10
```

Zero errors. Если красное — fix перед стартом (Phase 5 предполагает Phase 4 в зелёном).

---

## Task 1: Schema — `userSettings` table

**Files:**
- Modify: `convex/schema.ts`

**Цель:** добавить таблицу `userSettings` со ссылкой на `users` и `by_user` индексом. После Task 1 schema готова, но никаких функций для записи/чтения ещё нет (Task 2). Watcher push'нет миграцию в cloud — таблица появится в Convex dashboard как пустая.

- [ ] **Step 1.1: Прочитать текущий `convex/schema.ts`**

```bash
cat convex/schema.ts
```

Ожидаемое содержимое:

```ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,
  health: defineTable({
    tickedAt: v.number(),
  }),
});
```

- [ ] **Step 1.2: Добавить `userSettings` table**

Заменить содержимое `convex/schema.ts` на:

```ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,
  health: defineTable({
    tickedAt: v.number(),
  }),
  // Per-user UI settings. Source of truth для cross-device sync.
  // Connected to users via userId; одна row на юзера (enforced upsertMine).
  // updatedAt — server-gen, ставится сервером при каждом upsert.
  userSettings: defineTable({
    userId: v.id('users'),
    interfaceLanguage: v.string(),
    textLanguage: v.string(),
    symbolLayoutId: v.string(),
    theme: v.string(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),
});
```

**Что значит каждое решение:**
- `v.string()` для всех 4 полей (а не `v.union(v.literal('en'), v.literal('ru'))`): Convex schema не должна знать про domain-литералы — это leaky abstraction (любое расширение `InterfaceLanguage` потребует schema migration + waiting period). Нормализация делается на клиенте через `normalizeSettings` при pull. Цена: невалидное значение в cloud не вызывает schema error → клиент нормализует к дефолту. Это правильное поведение для forward-compat.
- `v.id('users')` для `userId` — type-safe ref. Convex enforced check, что вставляемый id реально из таблицы `users`.
- `by_user` index — для O(1) lookup в `getMineHandler` (`.withIndex('by_user', q => q.eq('userId', userId)).unique()`).
- `updatedAt: v.number()` — миллисекунды Unix epoch. Сейчас не читается клиентом, но дёшево хранить; useful для отладки и future LWW upgrade.

- [ ] **Step 1.3: Verify watcher подхватил миграцию**

В терминале с `make convex`:

```
✓ Schema validation complete.
Convex functions ready! (XXXms)
```

Если watcher выдал ошибку schema validation — значит typo или конфликт с existing data. Phase 5 — add-only (новая таблица, не правка существующей), data conflict невозможен. Typo — `v.string` vs `v.string()`, `v.id('users')` vs `v.id(users)`.

- [ ] **Step 1.4: Verify в dashboard (optional)**

```bash
npx convex dashboard
```

В таблицах должна появиться `userSettings` (0 rows). Это glance-check, не препятствие: schema push уже зафиксирован watcher'ом в Step 1.3.

- [ ] **Step 1.5: `make check`**

```bash
make check 2>&1 | tail -5
```

Zero errors. `convex/_generated/dataModel.d.ts` должен содержать `Doc<'userSettings'>` и `Id<'userSettings'>` — без них Task 2 не сможет импортировать типы.

- [ ] **Step 1.6: Commit**

```bash
git status --short              # ожидаемо: M convex/schema.ts + M convex/_generated/*
git add convex/schema.ts convex/_generated/
git commit -m "feat(settings): add userSettings table to Convex schema"
```

> **Зачем коммитить `convex/_generated/`:** в проекте этот каталог отслеживается в git (Phase 1 решение). Watcher регенерирует файлы при правке schema/функций; они должны быть в коммите чтобы `make check` без watcher'а проходил. Если `git status` не показывает `_generated/` — значит watcher не обработал, перезапусти `make convex` и подожди.

---

## Task 2: `convex/userSettings.ts` — handlers + queries (TDD)

**Files:**
- New: `convex/userSettings.ts`
- New: `convex/userSettings.test.ts`

**Цель:** реализовать `getMineHandler` / `upsertMineHandler` (testable, без `getAuthUserId`) и тонкие обёртки `getMine` query / `upsertMine` mutation (с auth-check). TDD-цикл: тест RED → handler GREEN → integration auth-test GREEN. После Task 2 backend готов; клиент может вызывать `api.userSettings.getMine/upsertMine`, но никто ещё не вызывает (Task 3-4).

> **Pattern:** один-к-одному с `createOrUpdateUserHandler` (`convex/auth.ts`) + `viewer` query (`convex/users.ts`). Phase 2 заложил этот паттерн; Phase 5 его повторяет.

- [ ] **Step 2.1: Создать `convex/userSettings.test.ts` — RED (handler tests)**

Создай файл `convex/userSettings.test.ts`:

```ts
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { getMineHandler, upsertMineHandler } from './userSettings';
import schema from './schema';

// import.meta.glob для convex-test (паттерн из convex/auth.test.ts)
const modules = import.meta.glob('./**/*.ts');

const validSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  theme: 'auto',
};

describe('getMineHandler', () => {
  test('returns null when no row exists for user', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      const result = await getMineHandler({ ctx, userId });
      expect(result).toBeNull();
    });
  });

  test('returns row when one exists for user', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      await ctx.db.insert('userSettings', {
        userId,
        ...validSettings,
        theme: 'dark',
        updatedAt: 1000,
      });
      const result = await getMineHandler({ ctx, userId });
      expect(result).not.toBeNull();
      expect(result?.theme).toBe('dark');
      expect(result?.userId).toBe(userId);
    });
  });

  test('isolates rows between users (returns only own)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userA = await ctx.db.insert('users', { email: 'a@example.com' });
      const userB = await ctx.db.insert('users', { email: 'b@example.com' });
      await ctx.db.insert('userSettings', {
        userId: userA,
        ...validSettings,
        theme: 'light',
        updatedAt: 1000,
      });
      await ctx.db.insert('userSettings', {
        userId: userB,
        ...validSettings,
        theme: 'dark',
        updatedAt: 2000,
      });
      const resultA = await getMineHandler({ ctx, userId: userA });
      const resultB = await getMineHandler({ ctx, userId: userB });
      expect(resultA?.theme).toBe('light');
      expect(resultB?.theme).toBe('dark');
    });
  });
});

describe('upsertMineHandler', () => {
  test('inserts new row when none exists', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      const id = await upsertMineHandler({
        ctx,
        userId,
        settings: { ...validSettings, theme: 'dark' },
      });
      const row = await ctx.db.get(id);
      expect(row).not.toBeNull();
      expect(row?.theme).toBe('dark');
      expect(row?.userId).toBe(userId);
      expect(typeof row?.updatedAt).toBe('number');
      expect(row?.updatedAt).toBeGreaterThan(0);
    });
  });

  test('patches existing row in place when one exists (no duplicate)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      const firstId = await upsertMineHandler({
        ctx,
        userId,
        settings: { ...validSettings, theme: 'light' },
      });
      const secondId = await upsertMineHandler({
        ctx,
        userId,
        settings: { ...validSettings, theme: 'dark' },
      });
      expect(secondId).toBe(firstId); // same row, patched
      const all = await ctx.db.query('userSettings').collect();
      expect(all).toHaveLength(1);
      expect(all[0].theme).toBe('dark');
    });
  });

  test('updates updatedAt on patch', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      await upsertMineHandler({ ctx, userId, settings: validSettings });
      const firstRow = await ctx.db
        .query('userSettings')
        .withIndex('by_user', q => q.eq('userId', userId))
        .unique();
      const firstUpdatedAt = firstRow!.updatedAt;

      // Wait a tick to ensure Date.now() advances
      await new Promise(r => setTimeout(r, 10));

      await upsertMineHandler({
        ctx,
        userId,
        settings: { ...validSettings, theme: 'dark' },
      });
      const secondRow = await ctx.db
        .query('userSettings')
        .withIndex('by_user', q => q.eq('userId', userId))
        .unique();
      expect(secondRow!.updatedAt).toBeGreaterThan(firstUpdatedAt);
    });
  });

  test('isolates rows between users (upsert on A does not touch B)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userA = await ctx.db.insert('users', { email: 'a@example.com' });
      const userB = await ctx.db.insert('users', { email: 'b@example.com' });
      await upsertMineHandler({
        ctx,
        userId: userA,
        settings: { ...validSettings, theme: 'light' },
      });
      await upsertMineHandler({
        ctx,
        userId: userB,
        settings: { ...validSettings, theme: 'dark' },
      });
      const all = await ctx.db.query('userSettings').collect();
      expect(all).toHaveLength(2);
      const rowA = all.find(r => r.userId === userA);
      const rowB = all.find(r => r.userId === userB);
      expect(rowA?.theme).toBe('light');
      expect(rowB?.theme).toBe('dark');
    });
  });
});
```

- [ ] **Step 2.2: Run tests — RED**

```bash
make test 2>&1 | tail -20
```

Ожидаемо: `convex` project падает с «Cannot find module './userSettings'» (или похожее — handler файла ещё нет). Тесты в проекте `src` остаются зелёными.

- [ ] **Step 2.3: Создать `convex/userSettings.ts` — ТОЛЬКО handlers (queries/mutations ещё нет)**

Создай файл `convex/userSettings.ts`. В этом шаге пишем **только** `getMineHandler` и `upsertMineHandler` — query/mutation обёртки добавятся в Step 2.7 (по своему RED-циклу).

```ts
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

// Узкий, тестируемый helper. Принимает уже резолвленный userId — никакой auth ceremony.
// Lib-обёртка (query getMine, см. Step 2.7) делает getAuthUserId и зовёт сюда.
// Паттерн повторяет createOrUpdateUserHandler из convex/auth.ts.
export async function getMineHandler({
  ctx,
  userId,
}: {
  ctx: QueryCtx;
  userId: Id<'users'>;
}) {
  return await ctx.db
    .query('userSettings')
    .withIndex('by_user', q => q.eq('userId', userId))
    .unique();
}

// Insert-or-patch по userId. updatedAt — server-gen (Date.now() здесь).
// Один row на юзера обеспечивается .unique() lookup'ом + insert/patch веткой.
export async function upsertMineHandler({
  ctx,
  userId,
  settings,
}: {
  ctx: MutationCtx;
  userId: Id<'users'>;
  settings: {
    interfaceLanguage: string;
    textLanguage: string;
    symbolLayoutId: string;
    theme: string;
  };
}): Promise<Id<'userSettings'>> {
  const existing = await ctx.db
    .query('userSettings')
    .withIndex('by_user', q => q.eq('userId', userId))
    .unique();

  const now = Date.now();
  if (existing === null) {
    return await ctx.db.insert('userSettings', {
      userId,
      ...settings,
      updatedAt: now,
    });
  }
  await ctx.db.patch(existing._id, {
    ...settings,
    updatedAt: now,
  });
  return existing._id;
}
```

**Что значат конкретные решения:**
- `.unique()` вместо `.first()` — assertion, что не больше одной row на user. Если каким-то путём появятся две (manual dashboard edit?) — `.unique()` бросит, что лучше silent-pick-first-and-corrupt-state.
- `now = Date.now()` ставится один раз в начале функции (consistency между insert и patch ветками).
- Возвращаем `Id<'userSettings'>` из mutation (не сам doc) — на клиенте id не используется, но return-value помогает на тестах и в будущем для optimistic updates.

- [ ] **Step 2.4: Run tests — handler-тесты GREEN**

```bash
make test 2>&1 | tail -20
```

Ожидаемо: все 7 handler-тестов зелёные (3 в `getMineHandler` describe + 4 в `upsertMineHandler` describe). Auth-fail тесты для query/mutation обёрток — отдельный RED-цикл в Step 2.5.

Если красное:
- `Cannot find name 'Id'` — typo в импорте; должно быть `import type { Id } from './_generated/dataModel'`.
- `Property 'withIndex' does not exist` — schema не подхвачена, codegen не сработал; перезапусти `make convex`.
- `.unique() threw because more than one row` — handler-логика баг; проверь, что Step 2.3 — insert-or-patch (без второго insert при существующем row).

- [ ] **Step 2.5: Дописать auth-fail тесты — RED (query/mutation ещё нет)**

Открой `convex/userSettings.test.ts` и **в конец файла** добавь два новых describe-блока, импорт `api` в начале файла:

```ts
// В начало файла, в общий блок импортов (после `import schema from './schema';`):
import { api } from './_generated/api';
```

В конец файла:

```ts
describe('getMine query — auth check', () => {
  test('returns null when no identity (unauthenticated caller)', async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.userSettings.getMine, {});
    expect(result).toBeNull();
  });
});

describe('upsertMine mutation — auth check', () => {
  test('throws when no identity (unauthenticated caller)', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.userSettings.upsertMine, validSettings),
    ).rejects.toThrow(/not authenticated/i);
  });

  test('does NOT insert row when call fails on auth check', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const before = await ctx.db.query('userSettings').collect();
      expect(before).toHaveLength(0);
    });
    await expect(
      t.mutation(api.userSettings.upsertMine, validSettings),
    ).rejects.toThrow();
    await t.run(async (ctx) => {
      const after = await ctx.db.query('userSettings').collect();
      expect(after).toHaveLength(0);
    });
  });
});
```

`api` импорт — относительный (`./_generated/api`), это паттерн convex-test (см. документацию convex-test и `convex/auth.test.ts`).

- [ ] **Step 2.6: Run tests — RED (api.userSettings.getMine не существует)**

```bash
make test 2>&1 | tail -20
```

Ожидаемо: convex project падает с «Property 'userSettings' does not exist on type ... api» или «Cannot read properties of undefined (reading 'getMine')» — типы в `_generated/api.d.ts` ещё не содержат `getMine`/`upsertMine`, потому что Step 2.3 их не добавил. Это **намеренный RED** — следующий step (2.7) добавит query/mutation.

- [ ] **Step 2.7: Добавить query/mutation обёртки в `convex/userSettings.ts`**

Открой `convex/userSettings.ts`. **В начало файла** (в блок импортов) добавь:

```ts
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
```

**В конец файла** добавь:

```ts
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await getMineHandler({ ctx, userId });
  },
});

export const upsertMine = mutation({
  args: {
    interfaceLanguage: v.string(),
    textLanguage: v.string(),
    symbolLayoutId: v.string(),
    theme: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error('Not authenticated');
    }
    return await upsertMineHandler({ ctx, userId, settings: args });
  },
});
```

**Что значат конкретные решения:**
- `throw new Error('Not authenticated')` в mutation: Convex сериализует error.message в response — клиент получит читаемую ошибку. Не делаем `return null` для mutation: это была бы silent-success-which-isn't.
- `getMine` возвращает `null` при unauth (а не throw) — query семантически «спрашивает», unauth — это «у вас нет аккаунта», не ошибка.

- [ ] **Step 2.8: Run tests — все GREEN (handler + auth-check)**

```bash
make test 2>&1 | tail -15
```

Ожидаемо: все handler + auth-check тесты зелёные (7 handler + 3 auth = 10 новых тестов в `convex/userSettings.test.ts`).

Если auth-fail тест странно проходит/падает:
- Проходит «не bring expected error»: проверь `if (userId === null) throw new Error(...)` в Step 2.7.
- Падает с другим текстом — `getAuthUserId` API изменилось между версиями `@convex-dev/auth`. Сверь с `convex/users.ts:viewer` (тот же паттерн, известно рабочий).
- Wait — codegen ещё не подхватил новые функции: подожди watcher (терминал с `make convex`) → «functions ready» → повтори `make test`.

- [ ] **Step 2.9: `make check`**

```bash
make check 2>&1 | tail -5
```

Zero errors. `convex/_generated/api.d.ts` должен содержать типы `getMine` и `upsertMine` под `api.userSettings.*`.

- [ ] **Step 2.10: Commit**

```bash
git add convex/userSettings.ts convex/userSettings.test.ts convex/_generated/
git commit -m "feat(settings): add userSettings getMine/upsertMine with auth guards"
```

---

## Task 3: Pure sync pipeline (`src/lib/settings-sync.ts`) — TDD

**Files:**
- New: `src/lib/settings-sync.ts`
- New: `src/lib/settings-sync.test.ts`

**Цель:** изолировать decision-логику синхронизации в pure-функции, тестировать без заглушек. Orchestrator (`attachCloudSync`) в Task 4 будет использовать эти pure-функции.

После Task 3 есть:
- `decideSyncOnLogin({ cloudRow, localSettings })` — возвращает `{ action: 'pull' | 'push', settings }`
- `cloudRowToSettings(cloud)` — конверсия cloud-row shape → UserSettings (через `normalizeSettings` для robustness против невалидных значений)
- `settingsToCloudArgs(settings)` — конверсия UserSettings → upsertMine args shape (drop runtime-only fields, если есть; сейчас просто identity)

- [ ] **Step 3.1: Создать `src/lib/settings-sync.test.ts` — RED**

Создай файл `src/lib/settings-sync.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import {
  cloudRowToSettings,
  decideSyncOnLogin,
  settingsToCloudArgs,
  type CloudSettings,
} from './settings-sync';
import type { UserSettings } from '@/interfaces/user-settings';

const validLocal: UserSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  theme: 'auto',
};

const validCloud: CloudSettings = {
  interfaceLanguage: 'ru',
  textLanguage: 'ru',
  symbolLayoutId: 'йцукен',
  theme: 'dark',
  updatedAt: 1000,
};

describe('decideSyncOnLogin', () => {
  test('cloudRow=null → push local settings (first sync / new user)', () => {
    const decision = decideSyncOnLogin({ cloudRow: null, localSettings: validLocal });
    expect(decision.action).toBe('push');
    expect(decision.settings).toEqual(validLocal);
  });

  test('cloudRow present → pull cloud (cloud wins)', () => {
    const decision = decideSyncOnLogin({ cloudRow: validCloud, localSettings: validLocal });
    expect(decision.action).toBe('pull');
    expect(decision.settings).toEqual({
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'йцукен',
      theme: 'dark',
    });
  });

  test('cloudRow present even if equal to local → still pull (idempotent, no special case)', () => {
    const sameAsCloud: UserSettings = {
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'йцукен',
      theme: 'dark',
    };
    const decision = decideSyncOnLogin({ cloudRow: validCloud, localSettings: sameAsCloud });
    expect(decision.action).toBe('pull');
    expect(decision.settings).toEqual(sameAsCloud);
  });
});

describe('cloudRowToSettings', () => {
  test('valid cloud row → corresponding UserSettings shape (raw, без нормализации)', () => {
    const result = cloudRowToSettings(validCloud);
    expect(result).toEqual({
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'йцукен',
      theme: 'dark',
    });
  });

  test('strips _id / updatedAt / userId — только settings fields', () => {
    const result = cloudRowToSettings(validCloud);
    expect(Object.keys(result).sort()).toEqual([
      'interfaceLanguage',
      'symbolLayoutId',
      'textLanguage',
      'theme',
    ]);
  });

  test('does NOT normalize invalid values — это работа settings.set / normalizeSettings', () => {
    // Невалидные значения проходят через cloudRowToSettings как есть.
    // Нормализация случается «на входе» в store (settings.set → normalizeSettings).
    // Это разделение: settings-sync — pure shape transform, settings.ts — store guard.
    const result = cloudRowToSettings({
      ...validCloud,
      theme: 'neon-pink', // невалидный
      symbolLayoutId: 'dvorak', // невалидный
    });
    expect(result.theme).toBe('neon-pink');
    expect(result.symbolLayoutId).toBe('dvorak');
  });
});

describe('settingsToCloudArgs', () => {
  test('UserSettings → flat args shape (identity now, but typed boundary)', () => {
    const args = settingsToCloudArgs(validLocal);
    expect(args).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      theme: 'auto',
    });
  });

  test('does not include extra fields beyond 4 settings', () => {
    const args = settingsToCloudArgs(validLocal);
    expect(Object.keys(args).sort()).toEqual([
      'interfaceLanguage',
      'symbolLayoutId',
      'textLanguage',
      'theme',
    ]);
  });
});
```

- [ ] **Step 3.2: Run tests — RED**

```bash
make test 2>&1 | tail -15
```

Ожидаемо: тесты в `src/lib/settings-sync.test.ts` падают с «Cannot find module './settings-sync'».

- [ ] **Step 3.3: Создать `src/lib/settings-sync.ts`**

Создай файл `src/lib/settings-sync.ts`:

```ts
import type { UserSettings } from '@/interfaces/user-settings';

/**
 * Shape of userSettings row returned by Convex getMine.
 * Mirror'ит `Doc<'userSettings'>` без runtime-зависимости от convex types
 * (тесты этого модуля бегут в node env без convex codegen).
 */
export type CloudSettings = {
  interfaceLanguage: string;
  textLanguage: string;
  symbolLayoutId: string;
  theme: string;
  updatedAt: number;
};

export type SyncOnLoginDecision =
  | { action: 'pull'; settings: UserSettings }
  | { action: 'push'; settings: UserSettings };

/**
 * Pure decision: при transition authStore → 'authenticated', что делать?
 *
 * Стратегия — «cloud wins при login»:
 * - cloud пуст (юзер не синхронизировался ни на одном устройстве) → push локальную копию (first sync).
 * - cloud есть (где-то уже синхронизировались) → pull cloud (это и есть source of truth).
 *
 * Это НЕ classic LWW с явным сравнением timestamps. Аргумент: для одного-активного-юзера
 * паттерна (один человек, переключается между устройствами) cloud == последнее
 * актуальное состояние. Альтернатива (хранить local.updatedAt и сравнивать) добавляет
 * complexity без реального value. Если когда-нибудь появится multi-user / concurrent-edit
 * use case — заменяется на timestamp-based LWW без изменения публичного API.
 */
export function decideSyncOnLogin({
  cloudRow,
  localSettings,
}: {
  cloudRow: CloudSettings | null;
  localSettings: UserSettings;
}): SyncOnLoginDecision {
  if (cloudRow === null) {
    return { action: 'push', settings: localSettings };
  }
  return { action: 'pull', settings: cloudRowToSettings(cloudRow) };
}

/**
 * Cloud row → UserSettings shape. Raw type-cast — без runtime normalization.
 *
 * Любой невалидный value в cloud (e.g. legacy theme name, future-compat значение,
 * данные руками поправленные в dashboard) НЕ нормализуется здесь — это утечка
 * abstraction, settings-sync должен быть pure pipeline без зависимости от
 * normalizeSettings (которая живёт в settings.ts, циклической зависимости избегаем).
 *
 * Зачем безопасно: orchestrator вызывает `settings.set(decision.settings)`, а
 * `settings.set` внутри уже прогоняет через `normalizeSettings`. То есть pull
 * → settings.set → normalizeSettings отфильтрует невалидные значения «на входе»
 * в store. Push отправляет «нормализованный store snapshot» — cloud получает
 * только валидные значения от текущего клиента. Если cloud содержит мусор от
 * другого клиента (старая версия / dashboard edit) — текущий клиент пишет обратно
 * нормализованную версию (трактуется как нормальная forward-compat migration).
 */
export function cloudRowToSettings(cloud: CloudSettings): UserSettings {
  return {
    interfaceLanguage: cloud.interfaceLanguage,
    textLanguage: cloud.textLanguage,
    symbolLayoutId: cloud.symbolLayoutId,
    theme: cloud.theme,
  } as UserSettings;
}

/**
 * UserSettings → upsertMine args. Сейчас identity-маппинг (все 4 поля идут как есть),
 * но typed boundary — будущее расширение UserSettings (e.g. device-local поле)
 * не утечёт в cloud schema без явной правки этой функции.
 */
export function settingsToCloudArgs(settings: UserSettings): {
  interfaceLanguage: string;
  textLanguage: string;
  symbolLayoutId: string;
  theme: string;
} {
  return {
    interfaceLanguage: settings.interfaceLanguage,
    textLanguage: settings.textLanguage,
    symbolLayoutId: settings.symbolLayoutId,
    theme: settings.theme,
  };
}
```

> **Никакой циркулярной зависимости.** `settings-sync.ts` импортирует только `UserSettings` тип из `@/interfaces/user-settings` — runtime-нейтрально. Нормализация делается «на входе» в store через `settings.set` (см. `createSettingsStore` в `settings.ts`). Это даёт чистое разделение: settings-sync — pure shape-transformer, settings.ts — store with validation guard.

- [ ] **Step 3.4: Run tests — GREEN**

```bash
make test 2>&1 | tail -10
```

Ожидаемо: все 8 новых тестов зелёные (3 `decideSyncOnLogin` + 3 `cloudRowToSettings` + 2 `settingsToCloudArgs`).

Если красное:
- «Cannot find module './settings-sync'» — typo в имени файла; должен быть `src/lib/settings-sync.ts`.
- «Type 'CloudSettings' is not assignable…» — проверь, что тип export'нут (`export type CloudSettings = ...`).
- Тест-стрелка «invalid theme should stay raw» падает с «expected 'neon-pink', got 'auto'» — значит cloudRowToSettings всё ещё нормализует; убери импорт `normalizeSettings`, используй raw type-cast (см. Step 3.3).

- [ ] **Step 3.5: `make check`**

```bash
make check 2>&1 | tail -5
```

Zero errors.

- [ ] **Step 3.6: Commit**

```bash
git add src/lib/settings-sync.ts src/lib/settings-sync.test.ts
git commit -m "feat(settings): add pure sync-decision pipeline (decideSyncOnLogin, cloudRowToSettings)"
```

---

## Task 4: Orchestrator — `attachCloudSync` в `settings.ts` + wire в layout

**Files:**
- Modify: `src/lib/settings.ts`
- Modify: `src/routes/+layout.svelte`

**Цель:** соединить authStore + settings store + Convex client. Orchestrator: при transition → `'authenticated'` вызывает pull/push согласно `decideSyncOnLogin`; при каждом локальном update во время `'authenticated'` пушит в cloud fire-and-forget. Тесты — browser smoke в Task 5 (orchestrator integration-level, unit-заглушки добавляют complexity без proportional value).

> **Почему не unit-tests на attachCloudSync:** функция оркестрирует 3 живых subsystems (authStore reactive, settings store, convex client). Unit-test потребовал бы mock'ать всё — overhead, не отражающий реального flow. Browser smoke в Task 5 покрывает actual поведение end-to-end. Если в будущем появится bug в orchestrator — добавится regression test с заглушками тогда.

- [ ] **Step 4.1: Прочитать текущий `src/lib/settings.ts`**

```bash
cat src/lib/settings.ts
```

Запомни: `createSettingsStore()` возвращает `{ subscribe, update, set }`. Подписки на mirror localStorage уже навешаны inside `createSettingsStore`. Phase 5 НЕ трогает существующий код — только добавляет `attachCloudSync` экспорт в конец файла.

- [ ] **Step 4.2: Добавить `attachCloudSync` в `src/lib/settings.ts`**

Открой `src/lib/settings.ts`. **В начало файла** (после существующих импортов) добавь два новых импорта:

```ts
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
import { decideSyncOnLogin, settingsToCloudArgs, type CloudSettings } from './settings-sync';
```

Затем **в конец файла** (после `export function updateSettings(...)`) добавь:

```ts
/**
 * Connect settings store к Convex backend для cross-device sync.
 *
 * Вызывать ОДИН раз из root layout, после createAuthStore. Возвращаемый объект:
 * - `notifyAuthChanged()` — вызывать из layout-effect'а на каждое изменение
 *   `authStore.state.status`. Internal-guard'ы решают, делать ли pull/push.
 * - `dispose()` — вызывать в onDestroy layout'а.
 *
 * Гарантии:
 * - Ни pull, ни push не делается, пока authStore не в 'authenticated'. Гость живёт
 *   исключительно в localStorage (текущее Phase 4 поведение).
 * - **Single-session sync.** Pull/push при login-sync делается один раз за
 *   authentication session (флаг `hasSyncedThisSession`). Token-refresh flicker
 *   (`authenticated → loading → authenticated` без logout) НЕ запускает повторный
 *   pull, что защищает pending local edit от перетирания.
 * - **In-order push.** Все push'и идут через `pushChain` Promise — Convex видит
 *   их в порядке user-actions даже если network reorder'ит requests.
 * - **Retry on failure.** Pull/push throw в login-sync сбрасывает `hasSyncedThisSession`
 *   → следующий state-tick / next mount повторит попытку.
 */
export function attachCloudSync({
  authStore,
  pullCloud,
  pushCloud,
}: {
  authStore: AuthStore;
  pullCloud: () => Promise<CloudSettings | null>;
  pushCloud: (args: ReturnType<typeof settingsToCloudArgs>) => Promise<unknown>;
}): { notifyAuthChanged: () => void; dispose: () => void } {
  let hasSyncedThisSession = false;
  let skipNextSubscribeCallback = false;
  let isInitialSubscribe = true;
  // Serialized push chain — гарантия порядка отправки даже при network reorder.
  let pushChain: Promise<unknown> = Promise.resolve();

  function enqueuePush(args: ReturnType<typeof settingsToCloudArgs>) {
    pushChain = pushChain.catch(() => {}).then(() => pushCloud(args));
    pushChain.catch(() => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[settings-sync] push failed (will retry on next change)');
      }
    });
  }

  const unsubscribePush = settings.subscribe((value) => {
    if (isInitialSubscribe) {
      isInitialSubscribe = false;
      return;
    }
    if (skipNextSubscribeCallback) {
      skipNextSubscribeCallback = false;
      return;
    }
    if (authStore.state.status !== 'authenticated') return;
    enqueuePush(settingsToCloudArgs(value));
  });

  function currentSettingsSnapshot(): UserSettings {
    let snapshot!: UserSettings;
    settings.subscribe(v => { snapshot = v; })();
    return snapshot;
  }

  function notifyAuthChanged() {
    const status = authStore.state.status;
    // Logout / loading — сбрасываем session-flag, никаких syncs. Re-login потом
    // снова даст one-shot sync.
    if (status === 'guest') {
      hasSyncedThisSession = false;
      // Defense-in-depth: cancel pushChain. Если pending push не успел отправиться
      // до logout, он будет отправлен под expired token (Convex 401 → catch eats).
      // Безопасно, но шумно в console; cancel явно избегает.
      pushChain = Promise.resolve();
      return;
    }
    if (status === 'loading') return;
    // status === 'authenticated' — но если в этой session уже sync'нулись, skip.
    // Это защищает от token-refresh flicker'а (authenticated → loading → authenticated)
    // и от effect re-runs из-за изменений других reactive deps.
    if (hasSyncedThisSession) return;
    hasSyncedThisSession = true;
    void (async () => {
      try {
        const cloudRow = await pullCloud();
        const localSnapshot = currentSettingsSnapshot();
        const decision = decideSyncOnLogin({
          cloudRow,
          localSettings: localSnapshot,
        });
        if (decision.action === 'pull') {
          skipNextSubscribeCallback = true;
          settings.set(decision.settings);
        } else {
          // First-sync push: ставим в chain (а не await отдельно) для unified ordering.
          enqueuePush(settingsToCloudArgs(decision.settings));
        }
      } catch (e) {
        // Сброс флага → следующий state-tick (или mount после reload) повторит pull.
        // Без этого "persistent failure mode": cloud навсегда остался бы пуст.
        hasSyncedThisSession = false;
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[settings-sync] login-sync failed (will retry)', e);
        }
      }
    })();
  }

  function dispose() {
    unsubscribePush();
  }

  return { notifyAuthChanged, dispose };
}
```

**Что значат конкретные решения:**
- `hasSyncedThisSession` flag — defends против edge case'а C1 (token-refresh flicker), который Round 1 edge-cases agent поймал. Logout (`'guest'`) сбрасывает; следующий login снова даст one-shot sync. Failure сбрасывает → retry.
- `pushChain` через `.catch(() => {}).then(...)` — last-write-wins per device без race на network reorder. Cost: rapid sequential edits задерживаются на длительность previous push'а. Acceptable для типичного user pattern (settings меняются нечасто).
- `enqueuePush` helper — единая точка enqueue (login-sync push + subscribe-push используют один chain).
- `skipNextSubscribeCallback` — после pull мы делаем `settings.set(decision.settings)`, который запускает наш же `settings.subscribe` callback. Без skip-flag мы бы пушили pulled-значение обратно в cloud (idempotent, но лишний round-trip).
- `isInitialSubscribe` — первая `settings.subscribe` callback вызывается immediately с текущим значением; это init, не user-driven update.
- `currentSettingsSnapshot` через одноразовый subscribe + unsubscribe — стандартный Svelte pattern для one-shot read store'а без сохранения подписки.
- `import.meta.env.DEV` — Vite-specific глобальная переменная, false в production build. Console-warn'ы только в dev.

- [ ] **Step 4.3: Wire `attachCloudSync` в `src/routes/+layout.svelte`**

Открой `src/routes/+layout.svelte`. Найди блок:

```svelte
  const authStore = createAuthStore();
  setContext('auth', authStore);
```

(около строки 35).

**Сразу после `setContext('auth', authStore);`** добавь:

```svelte
  // Phase 5: cross-device settings sync для залогиненных юзеров.
  // Гость работает offline, никаких cloud-вызовов; auth-guard внутри attachCloudSync.
  const cloudSync = attachCloudSync({
    authStore,
    pullCloud: () => convex.query(api.userSettings.getMine, {}),
    pushCloud: (args) => convex.mutation(api.userSettings.upsertMine, args),
  });
  $effect(() => {
    // Явно tracking-ем status field, не full state-object: даёт точное rune-dependency
    // на конкретное reactive значение, которое влияет на решение notifyAuthChanged.
    // Effect повторно выполняется на каждое изменение status'а; внутренние guard'ы
    // (`hasSyncedThisSession`, `if status === 'loading' return`) игнорируют non-transitions.
    void authStore.state.status;
    cloudSync.notifyAuthChanged();
  });
  onDestroy(() => cloudSync.dispose());
```

Затем поправь импорты файла (около строк 1-15):

1. Существующий `import { settings } from '@/lib/settings';` замени на:

```svelte
  import { settings, attachCloudSync } from '@/lib/settings';
```

2. Существующий `import { convex } from '@/lib/convex';` замени на:

```svelte
  import { convex, api } from '@/lib/convex';
```

Это **один** импорт на модуль (без дублирования) — следует существующему паттерну файла.

- [ ] **Step 4.4: `make check`**

```bash
make check 2>&1 | tail -5
```

Zero errors. Проверь:
- Импорт `attachCloudSync` резолвится — функция экспорт из `src/lib/settings.ts`.
- Импорт `api` — exported из `src/lib/convex.ts` (если нет — проверь Step 4.5 ниже).
- Тип `(args: ReturnType<typeof settingsToCloudArgs>) => Promise<unknown>` совместим с `convex.mutation(api.userSettings.upsertMine, args)` (mutation возвращает `Promise<Id<'userSettings'>>`, которое assignable к `Promise<unknown>`).

- [ ] **Step 4.5: (Conditional) Проверить, что `api` экспорт из `src/lib/convex.ts`**

```bash
grep -n "export.*api" src/lib/convex.ts
```

Ожидаемо: `export { api }` или `export const api = ...` присутствует (Phase 1 baseline, verified в audit Round 1 — line 10 файла).

**Если grep вернул пусто** (drift с CLAUDE.md) — открой `src/lib/convex.ts` и добавь две правки:

1. Импорт api из codegen (если нет):
   ```ts
   import { api } from '../../convex/_generated/api';
   ```
2. Re-export рядом с существующим `export const convex`:
   ```ts
   export { api };
   ```

Не импортируй `api` в layout'е напрямую через `@/convex/_generated/api` — это нарушит абстракцию `convex.ts` singleton'а (где живут client + типизированный ref в одном месте, по решению Phase 1). Все потребители идут через `@/lib/convex`.

- [ ] **Step 4.6: `make test`**

```bash
make test 2>&1 | tail -10
```

Ожидаемо: все тесты зелёные. Существующие `settings.test.ts` тесты на `normalizeSettings` остаются — никаких breaking changes в `normalizeSettings` мы не делали.

> **Что НЕ тестируется здесь:** orchestrator (`attachCloudSync` живой код в layout'е) тестируется browser smoke в Task 5. Phase 5 self-review (Step 6.5) подтверждает осознанное решение.

- [ ] **Step 4.7: `make check-all`**

```bash
make check-all 2>&1 | tail -10
```

Zero errors всеми инструментами (lint + check + test + spell + build).

- [ ] **Step 4.8: Commit**

```bash
git add src/lib/settings.ts src/routes/+layout.svelte
git commit -m "feat(settings): wire cross-device sync — pull/push on login, push on update"
```

---

## Task 5: Browser smoke E2E — cross-device sync + guest offline

**Files:** ничего не меняется.

**Цель:** проверить end-to-end:
1. Логин в браузере A → меняешь тему/язык → push прошёл (видно в Convex dashboard).
2. Логин в браузере B (incognito или другой профиль) тем же провайдером → settings подтянулись.
3. Local update в B → push прошёл.
4. Refresh в A → новые settings (изменения B) подтянулись после pull.
5. Logout → продолжаешь с last-pulled settings (no reset).
6. Гость (incognito, без логина) → меняет тему, никаких ошибок в console про Convex, ничего не пушится.

**Этот шаг — без коммита**, это verification.

> **Если smoke не идёт за разумное время (30-45 мин diagnose)** — **остановись** (НЕ продолжай к Task 6) и escalate user'у. Done criteria требует green smoke; merge без него не делаем.

- [ ] **Step 5.1: Запустить dev**

В терминале (терминал 1 — watcher `make convex` уже запущен; терминал 2 — `make dev`):

```bash
make dev
```

Vite на `http://localhost:5173`.

- [ ] **Step 5.2: Browser A — login + check first sync**

1. Открой `http://localhost:5173/signin` в основном браузере (Chrome/Firefox/Safari).
2. Sign in (GitHub или Google — любой, который работал в Phase 4 smoke). Header показывает `<UserMenu>` с твоим именем.
3. Открой DevTools → Application → Local Storage → `http://localhost:5173`. Должен быть `flow-typing-user-preferences` ключ. Запомни его значение (e.g. `{"interfaceLanguage":"en", ..., "theme":"auto"}`).
4. Открой второй вкладкой `npx convex dashboard` → таблица `userSettings`. Должна быть **одна свежая строка** с твоим `userId` и текущими настройками. `updatedAt` — недавний timestamp.

**Что произошло:** при transition `loading → authenticated` сработал `notifyAuthChanged` → `pullCloud` вернул `null` (первый логин этого юзера) → `decideSyncOnLogin` решил «push» → `pushCloud` вставил row.

**PASS criterion 1:** в `userSettings` есть твоя row.

**Если cloud row не появилась:** DevTools Console → ищи `[settings-sync] login-sync failed` warning или `[settings-sync] push failed`. Если есть — проверь `npx convex env list` (auth env должны быть set с Phase 2-4). См. также Step 5.7 diagnose-табличку.

- [ ] **Step 5.3: Browser A — change settings → push**

1. Перейди на `/settings` (через Header link).
2. Смени **тему** на `dark` (или `nord`).
3. Смени **язык интерфейса** на `ru` (если был `en`).
4. Назад на `/`. DevTools Console — никаких ошибок.
5. Convex dashboard → `userSettings` → твоя row → refresh. Поля должны соответствовать новым значениям; `updatedAt` обновился.

**PASS criterion 2:** cloud row обновлена под локальные изменения. Каждая правка settings пушится.

- [ ] **Step 5.4: Browser B — login → pull**

1. Открой Incognito mode (или другой браузер / профиль). Никаких пред-existing settings в localStorage этого окна.
2. `http://localhost:5173/signin` → войди тем же провайдером и тем же account, что в Browser A. Header показывает UserMenu.
3. DevTools → Application → Local Storage → `flow-typing-user-preferences` → проверь значение.

**PASS criterion 3:** localStorage в B содержит settings, идентичные тем что были в A после Step 5.3 (e.g. `theme: 'dark'`, `interfaceLanguage: 'ru'`). Это значит pull сработал.

UI в B должен визуально применить новую тему (dark) и язык (ru) сразу после login (после короткого `loading` state).

- [ ] **Step 5.5: Browser B → change → A reload → pull**

1. В Browser B на `/settings` смени тему на `sepia`.
2. Convex dashboard → `userSettings` → твоя row → `theme: 'sepia'`, `updatedAt` обновлён.
3. Вернись в Browser A. Сделай browser refresh (`Cmd+R` / `F5`).
4. После reload Browser A должен загрузиться с темой `sepia` (pulled from cloud при post-reload login).

**PASS criterion 4:** изменения в B видны в A после reload.

> **Что НЕ ожидать:** real-time push в открытое окно A пока в B меняешь — Phase 5 не реализует live subscription (Convex `convex.onUpdate` нам бы дал, но это complexity без proportional value для settings). Phase 5 = on-login sync + on-update push. Live cross-tab/cross-device — out of scope.

- [ ] **Step 5.6: Гость → offline check**

1. Открой свежий incognito (или logout в Browser A через UserMenu).
2. Состояние — `'guest'` (Header показывает «Войти»).
3. На `/settings` смени тему на `light`. Меняется визуально. DevTools Console — **никаких** запросов в `*.convex.cloud` (Network tab → filter `convex` — должно быть пусто или только startup ping).
4. Reload страницы. Тема `light` сохранилась (через `localStorage`).

**PASS criterion 5:** гость работает offline-only. Никаких cloud-вызовов, никаких ошибок в console.

> **Если у guest вылетают console-warnings от settings-sync:** значит auth-guard в `attachCloudSync` не работает корректно. Проверь, что `authStore.state.status !== 'authenticated'` ветка в `notifyAuthChanged` early-return'ит до cloud-вызовов. См. Step 5.7.

- [ ] **Step 5.7: Если smoke fails — diagnose**

| Симптом | Причина | Куда смотреть |
| --- | --- | --- |
| После login в A cloud row не появилась | `pushCloud` не вызвался или mutation failed | DevTools Console — warning от `[settings-sync] login-sync failed`. `npx convex logs` — серверная ошибка. `npx convex env list \| grep AUTH_` — auth env set? |
| Login в A работает, cloud row есть, но в B после login settings не подтянулись | `pullCloud` вернул `null` (но row есть) — auth-mismatch (другой юзер) ИЛИ В B `decideSyncOnLogin` пошёл по `push` ветке | Convex dashboard → `userSettings` row → `userId` field. Открой `convex/users.ts viewer` query в DevTools (через `convex` MCP или вручную); сверь `_id` юзера в B и `userId` в row |
| Гость видит console warnings про cloud-sync | `attachCloudSync.notifyAuthChanged` не early-return'ит на не-authenticated | `src/lib/settings.ts` — проверь `if (status !== 'authenticated') return;` в `notifyAuthChanged` |
| Гость делает HTTP requests в `*.convex.cloud` (Network tab) | Не auth-guard баг, а пуш subscribe не проверяет auth | `src/lib/settings.ts` — проверь `if (authStore.state.status !== 'authenticated') return;` в settings.subscribe callback |
| После pull в B settings.set вызвал push обратно в cloud (loop) | `skipNextSubscribeCallback` flag не сработал | Console — если видишь два push'а подряд после login в B (один на pulled values), то skip-flag пропустил. Проверь, что `skipNextSubscribeCallback = true` ставится в той же тик что `settings.set` |
| Theme `'auto'` сохраняется в cloud, но в B применяется неправильно | Bug в `cloudRowToSettings` или `normalizeSettings` отвергает `'auto'` | `src/lib/settings.ts:isThemeSetting` — должен принимать `'auto'`. Тесты в `settings-sync.test.ts` уже это проверяют |

**Если ни одна строчка не помогает** — escalate user'у с конкретным симптомом + console-output + cloud dashboard screenshot.

- [ ] **Step 5.8: No commit — это verification**

```bash
git status --porcelain    # должно быть пусто
```

Test rows в `userSettings` (твой live user) можешь оставить или почистить через dashboard. Они нужны для следующих фаз (Phase 6 sessions).

---

## Task 6: CLAUDE.md update + merge в master

**Files:**
- Modify: `CLAUDE.md`

**Цель:** обновить документацию о sync поведении + merge feature-branch'а.

- [ ] **Step 6.1: Найти секцию «Settings и i18n» в CLAUDE.md**

```bash
grep -n "### Settings и i18n" CLAUDE.md
```

Ожидаемо: одна строка (около строки 175).

- [ ] **Step 6.2: Обновить секцию**

Открой `CLAUDE.md`. Найди блок (около `### Settings и i18n`):

```
### Settings и i18n

- `src/lib/settings.ts` — writable store; грузится из `localStorage['flow-typing-user-preferences']` через `normalizeSettings` поверх `DEFAULT_USER_SETTINGS` (чтобы новые поля корректно догружались у старых пользователей, неизвестные — игнорировались). Любой `update`/`set` сохраняется обратно.
- Метаданные настроек (тип, дефолты, опции) — `src/user-settings/user-settings.ts`.
- i18n: `src/lib/i18n.ts` — derived store, словари `dictionaries/{en,ru}.json`.
```

Замени на:

```
### Settings и i18n

- `src/lib/settings.ts` — writable store; грузится из `localStorage['flow-typing-user-preferences']` через `normalizeSettings` поверх `DEFAULT_USER_SETTINGS` (чтобы новые поля корректно догружались у старых пользователей, неизвестные — игнорировались). Любой `update`/`set` сохраняется обратно.
- Метаданные настроек (тип, дефолты, опции) — `src/user-settings/user-settings.ts`.
- i18n: `src/lib/i18n.ts` — derived store, словари `dictionaries/{en,ru}.json`.

**Cross-device sync (Phase 5).** Для залогиненных юзеров настройки синхронизируются через Convex. Гость — только localStorage, никаких cloud-вызовов.

- **Стратегия:** «cloud wins при login». При transition authStore → `'authenticated'`: cloud пуст → push локальную копию в cloud (`upsertMine`); cloud есть → pull cloud → overwrite local (`settings.set`). При каждом локальном `update`/`set` во время authenticated → fire-and-forget `upsertMine` (silent eventually-consistent при offline).
- **Pure pipeline:** `src/lib/settings-sync.ts` — `decideSyncOnLogin`, `cloudRowToSettings`, `settingsToCloudArgs`. Тестируется без заглушек (`src/lib/settings-sync.test.ts`).
- **Orchestrator:** `attachCloudSync(...)` в `src/lib/settings.ts`. Вызывается из `src/routes/+layout.svelte` после `createAuthStore`. Internal guards: `hasSyncedThisSession` (one-shot pull/push per authentication session, защита от token-refresh flicker'а), `pushChain` (serialized push queue для in-order delivery при network reorder), `skipNextSubscribeCallback` (no echo push после pull), `isInitialSubscribe` (no push на init).
- **Backend:** `convex/userSettings.ts` — `getMine` query (auth-required, `null` при unauth), `upsertMine` mutation (auth-required, `throw 'Not authenticated'` при unauth). Логика в `getMineHandler` / `upsertMineHandler` — testable отдельно от auth-обёртки (паттерн `createOrUpdateUserHandler`). `updatedAt` ставит сервер.
- **«Провайдер = аккаунт» enforced на этом уровне:** `userSettings` row ссылается на `userId: v.id('users')`. Один email через GitHub vs Google = два юзера = два независимых settings row. By design.
- **Что НЕ реализовано:** live cross-tab/cross-device push (нужен Convex subscription, не делаем — нужно ради value), timestamp-based LWW (нужен `local.updatedAt` хранение, не делаем — «cloud wins» простой и предсказуемый), UI sync-indicator (silent eventually-consistent через console.warn в dev).
```

- [ ] **Step 6.3: Verify contract count не сдвинулся**

```bash
grep -rh "^  '--" src/components src/Root.contract.ts 2>/dev/null | sort -u | wc -l
```

Ожидаемо: `111` (или то же, что было до Phase 5). Phase 5 НЕ добавляет UI-компонентов → счётчик не меняется. Если разошёлся — найди, какой контракт changed (`git diff master -- 'src/**/*.contract.ts'`), и обнови строку в CLAUDE.md (поиск «17 контрактов агрегируются» → подставь новое число).

- [ ] **Step 6.4: `make check-all`**

```bash
make check-all 2>&1 | tail -10
```

Zero errors. Markdown lint — должен пройти.

- [ ] **Step 6.5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(settings): document Phase 5 cross-device sync in Settings и i18n section"
```

- [ ] **Step 6.6: Финальная сверка коммитов ветки + secret-leak grep**

```bash
git log master..feat/settings-sync --oneline
git diff master..feat/settings-sync --stat
```

Ожидаемо: **5 коммитов** (Task 1, 2, 3, 4, 6). Task 5 — без коммита (verification).

**Secret-leak guard.** Phase 5 не работает с новыми OAuth secrets, но повторяем grep — defense-in-depth:

<!-- cSpell:ignore GOCSPX -->
```bash
git log -p master..feat/settings-sync | \
  grep -iE 'GOCSPX[-_]|AUTH_(GITHUB|GOOGLE)_SECRET\s*[=: ]|JWT_PRIVATE_KEY' || echo "clean (content scan)"

git diff master..feat/settings-sync --name-only | grep -E '\.env(\.|$)' && echo "WARN: env file in diff!" || echo "clean (file scan)"
```

Если grep что-то нашёл — НЕ merge'ить, разбираться где утечка.

- [ ] **Step 6.7: Divergence check + merge**

```bash
git remote get-url origin >/dev/null 2>&1 && \
  (git fetch origin 2>/dev/null || echo 'WARN: fetch failed')
git rev-parse origin/master 2>/dev/null && {
  git log master..origin/master --oneline
} || echo "No origin/master ahead — skipping"

git switch master
git merge --no-ff feat/settings-sync -m "$(cat <<'EOF'
feat(settings): sync user settings to Convex for signed-in users

Phase 5 of docs/plans/auth.md. Cross-device sync для UserSettings
(interfaceLanguage, textLanguage, symbolLayoutId, theme) через Convex.

- convex/schema.ts: + userSettings table (userId, 4 settings fields,
  updatedAt; index by_user).
- convex/userSettings.ts: getMineHandler / upsertMineHandler — testable
  pure-ish helpers; getMine query + upsertMine mutation — auth-guarded
  обёртки. updatedAt server-gen.
- convex/userSettings.test.ts: 7 handler tests + 3 auth-fail tests.
- src/lib/settings-sync.ts: pure decideSyncOnLogin ("cloud wins при
  login"), cloudRowToSettings (через normalizeSettings), settingsToCloudArgs.
- src/lib/settings-sync.test.ts: 8 unit-tests на pure pipeline.
- src/lib/settings.ts: + attachCloudSync orchestrator (subscribe-push +
  notifyAuthChanged for pull-decision; internal guards против echo-push
  после pull и init-push до auth).
- src/routes/+layout.svelte: wire attachCloudSync после createAuthStore;
  $effect запускает notifyAuthChanged на auth-state changes.
- CLAUDE.md: Settings и i18n секция расширена под Phase 5 sync
  поведение и компоненты.

Guest behavior unchanged — localStorage only, никаких cloud вызовов
(auth-guard в attachCloudSync). Sign-out не сбрасывает localStorage:
last-pulled settings остаются. Provider = account invariant сохранён —
userSettings.userId ref на users._id, не на email.
EOF
)"
```

- [ ] **Step 6.8: Post-merge `make check-all`**

```bash
make check-all 2>&1 | tail -10
```

Zero errors. Если падает (хотя pre-merge был зелёный) — `git reset --hard ORIG_HEAD` сразу и разбираться.

- [ ] **Step 6.9: Удалить feature-ветку**

```bash
git branch -d feat/settings-sync
```

---

## Done criteria (перед merge в master)

- [ ] `make check-all` зелёный (lint + check + test + spell + build) — Task 4 и Task 6
- [ ] Все новые тесты зелёные: 7 handler + 3 auth-fail + 8 pure pipeline = 18 новых tests
- [ ] **Browser smoke** (Task 5):
  - Login → cloud row создаётся (push first sync)
  - Local update → cloud row обновляется
  - Cross-device pull работает (login в B видит изменения из A)
  - Reload в A после изменений в B → подтягивает свежие settings
  - Гость работает без cloud-вызовов, никаких console warnings
- [ ] `CLAUDE.md` обновлён: секция «Settings и i18n» содержит Phase 5 sync (Task 6)
- [ ] Secret-leak grep чистый (Step 6.6)

## Rollback plan

**До merge** — `git switch master && git branch -D feat/settings-sync`. Удалит ветку. Cloud `userSettings` таблица **остаётся в schema** (Convex deployment). Side effect: пустая таблица, никакие функции её не пишут — безвредно. Если хочешь полную чистку: schema без `userSettings` push'нуть отдельным коммитом + `npx convex dev --once`. Drop table в Convex dashboard для уборки старых rows.

**После merge, если post-merge `make check-all` сломался** — `git reset --hard ORIG_HEAD` сразу. Состояние master возвращается в `0f3b3ee`. Side effects:
- Cloud Convex deployment — `userSettings` table **остаётся в schema** (rollback фронта не откатывает schema без явного push). `getMine`/`upsertMine` функции в watcher'е тоже останутся до schema-push.
- **Рекомендуемая чистка после rollback'а:** дополнительным коммитом на master вернуть `convex/schema.ts` к Phase 4 baseline (без `userSettings`), удалить `convex/userSettings.ts` + `convex/userSettings.test.ts`. Watcher push'нёт schema без таблицы — таблица станет недоступна через API, но физически останется в storage. Окончательная чистка через dashboard, если нужна.
- Никакой data corruption невозможен — Phase 5 add-only.

## Side effects на Convex deployment

Phase 5 трогает cloud dev deployment один раз — это **add-only**:
- `userSettings` table появляется в schema (Task 1) → watcher push.
- `getMine` / `upsertMine` функции появляются в deployment (Task 2) → watcher push.
- Никаких env var changes.
- Никаких schema migrations existing tables.
- Никаких удалений.

## What's captured for Phase 6 (Sessions tracking)

После Phase 5 у тебя:
- **Готовый паттерн «testable handler + auth-guarded обёртка»** для Phase 6 `sessions` table.
- **«Cloud wins» mental model** для cross-device: для sessions она проще (sessions append-only, не upsert) — но дизайн уже понятен.
- **Phase 6 schema готов делать `sessions: defineTable({ userId: v.id('users'), ... })`** с тем же index-by-user паттерном как `userSettings.by_user`.
- **`attachCloudSync` НЕ переиспользуется для sessions.** Sessions имеют другой жизненный цикл (event-driven append from training machine, не store-subscription). Phase 6 пишет свой orchestrator (рекомендуется отдельный `src/lib/sessions-cloud-sync.ts`).
- **Тестовый baseline:** `convex-test` паттерн (handler-tests + auth-fail tests) проверен на двух модулях (`auth`, `userSettings`); Phase 6 повторит.

## Self-review notes

1. **Spec coverage vs umbrella Phase 5:**
   - Таблица `userSettings` ✓ Task 1
   - `getMine` query, `upsertMine` mutation ✓ Task 2
   - `src/lib/settings.ts` интеграция с authStore: pull при login, push при изменении ✓ Task 4
   - LWW по `updatedAt` — **изменено** на «cloud wins при login», подтверждено user'ом (Зафиксированные решения). Server-gen `updatedAt` остаётся для отладки/future LWW upgrade. Расхождение задокументировано в «Зафиксированные решения».
   - UI-индикатор синхронизации — **out of scope**, подтверждено user'ом
   - Гость работает offline ✓ Task 5 verification

2. **Placeholder scan:**
   - Все шаги содержат полный код / точные команды / ожидаемый output.
   - Test code — конкретный (4 describe-блока в `userSettings.test.ts`, 3 в `settings-sync.test.ts`), не «add appropriate tests».
   - CLAUDE.md update — конкретный текст замены, не «add Phase 5 docs».

3. **Type consistency:**
   - `CloudSettings` тип в `settings-sync.ts` mirror'ит схему cloud row, но без `_id`/`_creationTime` Convex-metadata (они есть в реальном `Doc<'userSettings'>`, но нам нужны только 5 полей: 4 settings + updatedAt).
   - `attachCloudSync.pushCloud` принимает `ReturnType<typeof settingsToCloudArgs>` — это даёт TS-link между `settingsToCloudArgs` и `pushCloud` (rename одного поля заставит compiler-error в обоих).
   - `Id<'userSettings'>` возвращается из `upsertMineHandler`, не используется на клиенте — но тест в Task 2 проверяет shape.
   - `AuthStore` импорт — `import type { AuthStore } from '@/lib/auth/auth-store.svelte'` (matches Phase 3 export).

4. **Известные риски:**
   - **`isInitialSubscribe` race:** если `attachCloudSync` вызывается после mount, `settings.subscribe` already-fired init callback мог пройти ещё для пред-existing subscribers (внутренних к settings.ts). Наш subscribe в attachCloudSync — отдельный listener, его first-call мы поймаем guard'ом. Safe.
   - **`skipNextSubscribeCallback` race:** между `skipNextSubscribeCallback = true` и `settings.set(...)` ничего другого не должно вмешаться (single-threaded JS event loop защищает). Если в будущем `settings.set` станет async — flag нужно будет аудитировать.
   - **`currentSettingsSnapshot` через subscribe/unsubscribe:** Svelte writable.subscribe гарантирует sync call. Если когда-нибудь settings перейдёт на runes state — этот helper переписать на `$state.snapshot(...)` или просто хранить current value в attachCloudSync closure.
   - **Two-tab race в одном браузере:** обе вкладки делают свой pull/push независимо. Может быть transient inconsistency (A пушит X, B пушит Y, последний push wins на cloud, потом обе вкладки на следующем pull'е увидят Y). Out of scope Phase 5.
   - **Offline на login (retry semantics):** `pullCloud`/`pushCloud` throws в login-sync → catch ставит `hasSyncedThisSession = false` + console.warn в dev. **Retry НЕ автоматический в той же session** — `$effect` (`void authStore.state.status`) пересчитывается только когда `status` действительно меняется, а после failure status остаётся `'authenticated'`. Retry-trigger ы:
     - **Mount/refresh:** свежий `hasSyncedThisSession=false` → новый login-sync attempt. Покрывает оба сценария (push-fail / pull-fail).
     - **Auth-transition (logout → login):** аналогично — fresh session, fresh attempt.
     - **Локальный edit settings — ТОЛЬКО push-retry, НЕ pull-recovery.** Subscribe-callback срабатывает на user-change → `enqueuePush` с локальным snapshot'ом. Это спасает сценарий «cloud был пуст и push fail» (push повторяется), но **НЕ спасает сценарий «cloud row есть, pull fail»**: локальный edit отправляется как push, и если он успевает дойти до cloud row до next refresh — он продвигает local-over-cloud (de-facto обход «cloud wins» правила). Acceptable trade-off: user-modified локальное значение становится новым cloud canonical; alternative (block pushes до successful pull) усложняет logic без proportional value.
   - Не "persistent failure mode" в практическом смысле (любой refresh повторяет sync); но in-session auto-retry без user-action отсутствует. setTimeout-based retry откладывается до запроса.
   - **Гонка: user меняет setting в тот момент, когда login-sync pull'ит cloud:** очень маловероятно (login-sync завершается за ~100ms). Если случится: settings.set из pull перетрёт user change. User-side issue, out of scope mitigation.
   - **Schema field drift между cloud row и UserSettings:** см. «Зафиксированные решения». Если cloud содержит лишнее или невалидное поле, текущий клиент игнорирует/нормализует, push'ит обратно clean snapshot. Cloud row обновляется через `ctx.db.patch` (shallow merge) — поля, не упомянутые в args, сохраняются как есть (backward-compat для future-added полей).
   - **Token-refresh flicker (`authenticated → loading → authenticated`):** `hasSyncedThisSession` flag не даёт повторному pull'у перетереть pending local edits. Сценарий, найденный Round 1 audit'ом.
   - **Push reorder на network:** mitigated через `pushChain` Promise — отправка in-order даже если transport reorder'ит. Round 1 audit found.

5. **Что НЕ в плане (явно):**
   - Live cross-device push (`convex.onUpdate` подписка на userSettings) — out of scope. Если когда-нибудь — отдельная mini-фаза.
   - Timestamp-based LWW с `local.updatedAt` — не делаем; «cloud wins» проще, user согласовал.
   - UI sync-indicator — не делаем; user согласовал.
   - Debounce push на спам-update'ы — не делаем; settings меняются нечасто.
   - Settings reset при logout — не делаем; last-pulled settings остаются (предсказуемое поведение).
   - Cross-tab sync через `'storage'` event — не делаем; вне scope.
   - Migration старых guest-настроек в cloud на первом login — это и есть «push first sync» в `decideSyncOnLogin` (cloud null → push local). Не отдельная функция.
   - Push на origin — задача пользователя (memory `feedback_no_ahead_count.md`), план её не делает.
