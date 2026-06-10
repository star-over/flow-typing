# Phase 2: Convex Auth Backend (GitHub Provider) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convex Auth backend настроен на cloud dev deployment с GitHub OAuth-провайдером и кастомным `createOrUpdateUser` callback'ом (правило «провайдер = аккаунт»). Sign-in работает end-to-end. Юзеры записываются в `users` таблицу. Тесты на `createOrUpdateUser`. **Без UI** — UI в Phase 3.

**Architecture:** Cloud dev Convex (`dev:wandering-ocelot-9`, EU-West-1) + `@convex-dev/auth` для backend-side OAuth flow. `@auth/core/providers/github` — GitHub-провайдер. Кастомный `createOrUpdateUserHandler` экспортируется отдельно, чтобы быть тестируемым через `convex-test`. Никакой link-by-email (явно): каждый OAuth account = отдельная запись в `users`.

**Tech Stack:** Convex 1.40 · `@convex-dev/auth` · `@auth/core` · `convex-test` (тесты функций) · Vitest (существующий) · SvelteKit-фронт (без изменений в Phase 2).

---

## Starting state (после Phase 1)

- **Master HEAD:** `c86803c` (Phase 1 merge + startup-guard follow-up)
- **Cloud deployment:** `dev:wandering-ocelot-9` (EU-West-1)
- **convex/:** `schema.ts` (только `health` таблица), `health.ts` (ping/tick), `_generated/`, `README.md`, `tsconfig.json` (правильно настроен под Bundler+skipLibCheck)
- **src/lib/convex.ts:** singleton ConvexClient + re-export `api` + startup-guard
- **`/dev` страница:** работает, удалится в Phase 3
- **vitest.config.ts:** `include: ['src/**/*.test.ts']` — **НЕ покрывает `convex/**`** (Phase 2 fix)
- **CLAUDE.md:** содержит `### Convex backend` секцию
- **cspell.json:** уже содержит Phase 2 words (`authTables`, `JWKS`, `convexAuth`, `createOrUpdateUser`, etc. — Task 7 Phase 1 их preload'нул)

## Phase 2 deliverables (что появится после merge)

- `convex/auth.config.ts` — issuer whitelist
- `convex/auth.ts` — `convexAuth({ providers: [GitHub], callbacks: { createOrUpdateUser } })` + экспортированный `createOrUpdateUserHandler`
- `convex/http.ts` — `auth.addHttpRoutes(http)` для OAuth callback routes
- `convex/users.ts` — `viewer` query (current user или null)
- `convex/auth.test.ts` — convex-test'ы для `createOrUpdateUserHandler`
- `convex/schema.ts` — расширен `...authTables`
- `vitest.config.ts` — `include` покрывает `convex/**/*.test.ts`
- `package.json` — добавлены `@convex-dev/auth`, `@auth/core` (prod), `convex-test` (dev)
- Convex env: `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
- GitHub OAuth App: зарегистрирован, callback URL точно `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/github`
- **CLAUDE.md:** расширена секция Convex backend (auth-providers, GitHub, env vars)

## Зафиксированные решения (из umbrella)

- **«Провайдер = аккаунт»** — отсутствие link-by-email. `createOrUpdateUser` явно перебивает дефолт.
- **MVP-провайдер:** только GitHub. Google — Phase 4. Никаких others.
- **Без UI** — sign-in вызывается из `/dev` страницы временно для smoke; продакшен UI в Phase 3.
- **Cloud dev deployment** — HTTPS из коробки, нет local-mode caveats.

## File Structure

```
convex/                                # backend — главная работа Phase 2
├── _generated/                        # auto-regen on `convex dev`
├── README.md                          # untouched
├── tsconfig.json                      # untouched (уже Bundler+skipLibCheck)
├── schema.ts                          # MODIFY: spread ...authTables
├── health.ts                          # untouched (удалится в Phase 3)
├── auth.config.ts                     # NEW (scaffolded by `npx @convex-dev/auth`)
├── auth.ts                            # NEW (scaffolded then CUSTOMIZED: GitHub + createOrUpdateUserHandler)
├── http.ts                            # NEW (scaffolded as-is)
├── users.ts                           # NEW: viewer query
└── auth.test.ts                       # NEW: tests for createOrUpdateUserHandler

vitest.config.ts                       # MODIFY: extend `include` to convex/**/*.test.ts

package.json                           # MODIFY: add @convex-dev/auth, @auth/core (prod), convex-test (dev)

CLAUDE.md                              # MODIFY: extend ### Convex backend section
```

**Не трогаем:** `convex/_generated/*` (auto), `convex/README.md`, `convex/tsconfig.json` (после Phase 1 ничего не требуется), `convex/health.ts` (удалится в Phase 3 — не сейчас), `src/lib/convex.ts`, `src/routes/dev/+page.svelte` (smoke в Task 6 модифицирует временно, потом revert).

---

## Pre-flight Checks

- [ ] **2 свободных терминала.** Watcher + рабочий.
- [ ] **Стартовать с чистого `master`.**
  ```bash
  git status --porcelain          # пусто
  git switch master
  git switch -C feat/convex-auth-github
  ```
- [ ] **Sanity check `.env.local`:**
  ```bash
  grep CONVEX_DEPLOYMENT .env.local
  ```
  Должно показать `CONVEX_DEPLOYMENT=dev:wandering-ocelot-9`. Если файла нет или строки нет — Phase 1 откатили; повторить Phase 1 Pre-flight setup перед стартом Phase 2.
- [ ] **Запустить watcher в dedicated терминале:**
  ```bash
  npx convex dev
  ```
  Должен подключиться к `wandering-ocelot-9.eu-west-1.convex.cloud`. Если CLI prompt'ит project selection — выбрать существующий `wandering-ocelot-9`. Оставить running до конца плана.

  > **Можно пропускать `--once` шаги** в Task 2-5 — watcher автоматически подхватывает изменения за ~1-2 сек после save. `--once` приведён в плане для явности (engineer всегда может проверить deploy состоялся); если watcher живой и `convex/_generated/` обновился — `--once` не нужен.
  >
  > **Проверка, что watcher жив:** взглянуть на его терминал — последний свежий timestamp `✔ HH:MM:SS Convex functions ready!` (после каждого save в `convex/*.ts`). Если давно тишина или соединение упало — watcher умер; перезапустить.
- [ ] **Зарегистрировать GitHub OAuth App** (организационное, до Task 6):
  - GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
  - **Application name:** `FlowTyping (dev)`
  - **Homepage URL:** `http://localhost:5173`
  - **Authorization callback URL:** `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/github` ← точное совпадение, HTTPS
  - Сохранить **Client ID** и **Client Secret** в заметник (понадобятся в Task 6)
  - **Можно сделать сейчас или непосредственно перед Task 6.**

---

## Task 1: Установить dependencies + расширить vitest scope

**Files:**
- Modify: `package.json` (+ `package-lock.json`)
- Modify: `vitest.config.ts`

**Цель:** установить `@convex-dev/auth`, `@auth/core` (для Convex Auth runtime) и `convex-test` (для тестов). Расширить vitest, чтобы он подбирал `convex/**/*.test.ts`.

- [ ] **Step 1.1: Install runtime + test packages**

```bash
# ВНИМАНИЕ: пины обязательны. На npm `@auth/core@latest` указывает на 0.34.3 (старая ветка),
# а @convex-dev/auth требует @auth/core@^0.41.1 (peer dep). Без пина получим runtime breakage.
npm install @convex-dev/auth@~0.0.94 @auth/core@~0.41.2
npm install -D convex-test@~0.0.53 @edge-runtime/vm@~5.0.0
```

Ожидаемо: новые версии в `package.json`. Возможен warning от npm о peer-dep — это нормально, наш пин `@auth/core@~0.41.2` его удовлетворяет.

`@edge-runtime/vm` обязателен — это runtime'овый VM для `environment: 'edge-runtime'`, которое требует `convex-test`.

> **`convex-test` vs vitest 4.** convex-test build'ился против vitest 1.x; issue [#98](https://github.com/get-convex/convex-test/issues/98) для vitest 4 ещё open на момент написания плана. На практике с vitest 4.1 + edge-runtime + projects работает (round-3 эмпирически проверил `make test` baseline), но если в Task 4 тесты падают на `ReferenceError` или edge globals — fallback: добавить `vitest@~3` локально в `convex` project (или временно понизить root vitest до v3).

- [ ] **Step 1.2: Перевести vitest на projects pattern**

`convex-test` требует `environment: 'edge-runtime'` + `server.deps.inline: ['convex-test']`. Существующие src-тесты (250 шт.) живут в node-окружении — глобальная смена environment их сломает. Решение: **vitest projects** — два изолированных скоупа.

Открыть `vitest.config.ts`. Заменить **полностью содержимое `test:` блока**:

Было:
```ts
test: {
  include: ['src/**/*.test.ts'],
  globals: true,
  coverage: {
    provider: 'v8',
    reporter: ['text'],
    include: ['src/**/*.{ts,svelte}'],
    exclude: ['src/**/*.test.ts', 'src/**/*.stories.svelte', 'src/fixtures/**', 'src/scripts/**'],
  },
},
```

Стало:
```ts
test: {
  globals: true,
  projects: [
    {
      extends: true,
      test: {
        name: 'src',
        include: ['src/**/*.test.ts'],
      },
    },
    {
      extends: true,
      test: {
        name: 'convex',
        include: ['convex/**/*.test.ts'],
        environment: 'edge-runtime',
        server: { deps: { inline: ['convex-test'] } },
      },
    },
  ],
  coverage: {
    provider: 'v8',
    reporter: ['text'],
    include: ['src/**/*.{ts,svelte}', 'convex/**/*.ts'],
    exclude: ['src/**/*.test.ts', 'src/**/*.stories.svelte', 'src/fixtures/**', 'src/scripts/**', 'convex/_generated/**', 'convex/**/*.test.ts'],
  },
},
```

- [ ] **Step 1.3: Verify**

```bash
make test 2>&1 | tail -5         # должен пройти существующие 250 тестов; новых нет ещё, OK
```

Ожидаемо: `Test Files  24 passed (24)`, `Tests  250 passed (250)`. Просто проверяем, что расширение include не сломало.

- [ ] **Step 1.4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(auth): install @convex-dev/auth, @auth/core, convex-test, @edge-runtime/vm; split vitest into src/convex projects"
```

---

## Task 2: Запустить `npx @convex-dev/auth` setup

**Files:**
- Create (scaffolded by CLI): `convex/auth.config.ts`, `convex/auth.ts`, `convex/http.ts`
- Convex env (cloud-side): `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`

**Цель:** interactive setup-команда `@convex-dev/auth`:
1. Просит ввести `SITE_URL` → отвечаем `http://localhost:5173`
2. Генерирует RS256-ключи через `jose` → пушит `JWT_PRIVATE_KEY` + `JWKS` в Convex env
3. Проверяет `convex/tsconfig.json` (наш случай — no-op, уже `Bundler` + `skipLibCheck`)
4. Скаффолдит `convex/auth.config.ts`, `convex/auth.ts`, `convex/http.ts`

- [ ] **Step 2.1: Запустить setup**

> **⚠️ Запускать только один раз — в Task 2.** После Task 4 (когда `convex/auth.ts` уже customized с GitHub провайдером и `createOrUpdateUserHandler`) — `npx @convex-dev/auth` **перепишет файл scaffold'ом** и потеряет наши изменения. Если запустил по ошибке — `git restore convex/auth.ts` восстанавливает Task 4 state.

В рабочем терминале (watcher из Pre-flight продолжает работать в другом):

```bash
npx @convex-dev/auth
```

Команда интерактивная. Ожидаемые prompt'ы (порядок может варьироваться по версии):
1. `Site URL?` → ввести `http://localhost:5173`
2. Подтверждение записи в `.env.local` или Convex env → **Yes**
3. Подтверждение модификации `convex/tsconfig.json` → **Yes** (в нашем случае будет no-op, файл уже корректен)
4. Подтверждение скаффолда `convex/auth.{config.ts,ts}` и `convex/http.ts` → **Yes**

Если запросит `CONVEX_DEPLOYMENT` selection — выбрать существующий `wandering-ocelot-9`.

Ожидаемо: после завершения создались 3 файла в `convex/` и обновлён `.gitignore` (если CLI считает нужным).

- [ ] **Step 2.2: Verify создались файлы**

```bash
ls -la convex/auth.config.ts convex/auth.ts convex/http.ts
```

Все три должны существовать.

- [ ] **Step 2.3: Verify env vars в Convex**

```bash
npx convex env list
```

Ожидаемо: в списке `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`. Если `SITE_URL` отсутствует — установить руками:

```bash
npx convex env set SITE_URL http://localhost:5173
```

- [ ] **Step 2.4: `make check`**

```bash
make check 2>&1 | tail -5
```

Ожидаемо: zero errors. Если падает на `cannot find module '@convex-dev/auth'` — Task 1 не доехал или нужен `make sync` для регенерации SvelteKit-типов.

> **Recovery от partial-failure.** Если `npx @convex-dev/auth` упал mid-flight (env vars set, но файлы не scaffolded — или наоборот):
> 1. `git status` — посмотреть, что добавлено локально.
> 2. `git restore convex/` — откатить scaffolded файлы.
> 3. `npx convex env list` — посмотреть, какие env vars set'нулись.
> 4. `npx convex env remove SITE_URL JWT_PRIVATE_KEY JWKS` — убрать те, что попали (если все три).
> 5. Re-run `npx @convex-dev/auth` идемпотентно.

- [ ] **Step 2.5: Commit scaffolded files**

```bash
git add convex/auth.config.ts convex/auth.ts convex/http.ts convex/_generated
git diff --staged --stat   # должно быть ~4 файла
git commit -m "feat(auth): scaffold Convex Auth (auth.config.ts, auth.ts, http.ts)"
```

Note: scaffold создал `auth.ts` с **пустым** providers-list — это OK. Кастомизация в Task 4.

---

## Task 3: Расширить schema через `...authTables`

**Files:**
- Modify: `convex/schema.ts`

**Цель:** добавить 7 системных таблиц Convex Auth (`users`, `authSessions`, `authAccounts`, `authRefreshTokens`, `authVerificationCodes`, `authVerifiers`, `authRateLimits`) через spread `...authTables` рядом с существующим `health`.

- [ ] **Step 3.1: Edit schema.ts**

Открыть `convex/schema.ts`. Текущее содержимое:

```ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  health: defineTable({
    tickedAt: v.number(),
  }),
});
```

Заменить на:

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

- [ ] **Step 3.2: Push schema на cloud**

```bash
npx convex dev --once
```

Ожидаемо: `✔ Schema pushed`. На cloud создаются 7 новых таблиц (additive migration, не требует deploy-команды).

- [ ] **Step 3.3: Verify типы регенерировались**

```bash
grep -E 'users|authSessions' convex/_generated/dataModel.d.ts | head -5
```

Ожидаемо: упоминания `users`, `authSessions` и других auth-таблиц.

- [ ] **Step 3.4: `make check`**

Zero errors.

- [ ] **Step 3.5: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(auth): extend schema with Convex Auth tables (...authTables)"
```

---

## Task 4: GitHub provider + `createOrUpdateUserHandler` (TDD)

**Files:**
- Modify: `convex/auth.ts` (заполняем scaffolded шаблон)
- Create: `convex/auth.test.ts`

**Цель:** настроить `convexAuth({ providers: [GitHub], callbacks: { createOrUpdateUser } })` с **явным** `createOrUpdateUserHandler`, реализующим правило «провайдер = аккаунт» (если есть `existingUserId` — вернуть его; иначе — создать нового юзера БЕЗ поиска по email). Покрыть тестами через `convex-test`.

- [ ] **Step 4.1: Написать failing tests (RED)**

Создать `convex/auth.test.ts`:

```ts
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { createOrUpdateUserHandler } from './auth';
import schema from './schema';

// import.meta.glob нужен convex-test для регистрации функций; без него `t.action`/`t.mutation`
// падают, плюс импорт `./auth` исполняет `convexAuth(...)` side-effects.
const modules = import.meta.glob('./**/*.ts');

describe('createOrUpdateUserHandler — provider = account', () => {
  test('returns existingUserId when provided (returning user via same provider)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        email: 'foo@example.com',
        name: 'Foo',
      });
      const result = await createOrUpdateUserHandler(ctx, {
        existingUserId: userId,
        profile: { email: 'foo@example.com', name: 'Foo Updated' },
      });
      expect(result).toBe(userId);
      const all = await ctx.db.query('users').collect();
      expect(all).toHaveLength(1);
    });
  });

  test('creates new user when existingUserId is null (new OAuth account)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const result = await createOrUpdateUserHandler(ctx, {
        existingUserId: null,
        profile: { email: 'foo@example.com', name: 'Foo', image: 'https://example.com/foo.png' },
      });
      const created = await ctx.db.get(result);
      expect(created?.email).toBe('foo@example.com');
      expect(created?.name).toBe('Foo');
      expect(created?.image).toBe('https://example.com/foo.png');
    });
  });

  test('does NOT link by email — same email through different provider yields two separate users', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const firstUserId = await createOrUpdateUserHandler(ctx, {
        existingUserId: null,
        profile: { email: 'shared@example.com', name: 'Via GitHub' },
      });
      const secondUserId = await createOrUpdateUserHandler(ctx, {
        existingUserId: null,
        profile: { email: 'shared@example.com', name: 'Via Google' },
      });
      expect(secondUserId).not.toBe(firstUserId);
      const all = await ctx.db.query('users').collect();
      expect(all).toHaveLength(2);
    });
  });
});
```

- [ ] **Step 4.2: Run tests — должны FAIL (RED state)**

```bash
make test 2>&1 | tail -15
```

Ожидаемо: import error на `createOrUpdateUserHandler` — модуль `./auth` существует (scaffold из Task 2), но не экспортирует `createOrUpdateUserHandler`. Vitest/esbuild сообщит что-то типа `"createOrUpdateUserHandler" is not exported by "convex/auth.ts"` или `SyntaxError: The requested module './auth' does not provide an export named 'createOrUpdateUserHandler'`. Это нормальный RED.

(Точная формулировка зависит от Vitest версии — суть та же: символ не найден.)

- [ ] **Step 4.3: Реализовать `convex/auth.ts`**

Открыть scaffolded `convex/auth.ts` (создан Task 2). Заменить полностью на:

```ts
import GitHub from '@auth/core/providers/github';
import { convexAuth } from '@convex-dev/auth/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

// Узкий, тестируемый helper. Получает только то, что нам реально нужно
// из callback'а Convex Auth. Lib-обёртка (ниже, в convexAuth(...)) передаёт
// сюда нужные поля, остальные игнорирует.
export async function createOrUpdateUserHandler(
  ctx: MutationCtx,
  args: {
    existingUserId: Id<'users'> | null;
    profile: { email?: string; name?: unknown; image?: unknown };
  },
): Promise<Id<'users'>> {
  // Правило «провайдер = аккаунт»: если auth-flow уже опознал юзера через
  // существующий accounts-record — возвращаем его. Иначе всегда создаём
  // нового — никакого поиска/линка по email.
  if (args.existingUserId) {
    return args.existingUserId;
  }
  // authTables.users: все поля v.optional(v.string()) — поэтому undefined OK.
  return ctx.db.insert('users', {
    email: args.profile.email,
    name: typeof args.profile.name === 'string' ? args.profile.name : undefined,
    image: typeof args.profile.image === 'string' ? args.profile.image : undefined,
  });
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
  callbacks: {
    // Передаём в helper только нужные поля, чтобы изолировать тесты от
    // полного callback args shape (`type`, `provider`, `shouldLink` и т.д. — не используем).
    createOrUpdateUser: (ctx, { existingUserId, profile }) =>
      createOrUpdateUserHandler(ctx, { existingUserId, profile }),
  },
});
```

**Заметки про типы:**
- **Полный args shape callback'а** (из `@convex-dev/auth/server`) — `{ existingUserId, type, provider, profile, shouldLink? }`. Мы не используем большую часть → деструктуризируем нужные поля в lib-обёртке.
- **`MutationCtx`** из `./_generated/server` — то же, что `GenericMutationCtx<DataModel>`, но соответствует convex-style: official Convex Auth examples используют именно эту форму.
- **`profile.email?: string`** (optional) — это правда. `name`/`image` — `unknown` (provider-specific). Cast через `typeof === 'string'`.
- **Поля `users` все optional** — проверено в `authTables.users` (все `v.optional(v.string())`), поэтому `undefined` в `db.insert` валиден.

Если TypeScript всё-таки ругается на конкретную строку — посмотреть актуальную типизацию через **Go to Definition** в IDE на `convexAuth`/`createOrUpdateUser`.

- [ ] **Step 4.4: Run tests — должны PASS**

```bash
make test 2>&1 | tail -10
```

Ожидаемо: `Test Files  25 passed (25)`, `Tests  253 passed (253)` (250 старых + 3 новых).

Если хотя бы один из 3 fail'ит — fixed ниже:
- Тест 1 fail (`expect(result).toBe(userId)`): проверь, что в `if (args.existingUserId)` возвращается `args.existingUserId`, не что-то ещё.
- Тест 2/3 fail (`expect(created?.email).toBe(...)` или `expect(all).toHaveLength(2)`): проверь, что `ctx.db.insert('users', ...)` вызывается с правильными полями.

- [ ] **Step 4.5: Push функций на cloud**

```bash
npx convex dev --once
```

Ожидаемо: `auth.ts` пушится; в `convex/_generated/api.d.ts` появляются ссылки на `auth.signIn`, `auth.signOut`.

- [ ] **Step 4.6: `make check` + `make build` (профилактика)**

```bash
make check && make build
```

Zero errors из обоих. Build не должен падать — runtime `convex/_generated/api.js` не импортирует `convex/auth.ts` (type-only импорты в `api.d.ts` стираются esbuild'ом, фронт не видит `@convex-dev/auth/server` цепочку с `jose`/`@auth/core`). Если **всё-таки** падает на `Cannot resolve 'crypto'` или подобном — значит что-то в `src/` напрямую импортирует backend-only пакет (искать тогда руками). Раннее обнаружение здесь дешевле, чем в Step 8.1.

- [ ] **Step 4.7: Commit**

```bash
git add convex/auth.ts convex/auth.test.ts convex/_generated
git commit -m "feat(auth): add GitHub provider with explicit provider=account createOrUpdateUser"
```

---

## Task 5: `viewer` query

**Files:**
- Create: `convex/users.ts`

**Цель:** query `users.viewer` возвращает текущего залогиненного юзера (документ из `users` таблицы) или `null` если не залогинен. Это base-точка для Phase 3 UI и Phase 5 settings sync.

- [ ] **Step 5.1: Написать users.ts**

Создать `convex/users.ts`:

```ts
import { getAuthUserId } from '@convex-dev/auth/server';
import { query } from './_generated/server';

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});
```

- [ ] **Step 5.2: Push на cloud**

```bash
npx convex dev --once
```

Ожидаемо: `users.viewer` появляется в `convex/_generated/api.d.ts`.

- [ ] **Step 5.3: Smoke через CLI (anonymous identity)**

```bash
npx convex run users:viewer
```

Ожидаемо: `null` (CLI запускает без auth-context, `getAuthUserId` возвращает null).

- [ ] **Step 5.4: `make check`**

Zero errors.

- [ ] **Step 5.5: Commit**

```bash
git add convex/users.ts convex/_generated
git commit -m "feat(auth): add users.viewer query returning current user or null"
```

---

## Task 6: GitHub OAuth env vars + sign-in smoke + `CONVEX_SITE_URL` runtime check

**Files:**
- Modify (temporary, reverted within this task): `convex/health.ts` (envCheck query)
- Convex env: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`

**Цель:** end-to-end проверка: установлены креды, можно реально залогиниться через GitHub в браузере, юзер записывается в `users` таблицу. Заодно verify, что `process.env.CONVEX_SITE_URL` доступен внутри функций (Phase 1 нашёл, что переменная не видна в `npx convex env list`).

**No `/dev` page modifications.** Convex Auth обрабатывает sign-in через HTTP-routes (`<site_url>/api/auth/signin/<provider>`), а не через client action. Smoke делается прямым переходом в браузере — не нужно править фронт.

- [ ] **Step 6.1: Установить GitHub env vars в Convex**

GitHub OAuth App уже зарегистрирован в Pre-flight (если нет — сейчас). Взять Client ID и Secret из GitHub Settings.

```bash
# Client ID — не секрет, можно inline:
npx convex env set AUTH_GITHUB_ID Iv1.xxxxxxxxxxxxxx        # заменить на реальный

# Secret — НЕ вводить inline (попадёт в shell history). Через read -s (stdin):
read -s -p "AUTH_GITHUB_SECRET: " GH_SECRET && echo && npx convex env set AUTH_GITHUB_SECRET "$GH_SECRET" && unset GH_SECRET

# Verify:
npx convex env list | grep -E 'AUTH_GITHUB|SITE_URL|JWKS|JWT_PRIVATE_KEY'
```

Ожидаемо: 5 строк (AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, SITE_URL, JWKS, JWT_PRIVATE_KEY). Все должны быть set.

- [ ] **Step 6.2: Verify CONVEX_SITE_URL accessible at runtime**

Phase 1 нашёл, что `CONVEX_SITE_URL` НЕ показывается в `npx convex env list` — это system variable, не user-settable. **Не путать с `PUBLIC_CONVEX_SITE_URL` в `.env.local`** — это разные вещи: `PUBLIC_CONVEX_SITE_URL` — frontend env для SvelteKit-клиента; `CONVEX_SITE_URL` — backend-runtime env, доступный только внутри Convex функций. Проверить, что backend-side `CONVEX_SITE_URL` доступен через `process.env.CONVEX_SITE_URL`:

Временно добавить query в `convex/health.ts`:

```ts
export const envCheck = query({
  args: {},
  handler: async () => ({
    convexSiteUrl: process.env.CONVEX_SITE_URL ?? null,
    siteUrl: process.env.SITE_URL ?? null,
  }),
});
```

```bash
npx convex dev --once
npx convex run health:envCheck
```

Ожидаемо: `{ convexSiteUrl: 'https://wandering-ocelot-9.eu-west-1.convex.site', siteUrl: 'http://localhost:5173' }`.

Если `convexSiteUrl: null` — система не предоставляет переменную автоматически; нужно установить руками:

```bash
npx convex env set CONVEX_SITE_URL https://wandering-ocelot-9.eu-west-1.convex.site
npx convex run health:envCheck     # повторить
```

После проверки — **удалить** `envCheck` из `convex/health.ts` (это диагностика, не должна остаться в коде):

Открыть `convex/health.ts`, удалить `export const envCheck = ...` блок. Файл должен вернуться к виду:

```ts
import { mutation, query } from './_generated/server';

export const ping = query({
  args: {},
  handler: async () => 'pong' as const,
});

export const tick = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.insert('health', { tickedAt: Date.now() });
  },
});
```

```bash
npx convex dev --once     # пушит без envCheck
```

- [ ] **Step 6.3: Sign-in smoke (manual browser flow)**

`@convex-dev/auth` обслуживает sign-in напрямую через HTTP-route на cloud-site URL. Никаких изменений во фронте не нужно.

В браузере открыть:
```
https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/signin/github
```

(Можно даже без запущенного `make dev` — Convex route serve'ит напрямую.)

Ожидаемая цепочка:
1. Convex редиректит на `github.com/login/oauth/authorize?client_id=...&redirect_uri=https%3A%2F%2Fwandering-ocelot-9.eu-west-1.convex.site%2Fapi%2Fauth%2Fcallback%2Fgithub&...`
2. GitHub показывает «Authorize FlowTyping (dev)» (если первый раз) → жмёшь Authorize.
3. GitHub редиректит обратно на `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/github?code=...&state=...`
4. Convex обрабатывает callback, создаёт user через `createOrUpdateUserHandler`, выпускает JWT.
5. Convex редиректит браузер на `SITE_URL` (`http://localhost:5173/`). Поскольку Vite dev может быть не запущен — браузер просто покажет ERR_CONNECTION_REFUSED. **Это OK для smoke** — нам важна запись в `users`, не финальный UI.

Verify через dashboard:
```bash
npx convex dashboard
```
Открыть `users` таблицу — должна быть свежая строка с твоим GitHub email/name.

**Diagnostics при сбоях:**

| Симптом | Причина | Fix |
| --- | --- | --- |
| `redirect_uri_mismatch` на GitHub | Callback URL в OAuth App config не совпадает посимвольно. Типовые причины: (1) trailing slash, (2) `http` vs `https`, (3) regex/case mismatch, (4) `wandering-ocelot-9.convex.site` без region prefix `eu-west-1` | В GitHub OAuth App settings → Authorization callback URL должен быть **точно** `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/github` — байт-в-байт |
| Юзер появился в `users` с `email: undefined` | `@auth/core/providers/github` авто-fetch'ит `/user/emails`, когда `profile.email` пуст (private). Если email всё равно `undefined` — у GitHub-аккаунта вообще нет верифицированных email-адресов, либо OAuth scope `user:email` отвалился | Verify через `npx convex logs` — посмотреть, что GitHub реально вернул в `/user/emails`; в GitHub Settings → Emails добавить и верифицировать email |
| Convex 500 после callback'а | Ошибка в `createOrUpdateUserHandler` или в env vars | `npx convex logs` за последние пару минут — стек ошибки |
| GitHub callback 404 на Convex | `auth.addHttpRoutes(http)` не работает — http.ts не задеплоен | `npx convex dev --once` и проверить `convex/_generated/api.d.ts` на упоминания auth-routes |
| Прошло 60 секунд, нет редиректа с Convex на GitHub | DNS/network проблема, либо `CONVEX_SITE_URL` не set | Step 6.2 check выше; `curl -I https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/signin/github` должен дать 30x |
| После dashboard в `users` пусто | Транзакция rollback'нулась (схема mismatch или throw в callback) | `npx convex logs` |

- [ ] **Step 6.4: No commit — env vars in Convex are not in repo**

Env vars (`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, и любые правки Step 6.2) живут в Convex deployment, не коммитятся.

**Verify рабочее дерево чистое перед Task 7:**
```bash
git status --porcelain     # должно быть пусто (Step 6.2 envCheck вернул health.ts в исходное состояние)
git diff convex/health.ts  # пусто
```

Если непусто — вернуть `convex/health.ts` к исходному состоянию (Step 6.2 «File должен вернуться к виду»). После — `make check` зелёный, ничего не commit'ить.

Записать в **локальный заметник** (не в репо):
- `AUTH_GITHUB_ID=Iv1.xxx`, `AUTH_GITHUB_SECRET=ghs_xxx` — для production-deployment в будущем (там нужны другие credentials).
- Smoke прошёл / не прошёл (юзер появился в `users`?).
- Результат `CONVEX_SITE_URL` runtime check (auto-set cloud / set руками).

---

## Task 7: Обновить CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Цель:** новый разработчик читает CLAUDE.md и понимает: (1) что auth-flow живёт в `convex/auth.{config.ts,ts}` + `convex/http.ts`, (2) как добавить нового OAuth-провайдера, (3) какие env vars нужны.

- [ ] **Step 7.1: Расширить секцию `### Convex backend`**

Открыть `CLAUDE.md`. Найти `### Convex backend` секцию (была добавлена в Phase 1 Task 7). Добавить в конец секции (перед следующим `###`):

```markdown

**Authentication.** Convex Auth (`@convex-dev/auth`). Конфигурация в `convex/auth.ts`:
- `createOrUpdateUserHandler` экспортирован отдельно (тестируется в `convex/auth.test.ts`).
- Правило **«провайдер = аккаунт»**: явно НЕ делаем link-by-email. Один email через GitHub и Google = два разных юзера. См. `docs/plans/auth.md` (Зафиксированные решения).
- Issuer whitelist: `convex/auth.config.ts`.
- HTTP routes: `convex/http.ts` (`auth.addHttpRoutes(http)`).
- Текущий провайдер: GitHub. Google в Phase 4, Yandex/Apple/SberID — Roadmap V2.

**Add new OAuth provider:**
1. Import из `@auth/core/providers/<name>` в `convex/auth.ts`.
2. Добавить в `providers` массив `convexAuth(...)`.
3. Зарегистрировать OAuth app у провайдера; callback URL = `<CONVEX_SITE_URL>/api/auth/callback/<name>` (это backend-side `.convex.site` URL, не frontend `PUBLIC_*`).
4. `npx convex env set AUTH_<NAME>_ID …` + `npx convex env set AUTH_<NAME>_SECRET …`.
5. Push: `npx convex dev --once` (или просто watcher подхватит).

**Auth-related env vars** (в Convex env, не в `.env.local`):
- `SITE_URL` — куда Convex редиректит после auth (Vite origin в dev: `http://localhost:5173`).
- `JWT_PRIVATE_KEY` + `JWKS` — RS256-ключи для self-issued JWT, генерятся `npx @convex-dev/auth`.
- `CONVEX_SITE_URL` — issuer URL, **НЕ устанавливать руками** (Convex выставляет автоматически для cloud).
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` — credentials GitHub OAuth App.

**Viewer query:** `api.users.viewer` возвращает текущего юзера (документ из `users`) или `null`.

**Тесты — vitest projects split (с Phase 2):**
- `src/**/*.test.ts` → project `src`, node environment, обычная Svelte+TS-вселенная (auth-store, компоненты, контракты).
- `convex/**/*.test.ts` → project `convex`, **`edge-runtime` environment**, `convex-test` для unit-тестов функций. Здесь `getAuthUserId`, `createOrUpdateUserHandler`, любая backend-логика, которая трогает `ctx.db`.

`make test` запускает оба проекта одной командой. Vitest префиксит вывод `|src|` / `|convex|`.

**Куда писать тест:** правило простое — *где живёт код, там и тест*. UI/store-логика → `src/`. Backend-функции/callbacks → `convex/`. Cross-cutting интеграционные тесты (Phase 3+) — отдельный вопрос, обсуждать тогда.
```

- [ ] **Step 7.2: Verify spell scope (никаких новых cspell-words не нужно)**

Phase 1 Task 7 уже preload'нул все Phase 2 слова (`convexAuth`, `authTables`, `JWKS`, `JWT`, `OAuth`, `signIn`, `signOut`, `isAuthenticated`, `createOrUpdateUser`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `viewer`, `convex-test`, `CONVEX_SITE_URL`, `SITE_URL`, `applicationID`, `addHttpRoutes`, `jwks`). `make spell` не должен ругаться. Если есть новые слова, не покрытые scope'ом (`make spell` сканирует `src/**`, `dictionaries/**`, `static/**` — не `convex/**` и не `CLAUDE.md`) — не наша забота в этой фазе.

```bash
make spell
```

Ожидаемо: 0 ошибок.

- [ ] **Step 7.3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(auth): document Convex Auth setup, providers, env vars in CLAUDE.md"
```

---

## Task 8: Финальная верификация + merge в `master`

**Files:** ничего не правится.

- [ ] **Step 8.1: `make check-all` зелёный**

```bash
make check-all
```

Ожидаемо: lint + check + test + spell + build — все зелёные. Tests: было 250, теперь 253 (250 + 3 новых auth-тестов).

- [ ] **Step 8.2: Финальная сверка коммитов ветки**

```bash
git log master..feat/convex-auth-github --oneline
git diff master..feat/convex-auth-github --stat
```

Ожидаемо: **6 коммитов** на ветке (Task 1, 2, 3, 4, 5, 7 — каждый со своим коммитом; Task 6 не делает коммитов; Task 8 не делает branch-коммитов, только merge-commit на master).

- [ ] **Step 8.3: Divergence check + merge**

```bash
git remote get-url origin >/dev/null 2>&1 && \
  (git fetch origin || echo 'WARN: fetch failed (offline?), divergence check uses stale ref')
git rev-parse origin/master 2>/dev/null && {
  git log master..origin/master --oneline
  git log origin/master..master --oneline
} || echo "No origin/master ref yet — skipping divergence check"

git switch master
git merge --no-ff feat/convex-auth-github -m "$(cat <<'EOF'
feat(auth): add Convex Auth backend with GitHub provider

Phase 2 of docs/plans/auth.md. Wires authentication backend without UI:

- Install @convex-dev/auth + @auth/core + convex-test
- Extend vitest scope to convex/**/*.test.ts
- Scaffold auth.config.ts, auth.ts, http.ts via npx @convex-dev/auth
- Extend schema with ...authTables
- Implement createOrUpdateUserHandler with provider=account rule (no link-by-email)
- Add users.viewer query
- Cover createOrUpdateUserHandler with 3 convex-test cases
- Document Convex Auth integration in CLAUDE.md

Convex env: SITE_URL, JWT_PRIVATE_KEY, JWKS, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET (set via CLI, not in repo).
GitHub OAuth App registered with callback https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/github.
EOF
)"
```

**Если merge conflicts** — `git merge --abort` и report BLOCKED.

- [ ] **Step 8.4: Повторить `make check-all` после merge**

```bash
make check-all
```

Если падает — `git reset --hard ORIG_HEAD` (откатывает merge), разбираться на ветке.

- [ ] **Step 8.5: Удалить ветку**

```bash
git branch -d feat/convex-auth-github
```

`-d` сам откажется удалять, если не fully merged.

---

## Done criteria (перед merge в master)

- [ ] `make check-all` зелёный (lint + check + test + spell + build)
- [ ] Все 253 теста проходят (250 prior + 3 createOrUpdateUserHandler). Vitest выведет `|src|` и `|convex|` префиксы для projects — это нормально.
- [ ] GitHub OAuth flow работает end-to-end (smoke в Step 6.3): юзер появляется в `users` таблице после реального sign-in через браузер
- [ ] `CONVEX_SITE_URL` подтверждён доступным внутри функций (через `process.env.CONVEX_SITE_URL`)
- [ ] `convex/health.ts` revert'нут (никаких остатков `envCheck`); `make check` после revert зелёный
- [ ] `src/routes/dev/+page.svelte` НЕ менялся в Phase 2 (Task 6 не правит фронт)
- [ ] CLAUDE.md содержит auth-секцию: как добавить провайдера, какие env vars, где живут convex-тесты (vitest projects split)
- [ ] **Schema migration видна на cloud:** `npx convex dashboard` → видны 7 auth таблиц (`users`, `authSessions`, `authAccounts`, `authRefreshTokens`, `authVerificationCodes`, `authVerifiers`, `authRateLimits`) рядом с `health`.
- [ ] **5 Convex env vars set:** `npx convex env list` показывает `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`.
- [ ] **`make spell` зелёный** — Task 7 редактирует CLAUDE.md. cspell сейчас не сканирует CLAUDE.md (scope: `src/**`, `dictionaries/**`, `static/**`), но если кто-то расширит scope позже — наша добавка должна пройти. Профилактическая verification.

## Rollback plan

Если что-то идёт не так и нужно откатить **до Step 8.3 merge'а** — просто `git checkout master` и `git branch -D feat/convex-auth-github`. Файлы исчезнут, но:

**Side effects на cloud deployment** не откатываются автоматически:
- Schema на cloud содержит все 7 `authTables` (additive — не блокирует, можно оставить).
- Env vars (`SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`) остаются в Convex env. Можно убрать через `npx convex env remove <name>` если нужно полностью сбросить.
- В `users` таблице могут быть тестовые юзеры от smoke. Можно почистить через dashboard.

После merge'а — `git revert -m 1 <merge-commit>` создаёт reverse-merge коммит. Cloud side effects — те же caveats.

## What's captured for Phase 3

После завершения Phase 2 у тебя в локальной заметке должно быть:

- **GitHub OAuth credentials** для dev (Client ID, Secret) — в заметнике, не в репо.
- **Cloud deployment URLs** — те же, что в Phase 1: `wandering-ocelot-9.eu-west-1.convex.{cloud,site}`.
- **`CONVEX_SITE_URL` поведение:** auto-set cloud / set руками (зафиксировано из Step 6.2 smoke).
- **Тестовые юзеры в `users` table** — Phase 3 UI будет показывать их name/email; можно почистить или оставить как seed.
- **Какие auth-related actions/queries** доступны в `api`: `api.auth.signIn`, `api.auth.signOut`, `api.auth.store`, `api.auth.isAuthenticated`, `api.users.viewer`.
- **Phase 3 строит UI поверх этого**: `auth-store.svelte.ts` (Svelte 5 runes), `SignInScreen.svelte`, `UserMenu.svelte` (в Header).
- **Phase 3 первым делом должна** wire `convex.setAuth(getTokenFn)` в `src/lib/convex.ts` (или в новом auth-store) — Phase 2 этот файл намеренно не трогает, поэтому авторизованные query'и/mutations сейчас НЕ работают с фронта. Pattern: получить JWT через `signIn`-flow → отдать его как `getTokenFn` Convex клиенту → клиент пушит токен в Authorization header.
- **Test placement Phase 3:** auth-store unit-тесты (`src/lib/auth/auth-store.test.ts`) → `src` project (node env, sveltekit). Если когда-то понадобится backend-side test для нового callback'а или query → `convex/<name>.test.ts` → `convex` project (edge-runtime). Документировано в обновлённом `CLAUDE.md`.
- **JWT TTL caveat:** smoke-юзер из Step 6.3 получил JWT с дефолтным сроком жизни (Convex Auth по дефолту — несколько часов на access-token, до 30 дней на refresh). Если Phase 3 стартует через сутки — Phase 3 UI запросит re-sign-in при первом обращении. Не страшно, просто повторить Step 6.3 flow через UI после wire'а.

---

## Self-review notes (auditor's checklist)

Этот план прошёл self-review автора:

1. **Spec coverage vs umbrella Phase 2:**
   - Install `@convex-dev/auth` + `@auth/core` — Task 1 ✓
   - `convex/auth.config.ts` — Task 2 (scaffold) ✓
   - `convex/auth.ts` с GitHub + `createOrUpdateUser` — Task 4 ✓
   - `convex/http.ts` — Task 2 (scaffold) ✓
   - Schema extension `...authTables` — Task 3 ✓
   - `convex/users.ts` с `viewer()` — Task 5 ✓
   - GitHub OAuth app registration + env vars — Pre-flight + Task 6 ✓
   - Unit-test `createOrUpdateUser` через `convex-test` — Task 1 (install) + Task 4 (TDD) ✓
   - Документация в `CLAUDE.md` — Task 7 ✓
   - **Дополнительно (не в umbrella):** vitest.config.ts расширение (Task 1), `CONVEX_SITE_URL` runtime check (Step 6.2 — Phase 1 unanswered question).

2. **Placeholder scan:**
   - `createOrUpdateUserHandler` — узкий helper с явным типом `MutationCtx` (из `./_generated/server`) и narrow args. Lib-обёртка `(ctx, { existingUserId, profile }) => createOrUpdateUserHandler(...)` явно передаёт нужное; полный args shape callback'а из `@convex-dev/auth` описан в комментариях Step 4.3.
   - Env vars (Client ID/Secret) — placeholder `Iv1.xxx` для ID inline OK; Secret через `read -s` — не в shell history. Корректно.
   - `applicationID` в scaffold'нутом `convex/auth.config.ts` — план не описывает контент файла, только ссылается на него. Достаточно для Phase 2; если CLI scaffold изменится, implementer должен сверить.

3. **Type consistency:**
   - `createOrUpdateUserHandler` имя — то же в Step 4.1 (test import), Step 4.3 (implementation), Step 7.1 (CLAUDE.md ссылка).
   - `Id<'users'>` — последовательно через все таски.
   - `viewer` query name — Task 5 + Task 7 CLAUDE.md.
   - `MutationCtx` (= `GenericMutationCtx<DataModel>` структурно) — Step 4.3 implementation + test ctx через `t.run` — совместимы.

4. **Известные неточности (несовершенство, не блокер):**
   - Точное поведение `npx convex env list` для `CONVEX_SITE_URL` — Phase 1 показал, что переменная НЕ показывается в env list; Step 6.2 это проверяет эмпирически через runtime в Convex функции.
   - Exact prompt order команды `npx @convex-dev/auth` — может варьироваться по версии; план перечисляет 4 типовых prompt'а с заметкой «порядок может варьироваться».
   - `convexAuth` callback type — `@convex-dev/auth` ждёт `GenericMutationCtx<AnyDataModel>`; наш narrow helper принимает `GenericMutationCtx<DataModel>` и обёрнут в лямбду, которая структурно совместима. Если TS всё-таки ругается — Step 4.3 советует «Go to Definition» через IDE.
