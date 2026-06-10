# Phase 3: Auth UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Юзер может зайти через GitHub в браузере, увидеть своё имя/аватар в Header, выйти. Auth-state доступен по всему приложению через единый store с тремя ветками: `loading`/`authenticated`/`guest`. Browser-smoke, отложенный с Phase 2, наконец работает.

**Architecture:** SvelteKit SPA (adapter-static) + community wrapper `@mmailaender/convex-auth-svelte` для клиентского flow `@convex-dev/auth` (verifier/PKCE/token-refresh). Custom `auth-store.svelte.ts` (Svelte 5 runes) комбинирует `useAuth()` (isLoading/isAuthenticated/signIn/signOut) с `api.users.viewer` query → даёт сводный 3-state контракт. UI — два новых компонента в `src/components/auth/` по проектной конвенции тем-контрактов.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes · `@mmailaender/convex-auth-svelte` (client-only, `/svelte` entry) · Convex 1.40 · TypeScript strict · Vitest (src project — node env).

---

## Starting state (после Phase 2)

- **Master HEAD:** `f3436e8` (Phase 2 merge: Convex Auth backend with GitHub provider)
- **Backend готов:** `convex/auth.ts` (GitHub provider + createOrUpdateUserHandler), `convex/users.ts` (viewer query), `convex/auth.config.ts`, `convex/http.ts`, schema with `...authTables`.
- **Convex env:** SITE_URL, JWT_PRIVATE_KEY, JWKS, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET — set.
- **GitHub OAuth App:** зарегистрирован, callback `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/github`.
- **`/dev` страница** (`src/routes/dev/+page.svelte`) — Phase 1 диагностика, Phase 3 удаляет.
- **`src/lib/convex.ts`** — singleton `ConvexClient` + re-export `api` + startup guard. **Не wired в auth flow** — Phase 3 это делает.
- **CLAUDE.md** содержит auth-секцию (Phase 2 Task 7), но без UI-частей.
- **vitest projects split:** `src` (node) + `convex` (edge-runtime). Phase 3 тесты живут в `src/`.
- **15 темо-контрактов** уже в проекте (`src/themes/contract.ts → THEME_CONTRACT`); Phase 3 добавляет ещё 2 (SignInScreen + UserMenu).

## Phase 3 deliverables

- `src/lib/auth/auth.types.ts` — `AuthState`, `User` типы
- `src/lib/auth/auth-store.svelte.ts` — runes-store с 3-state контрактом + viewer query
- `src/lib/auth/auth-state.ts` — pure helper (computeAuthState)
- `src/lib/auth/auth-state.test.ts` — unit-тесты на pure helper
- `src/components/auth/SignInScreen.svelte` — UI для входа через GitHub
- `src/components/auth/SignInScreen.contract.ts` — CSS token names
- `src/components/auth/UserMenu.svelte` — UI текущего юзера в Header
- `src/components/auth/UserMenu.contract.ts` — CSS token names
- `src/components/auth/UserMenu.stories.svelte` — Storybook stories (3 состояния)
- `src/components/auth/SignInScreen.stories.svelte` — Storybook stories
- `src/routes/+layout.svelte` — bootstrap `setupConvexAuth` + создание `authStore`
- `src/routes/signin/+page.svelte` — хост `<SignInScreen />`
- `src/components/app/Header.svelte` — `<UserMenu />` в angle
- `src/themes/contract.ts` — `THEME_CONTRACT` расширен auth-токенами
- `src/themes/_template.css` + `light.css`/`dark.css`/`sepia.css`/`nord.css` — auth-токены задекларированы (значения свободные)
- `package.json` — добавлен `@mmailaender/convex-auth-svelte`
- Удалено: `src/routes/dev/+page.svelte`
- **Browser smoke E2E** — Step 7.3: реальный sign-in через GitHub, юзер в `users`, имя в Header.

## Зафиксированные решения

- **Community wrapper `@mmailaender/convex-auth-svelte`** — выбран ради автоматического PKCE/verifier/token-refresh. Manual wiring (`convex.setAuth(getTokenFn)` руками) был альтернативой, отклонён — больше кода, выше риск ошибиться в OAuth state-handling. Wrapper community-maintained, но достаточно зрелый (см. Phase 2 Risks).
- **Entry `/svelte`** (не `/sveltekit`) — проект на adapter-static, SSR не используем. `/svelte` entry чище для client-only mode.
- **Singleton ConvexClient** из `src/lib/convex.ts` передаётся в `setupConvexAuth({ client, convexUrl })` — один клиент на всё приложение.
- **3-state `AuthState`** компонуется из `useAuth()`.isLoading/isAuthenticated + viewer query result. Loading удерживается **до получения user-документа**, не только до первого query-response.
- **`signIn('github')`** — string-имя провайдера (имя из `providers` array в `convex/auth.ts`).
- **`/dev` страница удаляется** — её роль (smoke endpoint) теперь у настоящего UI.
- **Token refresh / JWT TTL** — **делегировано wrapper'у**. `@mmailaender/convex-auth-svelte` внутри делает silent refresh при истечении access-token'а (refresh-token живёт до 30 дней). UI не обрабатывает expiry явно в Phase 3. Если что-то ломается — диагностика в `Authorization` header'е через DevTools Network.

## File Structure

```
package.json                                       # MODIFY: + @mmailaender/convex-auth-svelte

src/
├── lib/
│   ├── convex.ts                                  # untouched (passed to setupConvexAuth)
│   └── auth/                                      # NEW dir
│       ├── auth.types.ts                          # NEW: AuthState + User
│       ├── auth-store.svelte.ts                   # NEW: runes-store
│       ├── auth-state.ts                          # NEW: pure helper (no Convex imports)
│       └── auth-state.test.ts                     # NEW: unit-тесты pure helper
├── components/
│   ├── app/
│   │   └── Header.svelte                          # MODIFY: + <UserMenu />
│   └── auth/                                      # NEW dir
│       ├── SignInScreen.svelte                    # NEW
│       ├── SignInScreen.contract.ts               # NEW
│       ├── SignInScreen.stories.svelte            # NEW
│       ├── UserMenu.svelte                        # NEW
│       ├── UserMenu.contract.ts                   # NEW
│       └── UserMenu.stories.svelte                # NEW
├── routes/
│   ├── +layout.svelte                             # MODIFY: setupConvexAuth + authStore context
│   ├── signin/
│   │   └── +page.svelte                           # NEW
│   └── dev/
│       └── +page.svelte                           # DELETE
└── themes/
    ├── contract.ts                                # MODIFY: + auth tokens в THEME_CONTRACT
    ├── _template.css                              # MODIFY: + auth token declarations
    ├── light.css                                  # MODIFY
    ├── dark.css                                   # MODIFY
    ├── sepia.css                                  # MODIFY
    └── nord.css                                   # MODIFY
```

**Не трогаем:** `convex/*` (Phase 2 backend стабилен), `src/machines/*` (auth orthogonal к FSM), `src/lib/convex.ts` (только импорт в layout — без правки), `src/lib/settings.ts`/`src/lib/i18n.ts` (Phase 3 sync — это Phase 5).

---

## Pre-flight Checks

- [ ] **3 свободных терминала.** Watcher + рабочий + (для Task 7) `make dev` под smoke. Можно открыть 3 сразу или 3-й добавить когда дойдёшь до Task 7.
- [ ] **Стартовать с чистого `master`:**
  ```bash
  git status --porcelain          # пусто
  git switch master
  git switch -C feat/auth-ui
  ```
- [ ] **Watcher в dedicated терминале:**
  ```bash
  npx convex dev
  ```
  Должен подключиться к `wandering-ocelot-9.eu-west-1.convex.cloud`. Оставить running.
- [ ] **`PUBLIC_CONVEX_URL` в `.env.local`** (стоит с Phase 1). Verify:
  ```bash
  grep PUBLIC_CONVEX_URL .env.local
  ```

---

## Task 1: Install convex-auth-svelte + auth types

**Files:**
- Modify: `package.json` (+ lock)
- Create: `src/lib/auth/auth.types.ts`

**Цель:** добавить community wrapper и зафиксировать публичный shape `AuthState` + `User`. После Task 1 проект собирается; никакой UI-логики ещё нет.

- [ ] **Step 1.1: Install**

```bash
# Pin wrapper (community, pre-1.0, breaking changes likely on minor bumps).
# convex-svelte — required peer dep of the wrapper. Pin тоже обязателен —
# npm latest = 0.13.0, которая НЕ удовлетворяет wrapper's peer ^0.0.12 (semver: 
# 0.x.y treats ^ как patch-pin). Без явного пина npm install грабнёт 0.13.0 → runtime API mismatch.
npm install @mmailaender/convex-auth-svelte@~0.1.3 convex-svelte@~0.0.12
```

Ожидаемо: **два peer-dep warning'а** от npm:
- `@auth/core@^0.37.0` (wrapper peer) vs наш `~0.41.2` — wrapper заявил консервативную границу, в реальности совместим.
- `@convex-dev/auth@^0.0.87` (wrapper peer) vs наш `~0.0.94` — то же (`^0.0.87` для 0.x.y значит ровно 0.0.87, не >=).

Оба intentional, downstream API совместимы. Игнорировать. **Никаких других peer warning'ов не должно быть** — если npm ругается на что-то ещё, разобраться.

- [ ] **Step 1.2: Создать `src/lib/auth/auth.types.ts`**

```ts
import type { Doc } from '../../../convex/_generated/dataModel';

export type User = Doc<'users'>;

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User }
  | { status: 'guest' };
```

`Doc<'users'>` пришёл из Convex codegen после Phase 2 (схема расширена `...authTables`).

- [ ] **Step 1.3: `make check`**

```bash
make check 2>&1 | tail -3
```

Zero errors. Если `Doc<'users'>` не находится — проверить, что `convex/_generated/` существует и содержит `dataModel.d.ts` с `users` table.

- [ ] **Step 1.4: Commit**

```bash
git add package.json package-lock.json src/lib/auth/auth.types.ts
git commit -m "chore(auth-ui): install convex-auth-svelte; add AuthState type contract"
```

---

## Task 2: Bootstrap `setupConvexAuth` в `+layout.svelte`

**Files:**
- Modify: `src/routes/+layout.svelte`

**Цель:** инициализировать convex-auth-svelte в root layout. После Task 2 `useAuth()` вызовы из любого компонента работают (возвращают свежий context).

> **Важно про порядок.** `setupConvexAuth` должен вызваться в `<script>` блоке `+layout.svelte` — до того, как любой child-компонент его читает. Установка context'а в Svelte 5 runes-системе синхронная при выполнении script-блока.

- [ ] **Step 2.1: Прочитать текущий `+layout.svelte`**

```bash
cat src/routes/+layout.svelte
```

Запомнить структуру (theme effects, appActor host, Header). Phase 3 ничего из этого не удаляет — только **добавляет** auth-bootstrap.

- [ ] **Step 2.2: Добавить setupConvexAuth import + вызов**

В `<script lang="ts">` блок (до существующих effects/getContext'ов), добавить:

```ts
import { setupConvexAuth } from '@mmailaender/convex-auth-svelte/svelte';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { convex } from '@/lib/convex';

setupConvexAuth({
  client: convex,
  convexUrl: PUBLIC_CONVEX_URL,
});
```

`client: convex` передаёт наш singleton (из `@/lib/convex`) — wrapper не создаёт второй ConvexClient. `convexUrl` нужен wrapper'у отдельно для конфигурации auth endpoint'ов.

> **`convex.setAuth(...)` делается автоматически.** Wrapper внутри `setupConvexAuth` зовёт `client.setAuth(auth.fetchAccessToken)` и держит реактивный `$effect`, который пере-передаёт токен при обновлении. **Никакого manual `convex.setAuth(...)` в `src/lib/convex.ts` или в layout добавлять НЕ нужно** — это закрывает Phase 2 handoff item.

> **HMR guard.** `+layout.svelte` script re-runs на каждый hot-reload. Без guard'а каждое сохранение в layout создаёт **новые** auth-subscriptions, накапливая listener'ы на singleton `convex` client. Добавить в конце `<script>` блока (после `setContext('auth', ...)` из Task 6):
> ```ts
> if (import.meta.hot) import.meta.hot.invalidate();
> ```
> Это force'ит full reload вместо HMR при правках в layout. Тот же pattern уже используется в `src/machines/appActor.ts` (см. CLAUDE.md Gotchas — «HMR и XState»). Аналогично здесь для auth-subscriptions.

- [ ] **Step 2.3: `make check` + `make build`**

```bash
make check && make build
```

Zero errors. Build prophylactic — wrapper тянет deps, проверяем что Vite их корректно бандлит.

- [ ] **Step 2.4: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat(auth-ui): bootstrap setupConvexAuth in root layout"
```

---

## Task 3: `auth-store.svelte.ts` с тестами (TDD)

**Files:**
- Create: `src/lib/auth/auth-state.ts` — **pure** state-derivation helper (no Convex imports), testable in node env
- Create: `src/lib/auth/auth-store.svelte.ts` — runes-store, importer pure helper
- Create: `src/lib/auth/auth-state.test.ts` — unit tests on pure helper

**Цель:** runes-store с reactive `AuthState`. Источники:
- `useAuth()` from convex-auth-svelte — `isLoading`, `isAuthenticated`, `signIn`, `signOut`
- `convex.onUpdate(api.users.viewer, ...)` — reactive user document subscription

**3-state contract:**
- `isLoading === true` → `{ status: 'loading' }`
- `isAuthenticated && user document loaded` → `{ status: 'authenticated', user }`
- `isAuthenticated && user document still null` → `{ status: 'loading' }` (важно: НЕ guest)
- `!isAuthenticated` → `{ status: 'guest' }`

- [ ] **Step 3.1: Написать failing tests (RED)**

> **Почему отдельный файл `auth-state.ts`.** Если положить `computeAuthState` в `auth-store.svelte.ts`, vitest при импорте тянет всю transitive chain включая `@/lib/convex` (instantiates `ConvexClient`, требует WebSocket/PUBLIC_CONVEX_URL). Тест в node env упадёт на module-load. Решение: pure helper в **отдельном `auth-state.ts`** без зависимости от `@/lib/convex` и от `@mmailaender/convex-auth-svelte`. `auth-store.svelte.ts` (runes) импортирует pure helper.

Создать `src/lib/auth/auth-state.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import { computeAuthState } from './auth-state';
import type { AuthState, User } from './auth.types';

// `Doc<'users'>` имеет много optional полей (name?/image?/phone?/...). Для тестов
// делаем минимальный валидный объект через `as User` cast.
function mockUser(overrides: Partial<User> = {}): User {
  return {
    _id: 'user_abc' as Id<'users'>,
    _creationTime: 0,
    email: 'foo@example.com',
    ...overrides,
  } as User;
}

describe('computeAuthState — 3-state contract', () => {
  test('isLoading=true → loading regardless of viewer', () => {
    const state: AuthState = computeAuthState({ isLoading: true, isAuthenticated: false, viewer: null });
    expect(state.status).toBe('loading');
  });

  test('isLoading=true + isAuthenticated=true → still loading', () => {
    const state: AuthState = computeAuthState({ isLoading: true, isAuthenticated: true, viewer: null });
    expect(state.status).toBe('loading');
  });

  test('isLoading=false + isAuthenticated=false → guest', () => {
    const state: AuthState = computeAuthState({ isLoading: false, isAuthenticated: false, viewer: null });
    expect(state.status).toBe('guest');
  });

  test('isLoading=false + isAuthenticated=true + viewer=null → loading (waiting for viewer)', () => {
    const state: AuthState = computeAuthState({ isLoading: false, isAuthenticated: true, viewer: null });
    expect(state.status).toBe('loading');
  });

  test('isLoading=false + isAuthenticated=true + viewer set → authenticated with user', () => {
    const user = mockUser();
    const state: AuthState = computeAuthState({ isLoading: false, isAuthenticated: true, viewer: user });
    expect(state.status).toBe('authenticated');
    if (state.status === 'authenticated') {
      expect(state.user).toEqual(user);
    }
  });

  test('isLoading=false + isAuthenticated=false but viewer set (stale) → guest, ignore viewer', () => {
    const state: AuthState = computeAuthState({ isLoading: false, isAuthenticated: false, viewer: mockUser() });
    expect(state.status).toBe('guest');
  });
});
```

- [ ] **Step 3.2: Run RED**

```bash
make test 2>&1 | tail -15
```

Ожидаемо: import error на `computeAuthState` из `./auth-state` (модуль не существует — нормальный RED). Точная формулировка vitest зависит от версии, суть: символ не найден.

- [ ] **Step 3.3a: Создать `src/lib/auth/auth-state.ts` (pure helper)**

```ts
import type { AuthState, User } from './auth.types';

/**
 * Pure state-derivation helper. Никаких runes, никаких Convex/wrapper-импортов —
 * чтобы тесты не тащили транзитивную цепочку до ConvexClient (которому нужен
 * WebSocket runtime недоступный в node test env).
 */
export function computeAuthState({
  isLoading,
  isAuthenticated,
  viewer,
}: {
  isLoading: boolean;
  isAuthenticated: boolean;
  viewer: User | null;
}): AuthState {
  if (isLoading) return { status: 'loading' };
  if (!isAuthenticated) return { status: 'guest' };
  // isAuthenticated, но viewer ещё не подтянулся — держим loading, не показываем «гостя» залогиненному
  if (viewer === null) return { status: 'loading' };
  return { status: 'authenticated', user: viewer };
}
```

- [ ] **Step 3.3b: Создать `src/lib/auth/auth-store.svelte.ts` (runes store)**

```ts
import { useAuth } from '@mmailaender/convex-auth-svelte/svelte';
import { api, convex } from '@/lib/convex';
import { computeAuthState } from './auth-state';
import type { User } from './auth.types';

/**
 * Reactive auth-store. Вызывать строго внутри `+layout.svelte` (или другого svelte-context'а),
 * после `setupConvexAuth`. Возвращает объект с reactive getter'ом state + bound методами signIn/signOut.
 */
export function createAuthStore() {
  const auth = useAuth();
  let viewer = $state<User | null>(null);

  $effect(() => {
    if (!auth.isAuthenticated) {
      viewer = null;
      return;
    }
    const unsubscribe = convex.onUpdate(api.users.viewer, {}, (result) => {
      viewer = result;
    });
    return () => unsubscribe();
  });

  const state = $derived(
    computeAuthState({
      isLoading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
      viewer,
    }),
  );

  return {
    get state() {
      return state;
    },
    signIn: (provider: string) => auth.signIn(provider),
    signOut: () => auth.signOut(),
  };
}
```

- [ ] **Step 3.4: Run GREEN**

```bash
make test 2>&1 | tail -10
```

Ожидаемо: 253 + 6 = 259 tests pass (250 src prior + 3 convex prior + 6 new auth-store).

- [ ] **Step 3.5: `make check`**

```bash
make check
```

Zero errors. `auth-store.svelte.ts` использует runes (`$state`, `$effect`, `$derived`) — `.svelte.ts` extension даёт runes-режим вне `.svelte` файла.

- [ ] **Step 3.6: Commit**

```bash
git add src/lib/auth/auth-state.ts \
        src/lib/auth/auth-state.test.ts \
        src/lib/auth/auth-store.svelte.ts
git commit -m "feat(auth-ui): add auth-store with 3-state AuthState contract and viewer query subscription"
```

---

## Task 4: `SignInScreen` компонент + контракт + темы

**Files:**
- Create: `src/components/auth/SignInScreen.svelte`
- Create: `src/components/auth/SignInScreen.contract.ts`
- Create: `src/components/auth/SignInScreen.stories.svelte`
- Modify: `src/themes/contract.ts` (+ SignInScreen tokens в `THEME_CONTRACT`)
- Modify: `src/themes/_template.css`
- Modify: `src/themes/light.css`, `src/themes/dark.css`, `src/themes/sepia.css`, `src/themes/nord.css`

**Цель:** компонент с кнопкой «Войти через GitHub» + дисклеймер про «провайдер = аккаунт». Без передачи user-state снаружи — компонент читает `authStore` через `getContext<AuthStore>('auth')` (тот же pattern, что UserMenu) и зовёт `authStore.signIn('github')`. Единообразный context-read через оба компонента упрощает Storybook'у mock'инг через `MockAuthHost`.

**Дизайн.** Минималистичный экран:
```
┌─────────────────────────────────┐
│                                 │
│    Войти в FlowTyping           │
│                                 │
│    [ Войти через GitHub ]       │
│                                 │
│    Используй тот же способ      │
│    входа, что и раньше — твой   │
│    прогресс привязан к нему.    │
│                                 │
└─────────────────────────────────┘
```

- [ ] **Step 4.1: Создать `SignInScreen.contract.ts`**

```ts
// CSS token names (visual roles) — see docs/06-component-contracts-and-themes.md
export const SIGN_IN_SCREEN_CONTRACT = [
  '--sign-in-screen-background',
  '--sign-in-screen-title-color',
  '--sign-in-screen-disclaimer-color',
  '--sign-in-screen-btn-github-background',
  '--sign-in-screen-btn-github-color',
  '--sign-in-screen-btn-github-border',
  '--sign-in-screen-btn-github-hover-background',
] as const satisfies readonly `--${string}`[];

export type SignInScreenToken = (typeof SIGN_IN_SCREEN_CONTRACT)[number];
```

- [ ] **Step 4.2: Создать `SignInScreen.svelte`**

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { createAuthStore } from '@/lib/auth/auth-store.svelte';

  type AuthStore = ReturnType<typeof createAuthStore>;
  // Читаем 'auth' context (поставленный в +layout.svelte через setContext).
  // Это позволяет Storybook'у инжектить mock через MockAuthHost — без context'а
  // wrapper'а от @mmailaender/convex-auth-svelte. Тот же pattern, что UserMenu.
  const auth = getContext<AuthStore>('auth');
  let error: string | null = $state(null);
  let signingIn: boolean = $state(false);

  async function handleGithubSignIn() {
    error = null;
    signingIn = true;
    try {
      await auth.signIn('github');
      // signIn инициирует browser redirect — code ниже скорее всего не выполнится
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      signingIn = false;
    }
  }
</script>

<section class="sign-in-screen">
  <h1 class="sign-in-screen__title">Войти в FlowTyping</h1>

  <button
    type="button"
    class="sign-in-screen__btn-github"
    disabled={signingIn}
    onclick={handleGithubSignIn}
  >
    {signingIn ? 'Перенаправление…' : 'Войти через GitHub'}
  </button>

  <p class="sign-in-screen__disclaimer">
    Используй тот же способ входа, что и раньше — твой прогресс привязан к нему.
  </p>

  {#if error}
    <p class="sign-in-screen__error" role="alert">{error}</p>
  {/if}
</section>

<style>
  .sign-in-screen {
    background: var(--sign-in-screen-background);
    padding: var(--spacing-xl, 2rem);
    border-radius: var(--radius-md, 0.5rem);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md, 1rem);
    align-items: center;
    max-width: 22rem;
    margin: 4rem auto;
  }

  .sign-in-screen__title {
    color: var(--sign-in-screen-title-color);
    font-size: 1.5rem;
    margin: 0;
  }

  .sign-in-screen__disclaimer {
    color: var(--sign-in-screen-disclaimer-color);
    font-size: 0.875rem;
    text-align: center;
    margin: 0;
  }

  .sign-in-screen__btn-github {
    background: var(--sign-in-screen-btn-github-background);
    color: var(--sign-in-screen-btn-github-color);
    border: var(--sign-in-screen-btn-github-border);
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-sm, 0.25rem);
    cursor: pointer;
    font-size: 1rem;
  }

  .sign-in-screen__btn-github:hover {
    background: var(--sign-in-screen-btn-github-hover-background);
  }

  .sign-in-screen__btn-github:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sign-in-screen__error {
    color: oklch(60% 0.2 25);
    font-size: 0.875rem;
  }
</style>
```

`error` color — литерал (red), не темизуется. Это error-only, edge-case.

- [ ] **Step 4.3: Создать `SignInScreen.stories.svelte`**

```svelte
<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import MockAuthHost from './MockAuthHost.svelte';
  import SignInScreen from './SignInScreen.svelte';

  const { Story } = defineMeta({
    title: 'auth/SignInScreen',
    component: SignInScreen,
  });
</script>

{#snippet template()}
  <MockAuthHost state={{ status: 'guest' }}>
    {#snippet children()}
      <SignInScreen />
    {/snippet}
  </MockAuthHost>
{/snippet}

<Story name="Default" {template} />
```

> **Зачем `MockAuthHost`.** `SignInScreen` читает `getContext('auth')` (как UserMenu). В Storybook нет `setupConvexAuth` → нет реального authStore. `MockAuthHost` ставит synthetic `'auth'` context с no-op `signIn/signOut` — Storybook рендерит чисто. Click по GitHub-кнопке вызовет mock `signIn()` (resolved-promise no-op), кнопка останется в `signingIn=true` state («Перенаправление…»). В реальном flow редирект случается ДО возврата control'а, поэтому visual «freeze» Storybook'е — корректное представление того, что юзер увидит в production. Для UI-review ценен initial state до клика.

> **Storybook syntax note.** Pattern: `<script module>` (Svelte 5; не Svelte 4's `context='module'`), top-level `{#snippet template()}` передаётся в Story через `{template}` prop. Аттрибуты HTML — **double quotes** (`name="..."`).

- [ ] **Step 4.4: Добавить токены в `_template.css`**

В `src/themes/_template.css` добавить блок:

```css
  /* === Auth: SignInScreen === */
  --sign-in-screen-background: unset;
  --sign-in-screen-title-color: unset;
  --sign-in-screen-disclaimer-color: unset;
  --sign-in-screen-btn-github-background: unset;
  --sign-in-screen-btn-github-color: unset;
  --sign-in-screen-btn-github-border: unset;
  --sign-in-screen-btn-github-hover-background: unset;
```

- [ ] **Step 4.5: Заполнить токены в темах**

Для **каждой** из 4 тем (`light.css`, `dark.css`, `sepia.css`, `nord.css`) добавить блок токенов с реальными значениями. Свобода значений — главное чтобы тема выглядела согласовано с остальной палитрой. Пример для `light.css`:

```css
  /* === Auth: SignInScreen === */
  --sign-in-screen-background: var(--color-surface);
  --sign-in-screen-title-color: var(--color-text-primary);
  --sign-in-screen-disclaimer-color: var(--color-text-secondary);
  --sign-in-screen-btn-github-background: oklch(20% 0.02 280);
  --sign-in-screen-btn-github-color: oklch(98% 0 0);
  --sign-in-screen-btn-github-border: 1px solid oklch(15% 0.02 280);
  --sign-in-screen-btn-github-hover-background: oklch(30% 0.03 280);
```

Для `dark.css`/`sepia.css`/`nord.css` — подобрать значения, соответствующие палитре темы. Конкретные оттенки на усмотрение implementer'а; главное, контракт-тест должен пройти.

> **Палитра-зависимость.** Пример использует `var(--color-surface)`/`var(--color-text-*)` — это **внутренние палеточные** токены темы (legacy `--color-*`), не из `THEME_CONTRACT`. Перед использованием в новой теме — `grep` тему на эти имена; если нет — либо завести в палеточном блоке темы, либо использовать литерал `oklch(...)`. Без этого `var(--color-...)` резолвнется к пустоте → невидимый цвет.

- [ ] **Step 4.6: Расширить `THEME_CONTRACT`**

В `src/themes/contract.ts` импортировать `SIGN_IN_SCREEN_CONTRACT` и добавить в массив:

```ts
import { SIGN_IN_SCREEN_CONTRACT } from '@/components/auth/SignInScreen.contract';
// ... остальные импорты

export const THEME_CONTRACT = [
  // ... existing tokens
  ...SIGN_IN_SCREEN_CONTRACT,
] as const;
```

- [ ] **Step 4.7: `make test` — contract test должен пройти**

```bash
make test 2>&1 | tail -5
```

`src/themes/contract.test.ts` проверяет: каждый token из `THEME_CONTRACT` объявлен в `_template.css` И в каждой из 4 тем. Должно быть зелёное.

- [ ] **Step 4.8: `make check-all`**

```bash
make check-all
```

Zero errors всеми инструментами.

- [ ] **Step 4.9: Commit**

```bash
git add src/components/auth/SignInScreen.svelte \
        src/components/auth/SignInScreen.contract.ts \
        src/components/auth/SignInScreen.stories.svelte \
        src/themes/contract.ts \
        src/themes/_template.css \
        src/themes/light.css \
        src/themes/dark.css \
        src/themes/sepia.css \
        src/themes/nord.css
git commit -m "feat(auth-ui): add SignInScreen component with theme contract"
```

---

## Task 5: `UserMenu` компонент + контракт + темы

**Files:**
- Create: `src/components/auth/UserMenu.svelte`
- Create: `src/components/auth/UserMenu.contract.ts`
- Create: `src/components/auth/UserMenu.stories.svelte`
- Create: `src/components/auth/MockAuthHost.svelte` — storybook-only helper (wrap component with mocked auth context)
- Modify: `src/themes/contract.ts` (+ UserMenu tokens)
- Modify: `src/themes/_template.css`
- Modify: 4 темы

**Цель:** компактный компонент для Header. Три состояния:
- `loading` — спиннер или skeleton
- `authenticated` — name/avatar + dropdown с «Sign out»
- `guest` — кнопка «Sign in» → ссылка на `/signin`

Для простоты (Phase 3 — первый раз): dropdown — `<details><summary>` (native, без библиотек), MVP-уровень.

- [ ] **Step 5.1: Создать `UserMenu.contract.ts`**

```ts
export const USER_MENU_CONTRACT = [
  '--user-menu-loading-color',
  '--user-menu-guest-link-color',
  '--user-menu-guest-link-hover-color',
  '--user-menu-authenticated-name-color',
  '--user-menu-dropdown-background',
  '--user-menu-dropdown-border',
  '--user-menu-dropdown-item-color',
  '--user-menu-dropdown-item-hover-background',
] as const satisfies readonly `--${string}`[];

export type UserMenuToken = (typeof USER_MENU_CONTRACT)[number];
```

- [ ] **Step 5.2: Создать `UserMenu.svelte`**

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { createAuthStore } from '@/lib/auth/auth-store.svelte';

  type AuthStore = ReturnType<typeof createAuthStore>;
  const auth = getContext<AuthStore>('auth');

  async function handleSignOut() {
    await auth.signOut();
  }
</script>

{#if auth.state.status === 'loading'}
  <span class="user-menu user-menu--loading" aria-busy="true">…</span>
{:else if auth.state.status === 'guest'}
  <a class="user-menu user-menu--guest-link" href="/signin">Войти</a>
{:else}
  <details class="user-menu user-menu--authenticated">
    <summary class="user-menu__summary">
      {auth.state.user.name ?? auth.state.user.email ?? 'User'}
    </summary>
    <div class="user-menu__dropdown">
      <button type="button" class="user-menu__item" onclick={handleSignOut}>
        Выйти
      </button>
    </div>
  </details>
{/if}

<style>
  .user-menu--loading {
    color: var(--user-menu-loading-color);
  }

  .user-menu--guest-link {
    color: var(--user-menu-guest-link-color);
    text-decoration: none;
  }

  .user-menu--guest-link:hover {
    color: var(--user-menu-guest-link-hover-color);
  }

  .user-menu--authenticated {
    position: relative;
  }

  .user-menu__summary {
    color: var(--user-menu-authenticated-name-color);
    cursor: pointer;
    list-style: none;
    padding: 0.25rem 0.5rem;
  }

  .user-menu__summary::-webkit-details-marker {
    display: none;
  }

  .user-menu__dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--user-menu-dropdown-background);
    border: var(--user-menu-dropdown-border);
    border-radius: var(--radius-sm, 0.25rem);
    padding: 0.25rem;
    min-width: 8rem;
  }

  .user-menu__item {
    color: var(--user-menu-dropdown-item-color);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    width: 100%;
    text-align: left;
  }

  .user-menu__item:hover {
    background: var(--user-menu-dropdown-item-hover-background);
  }
</style>
```

Использует `getContext('auth')` — Task 6 поставит этот context в `+layout.svelte`. Для **Storybook** (Steps 5.3a-5.3b) понадобится mock.

- [ ] **Step 5.3a: Создать `MockAuthHost.svelte` (helper для stories)**

```svelte
<script lang="ts">
  import { setContext } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { AuthState } from '@/lib/auth/auth.types';

  let { state, children }: { state: AuthState; children: Snippet } = $props();

  setContext('auth', {
    get state() {
      return state;
    },
    signIn: async () => {},
    signOut: async () => {
      console.log('mock signOut');
    },
  });
</script>

{@render children()}
```

Это маленький wrapper, который кладёт в context mocked `auth` и рендерит children. `setContext` вызывается **внутри `<script>` компонента** — не из snippet'а — это правильное место в Svelte 5.

- [ ] **Step 5.3b: Создать `UserMenu.stories.svelte` — 3 состояния**

```svelte
<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { Id } from '../../../convex/_generated/dataModel';
  import type { AuthState } from '@/lib/auth/auth.types';
  import MockAuthHost from './MockAuthHost.svelte';
  import UserMenu from './UserMenu.svelte';

  const { Story } = defineMeta({
    title: 'auth/UserMenu',
    component: UserMenu,
  });
</script>

{#snippet template(args: { state: AuthState })}
  <MockAuthHost state={args.state}>
    {#snippet children()}
      <UserMenu />
    {/snippet}
  </MockAuthHost>
{/snippet}

<Story
  name="Loading"
  args={{ state: { status: 'loading' } }}
  {template}
/>

<Story
  name="Guest"
  args={{ state: { status: 'guest' } }}
  {template}
/>

<Story
  name="Authenticated"
  args={{
    state: {
      status: 'authenticated',
      user: {
        _id: 'user_demo' as Id<'users'>,
        _creationTime: 0,
        email: 'demo@example.com',
        name: 'Demo User',
      },
    },
  }}
  {template}
/>
```

Pattern: top-level `{#snippet template(args)}` принимает Storybook args, рендерит `<MockAuthHost>` с `<UserMenu>` внутри. `<Story>` передаёт `args` и `{template}` (verified против `Finger.stories.svelte` в проекте).

- [ ] **Step 5.4: Расширить `_template.css` + 4 темы + `THEME_CONTRACT`**

Повторить процедуру Task 4 Steps 4.4-4.6 для `USER_MENU_CONTRACT`.

- [ ] **Step 5.5: `make check-all`**

```bash
make check-all
```

Все green. Storybook stories не блокируют — они в .stories.svelte файлах, исключены из тестов.

- [ ] **Step 5.6: Verify Storybook рендерит**

```bash
make storybook
```

В отдельном терминале запустит storybook на http://localhost:6006. Открыть в браузере → найти `auth/UserMenu` → должны быть 3 истории (Loading/Guest/Authenticated), каждая визуально рендерит правильное состояние.

`Ctrl+C` storybook после проверки.

- [ ] **Step 5.7: Commit**

```bash
git add src/components/auth/UserMenu.svelte \
        src/components/auth/UserMenu.contract.ts \
        src/components/auth/UserMenu.stories.svelte \
        src/components/auth/MockAuthHost.svelte \
        src/themes/contract.ts \
        src/themes/_template.css \
        src/themes/light.css \
        src/themes/dark.css \
        src/themes/sepia.css \
        src/themes/nord.css
git commit -m "feat(auth-ui): add UserMenu component (loading/guest/authenticated) with theme contract"
```

---

## Task 6: Wire UI — Header + /signin route + создать authStore context

**Files:**
- Modify: `src/routes/+layout.svelte`
- Modify: `src/components/app/Header.svelte`
- Create: `src/routes/signin/+page.svelte`

**Цель:** связать готовые компоненты с UI. После Task 6:
- В layout создаётся `authStore` через `createAuthStore()` + кладётся в context как `'auth'`
- `<UserMenu />` появляется в Header
- Маршрут `/signin` хостит `<SignInScreen />`

- [ ] **Step 6.1: В `+layout.svelte` создать и проставить authStore**

После `setupConvexAuth({ ... })` (Task 2) добавить:

```ts
import { setContext } from 'svelte';
import { createAuthStore } from '@/lib/auth/auth-store.svelte';

const authStore = createAuthStore();
setContext('auth', authStore);
```

`createAuthStore` зовёт `useAuth()` — context от `setupConvexAuth` должен быть уже установлен. Порядок строгий: `setupConvexAuth` → `createAuthStore`.

- [ ] **Step 6.2: Добавить `<UserMenu />` в Header**

Открыть `src/components/app/Header.svelte`. Существующая структура: `<nav class="nav">` с двумя `<a>` ссылками на `/settings` и `/stats`. Добавить `<UserMenu />` в конец этого `<nav>`:

```svelte
<script lang="ts">
  // ... existing imports
  import UserMenu from '@/components/auth/UserMenu.svelte';
</script>

<!-- ... existing template -->
<nav class="nav">
  <!-- ... existing /settings + /stats links -->
  <UserMenu />
</nav>
```

(Точный отступ — копировать стиль существующих ссылок. Class name `nav` берётся из реального файла, не `header__nav`.)

- [ ] **Step 6.3: Создать `src/routes/signin/+page.svelte`**

```svelte
<script lang="ts">
  import SignInScreen from '@/components/auth/SignInScreen.svelte';
</script>

<SignInScreen />
```

(`<script lang="ts">` — double quotes per project convention для template/attribute, single quotes для TS-литералов; здесь `lang="ts"` это атрибут.)

- [ ] **Step 6.4: `make check-all`**

```bash
make check-all
```

Zero errors. Все 4 темы должны проходить contract-тест (добавлены SignInScreen + UserMenu токены).

- [ ] **Step 6.5: Commit**

```bash
git add src/routes/+layout.svelte \
        src/components/app/Header.svelte \
        src/routes/signin/+page.svelte
git commit -m "feat(auth-ui): wire UserMenu into Header, host SignInScreen at /signin"
```

---

## Task 7: Browser smoke E2E (deferred from Phase 2)

**Files:** ничего не меняется.

**Цель:** наконец-то проверить sign-in flow в браузере. Phase 2 этого сделать не мог — нужен был клиентский verifier-handler.

- [ ] **Step 7.1: Запустить dev-сервер**

В рабочем терминале (watcher из Pre-flight жив в другом):

```bash
make dev
```

Vite на `http://localhost:5173`.

- [ ] **Step 7.2: Открыть в браузере `/signin`**

`http://localhost:5173/signin` должно показать SignInScreen с кнопкой «Войти через GitHub» и дисклеймером.

- [ ] **Step 7.3: Нажать «Войти через GitHub» и пройти OAuth flow**

Цепочка:
1. Клик → `convex-auth-svelte` вызывает `signIn` action на Convex backend
2. Action создаёт verifier, кладёт state в cookie/localStorage
3. Браузер редиректит на `github.com/login/oauth/authorize?...`
4. GitHub: «Authorize FlowTyping (dev)» → жмёшь Authorize
5. GitHub редиректит на `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/github?code=...`
6. Convex обрабатывает callback, **создаёт user через `createOrUpdateUserHandler`**
7. Convex редиректит обратно на `SITE_URL=http://localhost:5173/`
8. Vite-фронт грузится; `setupConvexAuth` восстанавливает session из cookie/localStorage
9. `useAuth()` → `isAuthenticated=true`
10. `convex.onUpdate(api.users.viewer)` → возвращает свежесозданного user'а
11. `authStore.state.status` → `'authenticated'`, user заполнен
12. Header показывает `<UserMenu>` с твоим GitHub-именем

- [ ] **Step 7.4: Verify в dashboard**

```bash
npx convex dashboard
```

Открыть `users` таблицу. Свежая строка с email + name. Это тот юзер, которого ты только что залогинил.

- [ ] **Step 7.5: Multi-tab smoke (опционально, но полезно)**

Пока всё ещё залогинен (`auth.signOut()` ещё не вызывалась), открыть `/` во второй вкладке. Вторая вкладка должна показать `<UserMenu>` залогиненым (auth state восстановлен из localStorage). Оставить вкладку открытой — продолжим в Step 7.6.

- [ ] **Step 7.6: Verify sign-out (single tab + cross-tab effect)**

В первой вкладке — клик на своё имя → dropdown → «Выйти». Состояние должно перейти `authenticated → loading → guest`. В Header первой вкладки появится «Войти».

Во второй вкладке (из Step 7.5) состояние **может** не флипнуться сразу — зависит от того, слушает ли wrapper `storage` event. Проверь: после reload вторая вкладка показывает `guest`. **Не блокер** для merge — типовое UX-ограничение localStorage-flow без cross-tab broadcasts.

- [ ] **Step 7.7: Hard-reload и verify persistence**

`Cmd+Shift+R` (или равноценный). Страница перезагрузится. Поскольку мы вышли в Step 7.6 — должна снова показать «Войти». Если не вышел перед reload — должен остаться залогиненым (token в localStorage).

- [ ] **Step 7.8: Если smoke fails — diagnose**

Возможные проблемы:

| Симптом | Причина | Fix |
| --- | --- | --- |
| Клик «Войти через GitHub» ничего не делает / console error | Context не установлен → `useAuth()` падает | Проверить порядок в `+layout.svelte`: `setupConvexAuth` ДО `createAuthStore` |
| Redirect на GitHub есть, после callback'а browser возвращается, но `users` пуста | `createOrUpdateUserHandler` failure | `npx convex logs` за последнюю минуту |
| Юзер в `users` есть, но Header показывает «Войти» | Token не сохраняется или `useAuth` не реактивен | Проверить, что `setupConvexAuth({ client: convex })` использует наш singleton; storage default = localStorage, должен сохранить |
| `loading` бесконечно | viewer query не разрешается (auth-token не передаётся в Convex client) | Проверить `convex` client получает token через `setAuth` (это делает wrapper); если нет — wrapper bug, эскалировать |

**Если smoke не идёт за разумное время** (15-30 мин diagnose) — **остановиться** (НЕ продолжать к Task 8) и escalate user'у. Done criteria требует green smoke; merge без него не делаем. Эскалация может означать: (a) баг в `convex-auth-svelte` для нашей версии — pinning другой, (b) GitHub OAuth App misconfig — перепроверить callback URL точно, (c) Convex env vars лежат не там, где должно быть — `npx convex env list` cross-check.

- [ ] **Step 7.9: No commit — это verification, не code**

```bash
git status --porcelain    # должно быть пусто (никаких локальных правок)
```

Записать в локальный заметник:
- Smoke прошёл / не прошёл, на каком шаге упало.
- Тестовый юзер в `users` таблице (можешь почистить через dashboard или оставить как seed).

---

## Task 8: Удалить `/dev` страницу + CLAUDE.md update + финал

**Files:**
- Delete: `src/routes/dev/+page.svelte`
- Modify: `CLAUDE.md`

**Цель:** окончательная зачистка Phase 1 диагностики (`/dev`) + документация финального UI flow + merge в master.

- [ ] **Step 8.1: Удалить `/dev`**

```bash
rm -rf src/routes/dev
```

(`rm -rf` гарантированно убирает директорию + всё внутри, включая возможные `.DS_Store` от macOS Finder.)

- [ ] **Step 8.2: Обновить CLAUDE.md секцию Convex backend**

Найти строку про `/dev` (она была добавлена в Phase 1 Task 7, упоминает диагностику). Удалить эту строку или заменить на:

```markdown
**Диагностика:** в Phase 1/2 была `/dev` страница (`health:ping/tick`); удалена в Phase 3, реальный sign-in теперь главный smoke entry point.
```

Также добавить новую подсекцию **«Auth UI»** в Convex backend секции — **перед блоком «Тесты — vitest projects split»** (это даёт логическую последовательность: backend → frontend wiring → tests).

```markdown

**Auth UI (Phase 3).** Клиентский flow строится на `@mmailaender/convex-auth-svelte` (community wrapper над `@convex-dev/auth`):
- `src/routes/+layout.svelte` — `setupConvexAuth({ client: convex, convexUrl: PUBLIC_CONVEX_URL })` + создаёт `authStore` через `createAuthStore()`, ставит в context `'auth'`.
- `src/lib/auth/auth-store.svelte.ts` — wrapper над `useAuth()` + `api.users.viewer` query. Сводит 3-state `AuthState`: `{ status: 'loading' \| 'authenticated' \| 'guest' }`. Loading удерживается до получения user-документа.
- `src/components/auth/SignInScreen.svelte` — экран входа на маршруте `/signin`.
- `src/components/auth/UserMenu.svelte` — компактный UI текущего юзера в Header (loading/guest/authenticated состояния).
- Контракт-токены: `SIGN_IN_SCREEN_CONTRACT` + `USER_MENU_CONTRACT` агрегированы в `THEME_CONTRACT`.
- Тесты: `auth-state.test.ts` покрывает `computeAuthState` pure-функцию (state derivation). Компоненты — Storybook stories.
```

- [ ] **Step 8.3: `make check-all`**

```bash
make check-all
```

Zero errors. Удаление `/dev` — не должно повлиять.

- [ ] **Step 8.4: Финальная сверка коммитов ветки**

```bash
git log master..feat/auth-ui --oneline
git diff master..feat/auth-ui --stat
```

Ожидаемо: **7 коммитов** (Task 1, 2, 3, 4, 5, 6, 8 — Task 7 без коммита).

- [ ] **Step 8.5: Divergence check + merge**

```bash
git remote get-url origin >/dev/null 2>&1 && \
  (git fetch origin || echo 'WARN: fetch failed')
git rev-parse origin/master 2>/dev/null && {
  git log master..origin/master --oneline
  git log origin/master..master --oneline
} || echo "No origin/master yet — skipping"

git switch master
git merge --no-ff feat/auth-ui -m "$(cat <<'EOF'
feat(auth-ui): add authentication UI with GitHub sign-in flow

Phase 3 of docs/plans/auth.md. Wires the client-side auth flow:

- Install @mmailaender/convex-auth-svelte (community wrapper over @convex-dev/auth)
- Bootstrap setupConvexAuth in +layout.svelte (passes singleton ConvexClient)
- Add auth-store.svelte.ts: runes-store composing useAuth() + viewer query into
  3-state AuthState (loading/authenticated/guest); pure computeAuthState helper
  unit-tested
- Add SignInScreen component with GitHub sign-in button + provider=account disclaimer
- Add UserMenu component (3-state: loading skeleton / guest link / authenticated
  with sign-out dropdown), hosted in Header
- Add /signin route hosting SignInScreen
- Extend THEME_CONTRACT with SignInScreen + UserMenu tokens (across 4 themes)
- Storybook stories for both components

Removes /dev diagnostic page (Phase 1/2 leftover); real sign-in flow is now the
smoke entry point. Browser-smoke deferred from Phase 2 completes here.
EOF
)"
```

- [ ] **Step 8.6: Post-merge `make check-all`**

```bash
make check-all
```

Zero errors. Если падает → `git reset --hard ORIG_HEAD`.

- [ ] **Step 8.7: Удалить ветку**

```bash
git branch -d feat/auth-ui
```

---

## Done criteria (перед merge в master)

- [ ] `make check-all` зелёный (lint + check + test + spell + build)
- [ ] Все 6 новых unit-тестов проходят (`computeAuthState` state derivation)
- [ ] Storybook отображает 3 состояния `UserMenu` + дефолтное состояние `SignInScreen` (визуально, локально)
- [ ] Все 4 темы задекларировали SignInScreen + UserMenu токены (contract-тест зелёный)
- [ ] Browser smoke (Step 7.3) прошёл: реальный GitHub sign-in → юзер в `users` → имя в Header → sign-out возвращает в `guest`
- [ ] `/dev` страница удалена (директория тоже)
- [ ] CLAUDE.md содержит Auth UI секцию

## Rollback plan

Если post-merge `make check-all` упал — `git reset --hard ORIG_HEAD` сразу.

**Side effects:**
- Cloud Convex deployment — никаких изменений (Phase 3 чисто frontend).
- localStorage у юзера может содержать auth tokens — очистится сам при clear cache, или manually через DevTools → Application → Local Storage.
- Тестовые юзеры в `users` таблице после smoke — можно почистить через `npx convex dashboard` или оставить.

## What's captured for Phase 4

После Phase 3 у тебя:
- **Working sign-in flow** через GitHub. Phase 4 (Google провайдер) переиспользует тот же flow — только надо добавить Google в `convex/auth.ts` providers array + новую кнопку в SignInScreen.
- **`authStore` стабильный контракт** — Phase 4 не нужно его править. Просто добавится альтернативный entry point в signIn.
- **Архитектурное правило 4** (нет `*.server.ts`) — Phase 3 не нарушила. SSR не используется. Phase 4 не должна нарушать тоже.
- **Phase 4 точки расширения** (фиксируем явно):
  - `convex/auth.ts` — `providers: [GitHub, Google]`, без других изменений в callback'е.
  - `SignInScreen.svelte` — рефактор `handleGithubSignIn` → `handleSignIn(provider: 'github' | 'google')`. Кнопка GitHub становится одной из двух.
  - `SignInScreen.contract.ts` — добавится 4 новых токена `--sign-in-screen-btn-google-*`. По 1 строке в каждой из 4 тем = 16 деклараций.
  - Объём Phase 4: ~1 backend файл + 1 svelte + 1 contract + 5 css = меньше Phase 3.

---

## Self-review notes

1. **Spec coverage vs umbrella Phase 3:**
   - `auth-store.svelte.ts` ✓ Task 3
   - `auth-client.ts` — **умысленно не делаем** (отдельный файл): прямой `useAuth()` в компонентах + тонкая обёртка в `auth-store.svelte.ts` достаточны для нашего сценария. Если когда-нибудь понадобится — добавится.
   - `auth.types.ts` ✓ Task 1
   - `SignInScreen.svelte` ✓ Task 4
   - `UserMenu.svelte` ✓ Task 5
   - `/signin` route ✓ Task 6
   - `+layout.svelte` обновление ✓ Tasks 2 + 6
   - `Header.svelte` обновление ✓ Task 6
   - Удаление `/dev` ✓ Task 8

2. **Placeholder scan:**
   - Все code blocks полные.
   - Цветовые значения в темах — Implementer'у даны примеры + свобода в значениях; контракт-тест enforce'ит наличие.
   - Storybook stories для UserMenu mock'ают context — корректно.
   - Step 7 (browser smoke) — это manual verification, не code, без commit'а. Помечено.

3. **Type consistency:**
   - `AuthState`/`User` — везде из `@/lib/auth/auth.types`.
   - `computeAuthState` — экспортирован из `auth-state.ts` (pure helper, без Convex-зависимостей); импортирован в `auth-state.test.ts` И в `auth-store.svelte.ts` (через `./auth-state` relative path).
   - `getContext<AuthStore>('auth')` — соответствует `setContext('auth', authStore)` в layout.

4. **Известные риски:**
   - `@mmailaender/convex-auth-svelte` — community-maintained. Если API сломается на major bump — фиксить руками или пиннуть. Сейчас не пиннуем (`^` default).
   - `auth-store.svelte.ts` runes внутри `.ts` файла — поддерживается через `.svelte.ts` extension. Edge cases (test runner runes support) обойдены split'ом — `computeAuthState` живёт в `auth-state.ts` без runes; тесты вообще не загружают runes-файл.
   - Browser smoke в Step 7.3 — единственный шаг, который зависит от внешних факторов (GitHub OAuth, network). Если flow упадёт по сети — диагноз через `npx convex logs`.
