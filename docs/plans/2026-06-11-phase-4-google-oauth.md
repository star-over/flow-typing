# Phase 4: Google OAuth Provider — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить Google как второй OAuth-провайдер. На `/signin` появляется вторая кнопка «Войти через Google». Backend, фронт-кнопка, темы. Сохранить инвариант «провайдер = аккаунт» (отдельные `users`-строки для одного email при входе через два разных провайдера) — этот инвариант защищается существующим `createOrUpdateUserHandler` без правок.

**Architecture:** Минимальная фаза. Бэкенд — `import Google from '@auth/core/providers/google'` + добавление в `providers` array. UI — рефакторинг `handleGithubSignIn` → `handleSignIn(provider)` + вторая кнопка в `SignInScreen.svelte`. Темы — 4 новых токена `--sign-in-screen-btn-google-{background,color,border,hover-background}` × 4 темы + `_template.css`. `authStore` уже provider-agnostic (`signIn(provider: string)`), правки не нужны.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes) · Convex Auth (`@convex-dev/auth@~0.0.94`) · `@auth/core@~0.41.2` (Google provider встроен) · `@mmailaender/convex-auth-svelte@~0.1.3` · TypeScript strict.

> **Стек в одном предложении:** `@auth/core` — Auth.js — каталог OAuth-провайдеров. `@convex-dev/auth` — Convex-компонент, который запускает Auth.js callbacks на backend'е и хранит сессии в Convex DB. `@mmailaender/convex-auth-svelte` — community Svelte-обёртка, которая bridge'ит Convex client с Auth.js state (PKCE, token refresh) на фронте. Phase 4 трогает только первый пакет (добавляет Google провайдер), остальные два — наследие Phase 2/3 и не правятся.

---

## Starting state (после Phase 3 + cleanup)

- **Master HEAD:** `4fa23ce` (Phase 3 merge + post-merge minor findings cleanup)
- **Backend:** `convex/auth.ts` — GitHub-провайдер, `createOrUpdateUserHandler` (provider-agnostic, тестируется в `convex/auth.test.ts`)
- **Frontend:** `SignInScreen.svelte` — единственная кнопка GitHub, уже имеет `signingIn` с `finally`-reset под Google popup-flow
- **Auth store:** `createAuthStore()` экспортирует `signIn(provider: string)` — без правок переиспользуется для Google
- **Layout:** `src/routes/+layout.svelte` — reactive `$effect` re-wires `convex.setAuth(auth.fetchAccessToken)` при изменении `auth.token` (ищи блок с комментарием «Work around convex-auth-svelte: wrapper calls client.setAuth(...) only ONCE»). **Это защищает и Google flow тоже** (race на post-OAuth PKCE exchange не provider-specific).
- **Storybook:** `StorybookAuthFrame.svelte` — wrapper для stories с заглушкой `'auth'` context'а. `signIn: (_provider: string) => Promise.resolve()` уже принимает любой провайдер.
- **Themes:** 4 темы (`light/dark/sepia/nord`) + `_template.css` декларируют 7 SignInScreen-токенов (`--sign-in-screen-{background,title-color,disclaimer-color,btn-github-{background,color,border,hover-background}}`).
- **THEME_CONTRACT** (`src/themes/contract.ts:32-50`) агрегирует 17 component-контрактов; `SIGN_IN_SCREEN_CONTRACT` — один из них.
- **CLAUDE.md** содержит «Текущий провайдер: GitHub. Google в Phase 4, …» — Phase 4 переписывает это.
- **Convex env:** `AUTH_GITHUB_ID/SECRET`, `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS` уже set. Phase 4 добавляет `AUTH_GOOGLE_ID/SECRET`.

## Phase 4 deliverables

- `convex/auth.ts` — `import Google from '@auth/core/providers/google'` + `providers: [GitHub, Google]`
- `src/components/auth/SignInScreen.svelte` — `handleSignIn(provider)` + вторая кнопка с провайдер-специфическим CSS-классом
- `src/components/auth/SignInScreen.contract.ts` — +4 токена для Google-кнопки
- `src/themes/_template.css` — +4 строки (Google токены как `unset`)
- `src/themes/{light,dark,sepia,nord}.css` — +4 строки в каждой теме с заполненными значениями
- `src/themes/contract.ts` — без правок (SIGN_IN_SCREEN_CONTRACT расширяется, агрегатор spread'ит автоматически)
- `src/components/auth/SignInScreen.stories.svelte` — без правок (Story рендерит компонент целиком; обе кнопки отрисуются автоматически)
- `CLAUDE.md` — обновить список провайдеров (GitHub + Google), `Add new OAuth provider` остаётся как есть (инструкция универсальная)
- **Browser smoke** — Task 5: Google sign-in работает + «провайдер = аккаунт» инвариант подтверждён (одинаковый email через GitHub и Google → две разные `users`-строки)

## Зафиксированные решения

- **Theme tokens: реплицируем GitHub-паттерн.** 4 новых per-provider токена (`--sign-in-screen-btn-google-{background,color,border,hover-background}`). Никакого refactor'а в base + provider-variants. Это решение пользователя (см. контекст плана) — цена: линейный рост на каждом следующем провайдере (Yandex/Apple — Phase 8/9), bonus: zero риска регрессий в Phase 4.
- **Google Cloud Console setup — часть Pre-flight.** OAuth Client ещё не зарегистрирован.
- **Без логотипов в кнопках.** «Войти через Google» — текст-only, как «Войти через GitHub». Брендовые SVG-иконки — отдельная задача (если пользователь захочет — отдельный mini-PR после Phase 4).
- **Без расширения `convex/auth.test.ts`.** `createOrUpdateUserHandler` уже тестируется (Phase 2 Task 4); логика provider-agnostic. Добавление Google в `providers` array не меняет вход в handler. Если бы handler нужно было правки — добавили бы тест; здесь не нужны.
- **Storybook story остаётся `Default`.** Одна story на компонент, рендерит обе кнопки. Дополнительные stories (e.g. «Loading github», «Loading google») не нужны — компонент держит локальный `signingIn` flag без provider-specific state.
- **Reactive setAuth workaround в layout — не трогаем.** Phase 3 race-fix защищает Google flow тоже (re-wire не provider-specific). См. блок `$effect(() => { if (auth.token) convex.setAuth(...) })` в `src/routes/+layout.svelte` и комментарий выше блока.

## File Structure

```
convex/
└── auth.ts                                         # MODIFY: + import Google, + Google в providers

src/
├── components/
│   └── auth/
│       ├── SignInScreen.svelte                     # MODIFY: handleSignIn(provider) + 2 кнопки
│       ├── SignInScreen.contract.ts                # MODIFY: + 4 Google tokens
│       └── SignInScreen.stories.svelte             # UNTOUCHED (story рендерит компонент целиком)
└── themes/
    ├── _template.css                               # MODIFY: + 4 Google токенов как `unset`
    ├── light.css                                   # MODIFY: + 4 строки c oklch значениями
    ├── dark.css                                    # MODIFY: + 4 строки
    ├── sepia.css                                   # MODIFY: + 4 строки
    └── nord.css                                    # MODIFY: + 4 строки

CLAUDE.md                                           # MODIFY: список провайдеров → GitHub + Google
```

**Untouched (с обоснованиями):**
- `convex/users.ts` — `viewer` query orthogonal к провайдеру.
- `convex/auth.config.ts`, `convex/http.ts`, `convex/schema.ts` — provider whitelist / HTTP routes / schema не меняются.
- `convex/auth.test.ts` — handler провайдер-agnostic, новых веток не добавляется.
- `src/lib/auth/auth-store.svelte.ts` — `signIn(provider: string)` уже provider-agnostic.
- `src/lib/auth/auth-state.ts`, `auth.types.ts` — типы не зависят от провайдера.
- `src/components/auth/UserMenu.svelte` — UI отображения юзера, провайдер не виден.
- `src/components/auth/StorybookAuthFrame.svelte` — `signIn: (_provider: string)` уже принимает что угодно.
- `src/routes/+layout.svelte` — race-fix защищает Google тоже, никаких правок.
- `src/themes/contract.ts` — агрегатор spread'ит `SIGN_IN_SCREEN_CONTRACT`; расширение контракта попадёт в `THEME_CONTRACT` без явных правок этого файла.
- `cspell.json` — `oauth/OAuth` уже whitelisted; `google` — английское слово.

---

## Pre-flight Checks

**Требования.** Перед стартом убедись, что у тебя есть:
- Рабочий **Google account** — нужен и для регистрации OAuth Client в Google Cloud Console, и для smoke-теста в Task 5 (`signIn('google')`). Если основного нет — заведи отдельный test Gmail на 5 минут.
- Доступ к Convex deployment `wandering-ocelot-9` (Phase 1/2/3 уже настроены — `.env.local` должен содержать `CONVEX_DEPLOYMENT` и `PUBLIC_CONVEX_URL`).
- ~30-45 минут непрерывного времени (Task 2 и Task 3 — атомарная пара, не разрывай).

- [ ] **Чистый `master`:**

```bash
git status --porcelain          # пусто
git log -1 --oneline            # ожидаемо: Phase 3 cleanup (4fa23ce). Если master уехал — проверь
                                # git log --since='2026-06-11' --name-only — не должно быть свежих
                                # правок в convex/auth.ts, SignInScreen.svelte или темах
git switch master
git switch feat/auth-google-provider 2>/dev/null || git switch -C feat/auth-google-provider
```

> **Resume support.** Если ветка `feat/auth-google-provider` уже существует (второй заход после прерывания) — `git switch` без `-C` подхватит существующее состояние, не уничтожив частичную работу. `-C` (force) запасной путь для свежего старта. Чтобы понять, на каком Task'е остановился — `git log master..HEAD --oneline` покажет уже законченные задачи (commit-messages привязаны к task'ам).

- [ ] **Watcher в отдельном терминале** (Makefile — единая точка входа, см. CLAUDE.md «Commands»):

```bash
make convex
```

Должен подключиться к `wandering-ocelot-9.eu-west-1.convex.cloud`. Оставить running на всё время Phase 4 — codegen в `convex/_generated/` нужен для type-check.

- [ ] **Google Cloud OAuth Client — регистрация (одноразовая, organizational, ~15 мин)**

Если уже есть Google Cloud аккаунт — пропусти создание; если нет — `console.cloud.google.com` → Sign in (любой Google account).

1. **Создать project** (или выбрать существующий): top-bar project selector → New Project → name e.g. `FlowTyping dev` → Create.
2. **OAuth consent screen:**
   - Side menu → APIs & Services → OAuth consent screen
   - User Type: **External** → Create
   - App name: `FlowTyping (dev)`, User support email: твой email, Developer contact: твой email → Save and Continue
   - Scopes: оставить дефолт (email, profile, openid) → Save and Continue
   - Test users: **Add Users** → твой email (это критично — пока app в Testing mode, только whitelisted юзеры могут логиниться) → Save and Continue
   - Summary → Back to Dashboard
   - **Не нажимай «Publish App» в OAuth consent screen UI.** Testing mode — правильное состояние для dev deployment. Production требует Google verification (~недели). Если случайно нажал → «Back to Testing» в том же UI.
3. **OAuth Client ID:**
   - Side menu → APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Name: `FlowTyping (dev) web`
   - **Authorized redirect URI:** ровно `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/google` (это backend `.convex.site` URL, не frontend!)
   - Create
4. **Скопировать Client ID и Client Secret** из модального окна (Client Secret больше нигде не показывается; если потерял — придётся пересоздать).

- [ ] **Прописать credentials в Convex env (zsh-friendly):**

Сначала проверь, не выставлены ли уже (idempotent на втором заходе после прерывания):

```bash
npx convex env list | grep AUTH_GOOGLE
```

Если обе строки есть и outputs не пустые — skip этот блок, переходи к «Verify env». Иначе:

```bash
# ID — не секрет, обычная переменная:
npx convex env set AUTH_GOOGLE_ID '<paste Client ID here>'

# Secret — через zsh read с тихим input'ом + trap для guaranteed cleanup:
read -s "?AUTH_GOOGLE_SECRET: " GOOGLE_SECRET && echo
trap 'unset GOOGLE_SECRET' EXIT INT TERM
npx convex env set AUTH_GOOGLE_SECRET "$GOOGLE_SECRET"
unset GOOGLE_SECRET
trap - EXIT INT TERM
```

`read -s "?..."` — zsh-pattern для тихого ввода с inline-промптом. `-p` в zsh не работает как в bash (см. handoff). `trap 'unset ...' EXIT INT TERM` гарантирует чистку переменной даже при Ctrl-C или ошибке `npx convex env set` (network blip, expired auth). Echo после `read` — для перевода строки в терминале.

**Если `npx convex env set` упал**: secret уже почищен trap'ом, но **не зарегистрирован**. Получи secret заново из Google Cloud Console (Credentials → OAuth Client) — он показывается один раз при создании. Если ты его потерял — Reset secret в той же UI.

- [ ] **Verify env:**

```bash
npx convex env list | grep AUTH_GOOGLE
```

Ожидаемо: две строки — `AUTH_GOOGLE_ID` и `AUTH_GOOGLE_SECRET` (значения замаскированы или показаны — Convex CLI поведение).

- [ ] **Сверить SITE_URL не сбросился:**

```bash
npx convex env list | grep SITE_URL
```

Ожидаемо: `SITE_URL=http://localhost:5173`. Если пусто — добавить: `npx convex env set SITE_URL http://localhost:5173`.

---

## Task 1: Add Google provider в `convex/auth.ts`

**Files:**
- Modify: `convex/auth.ts`

**Цель:** Convex Auth backend знает про Google. После Task 1 любой клиентский `signIn('google')` начнёт OAuth flow → callback на `.convex.site/api/auth/callback/google` → `createOrUpdateUserHandler` → новая `users` запись. Сам клиент ещё не использует — это Task 2.

- [ ] **Step 1.1: Прочитать текущий `convex/auth.ts`**

```bash
cat convex/auth.ts
```

Запомнить структуру: импорт `GitHub from '@auth/core/providers/github'`, `providers: [GitHub]`, callback `createOrUpdateUser`. Phase 4 добавляет один import + расширяет array.

- [ ] **Step 1.2: Добавить импорт и Google в providers**

Открой `convex/auth.ts` и сделай ровно две правки:

**A.** Сразу после строки `import GitHub from '@auth/core/providers/github';` добавь:

```ts
import Google from '@auth/core/providers/google';
```

**B.** В блоке `convexAuth({ providers: [GitHub], ... })` замени `[GitHub]` на `[GitHub, Google]`:

```ts
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub, Google],
  callbacks: {
    // Передаём в helper только нужные поля, чтобы изолировать тесты от
    // полного callback args shape (`type`, `provider`, `shouldLink` и т.д. — не используем).
    createOrUpdateUser: (ctx, { existingUserId, profile }) =>
      createOrUpdateUserHandler({ ctx, existingUserId, profile }),
  },
});
```

Других правок в файле нет. `createOrUpdateUserHandler` остаётся как есть — он провайдер-agnostic.

- [ ] **Step 1.3: Verify watcher подхватил изменения**

В терминале с `make convex` watcher должен напечатать что-то вроде:

```
Convex functions ready! (XXXms)
```

Что значат разные сигналы:
- Просто «functions ready» (с любым timing'ом) — успех, двигайся дальше.
- Строки с `warning` / `warn` / `[WARN]` — обычно устаревания, не препятствие. Игнорируй.
- Строки с `error` / `Error` / `Failed` / `Type 'Google' is not assignable` — **стоп**. Конфликт версий `@auth/core` или import-typo. Разбирайся (проверь буквы в `from '@auth/core/providers/google'` — нижний регистр), затем перезапусти watcher.
- Watcher молчит после save'а — `Ctrl+C` и `make convex` заново, иногда watcher теряет file-watch на macOS после некоторого времени.

- [ ] **Step 1.4: `make check` + `make test`**

```bash
make check && make test 2>&1 | tail -10
```

Zero errors. Тесты остаются зелёными — `createOrUpdateUserHandler` провайдер-agnostic, Google в `providers` array не меняет ни одной существующей ветки логики.

- [ ] **Step 1.5: Commit**

```bash
git status --short              # проверь не появилось ли лишних файлов
git add convex/auth.ts
# Если git status показывает изменения в convex/_generated/api.* — добавь их в commit:
# git add convex/_generated/
git commit -m "feat(auth): add Google OAuth provider to Convex Auth backend"
```

`convex/_generated/` отслеживается в git (см. `git ls-files convex/_generated/`). Convex watcher регенерирует эти файлы при правке `convex/*.ts`; обычно для добавления одного провайдера regen не нужен (тип-сигнатуры не меняются), но если `git status` показывает diff — это нормально, закоммитить с основной правкой.

---

## Task 2: Refactor `SignInScreen.svelte` — `handleSignIn(provider)` + Google кнопка

**Files:**
- Modify: `src/components/auth/SignInScreen.svelte`

**Цель:** обобщить handler от `handleGithubSignIn` к `handleSignIn(provider: 'github' | 'google')` + добавить вторую кнопку. После Task 2 (но до Task 3) Google-кнопка работает функционально, но CSS-токенов нет — стиль будет «голый» (fallback'и). Это OK для атомарного коммита — Task 3 заполняет токены.

- [ ] **Step 2.1: Прочитать текущий компонент**

```bash
cat src/components/auth/SignInScreen.svelte
```

Сейчас в `<script>` — единственный `handleGithubSignIn`. В template — одна кнопка с классом `sign-in-screen__btn-github`. В `<style>` — блок `.sign-in-screen__btn-github` + `:hover` + `:disabled`. Phase 4 добавляет параллельный набор для Google.

- [ ] **Step 2.2: Заменить handler и template**

Открой `src/components/auth/SignInScreen.svelte`. Замени блок:

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  const auth = getContext<AuthStore>('auth');
  let error: string | null = $state(null);
  let signingIn: boolean = $state(false);

  async function handleGithubSignIn() {
    error = null;
    signingIn = true;
    try {
      await auth.signIn('github');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      // Reset even on success path: для OAuth providers с popup-flow (Google в Phase 4)
      // promise resolves без redirect'а — без finally кнопка зависнет в "Перенаправление…".
      // Для GitHub redirect-flow это безопасный no-op (страница уже размонтирована).
      signingIn = false;
    }
  }
</script>
```

на:

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  type OAuthProviderId = 'github' | 'google';

  const auth = getContext<AuthStore>('auth');
  let error: string | null = $state(null);
  let signingIn: boolean = $state(false);

  async function handleSignIn(provider: OAuthProviderId) {
    error = null;
    signingIn = true;
    try {
      await auth.signIn(provider);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      // Reset even on success path: для OAuth providers с popup-flow (Google)
      // promise resolves без redirect'а — без finally кнопка зависнет в "Перенаправление…".
      // Для GitHub redirect-flow это безопасный no-op (страница уже размонтирована).
      signingIn = false;
    }
  }
</script>
```

> **Naming:** `OAuthProviderId` (а не `Provider`) следует project-паттерну `<Domain>Id` (`PhysicalLayoutId`, `FingerLayoutId`, `SymbolLayoutId`) — см. `docs/02-naming-conventions.md`. Локально в компоненте; экстракт в `src/lib/auth/auth.types.ts` отложим до Phase 8 (Yandex), когда появится третий потребитель типа.

Затем замени блок кнопки GitHub в template:

```svelte
  <button
    type="button"
    class="sign-in-screen__btn-github"
    disabled={signingIn}
    onclick={handleGithubSignIn}
  >
    {signingIn ? 'Перенаправление…' : 'Войти через GitHub'}
  </button>
```

на две кнопки подряд (Google ниже GitHub):

```svelte
  <button
    type="button"
    class="sign-in-screen__btn-github"
    disabled={signingIn}
    onclick={() => handleSignIn('github')}
  >
    {signingIn ? 'Перенаправление…' : 'Войти через GitHub'}
  </button>

  <button
    type="button"
    class="sign-in-screen__btn-google"
    disabled={signingIn}
    onclick={() => handleSignIn('google')}
  >
    {signingIn ? 'Перенаправление…' : 'Войти через Google'}
  </button>
```

`signingIn` — общий флаг для обеих кнопок (одновременно нажать всё равно нельзя — `disabled` отключает обе). `'Перенаправление…'` оставляем обобщённый тип-текст для обеих.

- [ ] **Step 2.3: Добавить стили для `.sign-in-screen__btn-google`**

В `<style>` блоке, **сразу после** существующего блока:

```css
  .sign-in-screen__btn-github:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
```

(но **перед** блоком `.sign-in-screen__error`), добавь параллельный набор для Google:

```css
  .sign-in-screen__btn-google {
    background: var(--sign-in-screen-btn-google-background);
    color: var(--sign-in-screen-btn-google-color);
    border: var(--sign-in-screen-btn-google-border);
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-sm, 0.25rem);
    cursor: pointer;
    font-size: 1rem;
  }

  .sign-in-screen__btn-google:hover {
    background: var(--sign-in-screen-btn-google-hover-background);
  }

  .sign-in-screen__btn-google:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
```

Padding/radius/cursor/font-size — идентичны GitHub, чтобы кнопки выглядели как пара. Различаются только background/color/border (через свои токены).

- [ ] **Step 2.4: `make check`**

```bash
make check 2>&1 | tail -3
```

Zero errors. Type check должен проверить, что `auth.signIn(provider)` принимает наш `OAuthProviderId` тип (он `signIn: (provider: string) => ...` — расширяющий, наш `'github' | 'google'` — subset).

- [ ] **Step 2.5: `make test`**

```bash
make test 2>&1 | tail -5
```

**Ожидаемо: всё зелёное.** Логика:
- `contract.test.ts` итерирует токены из `THEME_CONTRACT` → проверяет, что каждый объявлен в темах. Контракт мы пока НЕ расширяли (Task 3 это сделает), так что contract-тест не видит ничего нового.
- Компонент теперь ссылается на `var(--sign-in-screen-btn-google-*)`, которых в темах нет — но это **не валидируется тестами**. Браузер для unresolved CSS variable возвращает initial value (`unset`/inherited) — никаких ошибок, кнопка просто будет «голой» до Task 3.
- Component-level rendering tests на SignInScreen в Phase 3 не добавлялись (Storybook only).

Если красное — `--filter contract` для изоляции; fix перед Task 3.

- [ ] **Step 2.6: Commit**

```bash
git add src/components/auth/SignInScreen.svelte
git commit -m "feat(auth-ui): refactor SignInScreen handler to accept provider arg, add Google button"
```

> **Не разрывай работу здесь.** Этот commit намеренно оставляет компонент в промежуточном состоянии — Google-кнопка ссылается на CSS-переменные, которых в темах нет, поэтому в браузере выглядит «голой» (browser fallback на `unset` / inherited). Task 3 закрывает эту дыру. Если ветка bisect'нется на этом коммите — будет visual regression на `/signin`. Task 2 + Task 3 — атомарная пара; **не оставляй ветку на ночь между ними**.

---

## Task 3: Theme tokens — contract + `_template.css` + 4 темы

**Files:**
- Modify: `src/components/auth/SignInScreen.contract.ts`
- Modify: `src/themes/_template.css`
- Modify: `src/themes/light.css`
- Modify: `src/themes/dark.css`
- Modify: `src/themes/sepia.css`
- Modify: `src/themes/nord.css`

**Цель:** добавить 4 Google-токена в контракт и заполнить значения во всех темах. После Task 3 `make check-all` зелёный, Google-кнопка визуально консистентна в каждой теме. `src/themes/contract.ts` НЕ трогаем — он spread'ит `SIGN_IN_SCREEN_CONTRACT` (`...SIGN_IN_SCREEN_CONTRACT` уже в `THEME_CONTRACT`), расширение контракта попадёт в агрегат автоматически.

> **Не DRY эти токены.** Соблазн извлечь общий `--sign-in-screen-btn-base-*` и оставить только differing tokens per provider — **отказались** в «Зафиксированные решения» выше. Phase 4 явно реплицирует GitHub-паттерн как есть. Refactor отложен до момента, когда появится третий-четвёртый провайдер и cost репликации перевесит cost абстракции (Phase 8+). `_template.css` — скелет, enforce'имый contract-тестом, чтобы новые темы не пропускали токены; держим его в синхроне через простую append-операцию, без хитрых иерархий.

- [ ] **Step 3.1: Расширить `SIGN_IN_SCREEN_CONTRACT`**

Открой `src/components/auth/SignInScreen.contract.ts`. Замени array на:

```ts
export const SIGN_IN_SCREEN_CONTRACT = [
  '--sign-in-screen-background',             // background контейнера экрана
  '--sign-in-screen-title-color',            // color заголовка
  '--sign-in-screen-disclaimer-color',       // color текста предупреждения
  '--sign-in-screen-btn-github-background',  // background кнопки GitHub
  '--sign-in-screen-btn-github-color',       // color текста кнопки GitHub
  '--sign-in-screen-btn-github-border',      // border кнопки GitHub
  '--sign-in-screen-btn-github-hover-background', // background кнопки GitHub при hover
  '--sign-in-screen-btn-google-background',  // background кнопки Google
  '--sign-in-screen-btn-google-color',       // color текста кнопки Google
  '--sign-in-screen-btn-google-border',      // border кнопки Google
  '--sign-in-screen-btn-google-hover-background', // background кнопки Google при hover
] as const satisfies readonly `--${string}`[];
```

Header-комментарий `/** Theme contract for SignInScreen.svelte. ... */` оставь как есть; обнови описание: «SignInScreen — экран входа с кнопками **«Войти через GitHub»** и **«Войти через Google»** + предупреждением о привязке прогресса к провайдеру.»

- [ ] **Step 3.2: Запустить test → contract должен упасть (RED)**

```bash
make test 2>&1 | tail -15
```

Ожидаемо: contract-тест в `src/themes/contract.test.ts` падает с указанием, что в `_template.css` (и в каждой из 4 тем) отсутствуют `--sign-in-screen-btn-google-*` токены.

- [ ] **Step 3.3: Заполнить `_template.css`**

Открой `src/themes/_template.css`. Найди блок `/* SignInScreen */` (около строки 238):

```css
  /* SignInScreen */
  --sign-in-screen-background            : unset;
  --sign-in-screen-title-color           : unset;
  --sign-in-screen-disclaimer-color      : unset;
  --sign-in-screen-btn-github-background : unset;
  --sign-in-screen-btn-github-color      : unset;
  --sign-in-screen-btn-github-border     : unset;
  --sign-in-screen-btn-github-hover-background: unset;
```

Замени на (добавить 4 строки внизу):

```css
  /* SignInScreen */
  --sign-in-screen-background            : unset;
  --sign-in-screen-title-color           : unset;
  --sign-in-screen-disclaimer-color      : unset;
  --sign-in-screen-btn-github-background : unset;
  --sign-in-screen-btn-github-color      : unset;
  --sign-in-screen-btn-github-border     : unset;
  --sign-in-screen-btn-github-hover-background: unset;
  --sign-in-screen-btn-google-background : unset;
  --sign-in-screen-btn-google-color      : unset;
  --sign-in-screen-btn-google-border     : unset;
  --sign-in-screen-btn-google-hover-background: unset;
```

**Critical:** комментарий — `/* SignInScreen */` без двоеточия. Парсер contract-теста ломается на `/* === Auth: SignInScreen === */`-style комментариях с двоеточием (известный gotcha из Phase 3).

- [ ] **Step 3.4: Заполнить `light.css`**

Открой `src/themes/light.css`. Найди блок (около строки 294):

```css
  /* SignInScreen */
  --sign-in-screen-background            : oklch(96% 0.005 280);
  --sign-in-screen-title-color           : oklch(20% 0 0);
  --sign-in-screen-disclaimer-color      : oklch(40% 0 0);
  --sign-in-screen-btn-github-background : oklch(20% 0.02 280);
  --sign-in-screen-btn-github-color      : oklch(98% 0 0);
  --sign-in-screen-btn-github-border     : 1px solid oklch(15% 0.02 280);
  --sign-in-screen-btn-github-hover-background: oklch(30% 0.03 280);
```

Добавить 4 строки **сразу после** строки `--sign-in-screen-btn-github-hover-background: oklch(30% 0.03 280);` и **перед** комментарием `/* UserMenu */`:

```css
  --sign-in-screen-btn-google-background : oklch(98% 0 0);
  --sign-in-screen-btn-google-color      : oklch(20% 0 0);
  --sign-in-screen-btn-google-border     : 1px solid oklch(80% 0 0);
  --sign-in-screen-btn-google-hover-background: oklch(95% 0 0);
```

**Палитра:** Google-кнопка инверсная к GitHub (GitHub в light = тёмная заливка; Google = светлая с тонким рамкой). Это обычный паттерн «contained vs outlined» — позволяет визуально различить два провайдера, не вводя bright brand colors.

- [ ] **Step 3.5: Заполнить `dark.css`**

Найди блок `/* SignInScreen */` (около строки 293). После строки `--sign-in-screen-btn-github-hover-background: oklch(96% 0 0);` добавь:

```css
  --sign-in-screen-btn-google-background : oklch(28% 0.01 280);
  --sign-in-screen-btn-google-color      : oklch(95% 0 0);
  --sign-in-screen-btn-google-border     : 1px solid oklch(50% 0.01 280);
  --sign-in-screen-btn-google-hover-background: oklch(35% 0.01 280);
```

**Палитра:** в dark GitHub — почти white заливка (как «contained light»); Google — outlined-стилем (тёмный bg + светлая рамка) для разделения визуальной иерархии.

- [ ] **Step 3.6: Заполнить `sepia.css`**

Найди блок (около строки 284). После строки `--sign-in-screen-btn-github-hover-background: oklch(42% 0.05 60);` добавь:

```css
  --sign-in-screen-btn-google-background : oklch(92% 0.03 70);
  --sign-in-screen-btn-google-color      : oklch(32% 0.04 60);
  --sign-in-screen-btn-google-border     : 1px solid oklch(60% 0.05 65);
  --sign-in-screen-btn-google-hover-background: oklch(85% 0.04 70);
```

**Палитра:** sepia использует тёплые тоны; GitHub — глубокий тёмный (`32% 0.04 60`), Google — outlined-style на светлом sepia (`92% 0.03 70`) с рамкой в средней тёплой ноте.

- [ ] **Step 3.7: Заполнить `nord.css`**

Найди блок (около строки 285). После строки `--sign-in-screen-btn-github-hover-background: oklch(97% 0 0);` добавь:

```css
  --sign-in-screen-btn-google-background : oklch(45% 0.02 254);
  --sign-in-screen-btn-google-color      : oklch(95% 0.01 234);
  --sign-in-screen-btn-google-border     : 1px solid oklch(60% 0.02 254);
  --sign-in-screen-btn-google-hover-background: oklch(52% 0.02 254);
```

**Палитра:** nord — холодные синие. GitHub в nord — почти white заливка; Google — outlined средне-синий блок на холодном bg.

- [ ] **Step 3.8: Run test → GREEN**

```bash
make test 2>&1 | tail -10
```

Ожидаемо: contract-тест зелёный. Все 4 новых токена объявлены в `_template.css` и в каждой из 4 тем.

- [ ] **Step 3.9: `make check-all`**

```bash
make check-all 2>&1 | tail -10
```

Zero errors всеми инструментами (lint + check + test + spell + build). Если spell падает — скорее всего не упадёт (новых слов нет, только CSS-токены с известными корнями `google/background/color/border/hover`), но если упадёт — проверь конкретное слово против руководства в CLAUDE.md (опечатка → fix, калька → переписать, нормальный термин → whitelist).

- [ ] **Step 3.10: Commit**

```bash
git add src/components/auth/SignInScreen.contract.ts \
        src/themes/_template.css \
        src/themes/light.css \
        src/themes/dark.css \
        src/themes/sepia.css \
        src/themes/nord.css
git commit -m "feat(auth-ui): add Google button theme tokens across 4 themes"
```

---

## Task 4: Visual verification в Storybook

**Files:** ничего не меняется.

**Цель:** глазами увидеть, что Google-кнопка отрисовалась во всех 4 темах согласованно с GitHub. Это не automated test — это глаз-проверка дизайн-консистентности. Если выглядит плохо — вернуться в Task 3 и подкрутить значения oklch.

- [ ] **Step 4.1: Запустить Storybook**

```bash
make storybook
```

В отдельном терминале Storybook на `http://localhost:6006`.

- [ ] **Step 4.2: Открыть SignInScreen story**

В Storybook UI: `auth/SignInScreen → Default`. Должны быть видны:
- Заголовок «Войти в FlowTyping»
- Кнопка «Войти через GitHub» (стиль как в Phase 3)
- Кнопка «Войти через Google» (новая)
- Оговорка

- [ ] **Step 4.3: Переключать темы через Storybook toolbar**

В Storybook toolbar (верхняя панель canvas'а) есть theme switcher — paintbrush-icon (`globalTypes.theme` в `.storybook/preview.ts`). Клик по иконке → dropdown с пунктами `Auto (system) / light / dark / sepia / nord`. Decorator выставляет `document.documentElement.dataset.theme` синхронно с выбором, поэтому переключение мгновенное.

Пройти все 4 темы: `light → dark → sepia → nord`. На каждой:
- Обе кнопки видны и кликабельны (hover-state visible at minimum)
- Google не «провалена» (не сливается с фоном) и не «выпрыгивает» (не разорвана visual hierarchy)
- Дисциплина: Google-кнопка визуально «парная» к GitHub — не должна выглядеть как foreign component

- [ ] **Step 4.4: Если визуально плохо — итерация**

Если в какой-то теме выглядит плохо (например, sepia Google border сливается) — открой `src/themes/<theme>.css`, подкрути `oklch()`-значения. Просто `Cmd+S` — Storybook hot-reload'нет. Когда устроило — `Ctrl+C` Storybook, commit с правкой:

```bash
git add src/themes/<theme>.css
git commit -m "chore(themes): tune Google button colors in <theme>"
```

Если ничего не правил — без коммита, иди дальше.

- [ ] **Step 4.5: `Ctrl+C` Storybook**

---

## Task 5: Browser smoke E2E — Google sign-in + «провайдер = аккаунт» инвариант

**Files:** ничего не меняется.

**Цель:** проверить end-to-end, что Google-вход реально работает в браузере. Phase 4 main acceptance criterion. **Этот шаг — без коммита**, это verification.

> **Очень важно.** Phase 3 race-fix (`+layout.svelte:30-35`) защищает Google flow тоже, потому что re-wire на `auth.token` change не provider-specific. Если этот fix вдруг сломался (вернулся к Phase-3-pre-fix code) — Google login покажет тот же симптом «UserMenu вечный loading». См. Step 5.6 для диагностики.

- [ ] **Step 5.1: Запустить dev-сервер**

В терминале 3 (терминал 1 — watcher `make convex`; терминал 2 — рабочий шелл; терминал 3 был занят Storybook'ом в Task 4, освободился после Ctrl+C на Step 4.5):

```bash
make dev
```

Vite на `http://localhost:5173`.

> **Watcher liveness не влияет на OAuth callback.** Google перенаправляет на `wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/google` — это **cloud deployment endpoint**, который держит Convex infrastructure независимо от твоего локального watcher'а. Watcher нужен только для type-codegen (`convex/_generated/`). Если watcher умер между Task 1 и сейчас — `make check` и `make dev` работают на закэшированном `_generated/`, OAuth flow в браузере проходит как обычно. Если codegen стал устаревшим — перезапусти watcher.

- [ ] **Step 5.2: Cold start — clear localStorage**

В браузере открой DevTools → Application → Local Storage → `http://localhost:5173`. Удали всё.

**Альтернатива — Incognito:** `http://localhost:5173/signin` в Incognito mode даёт чистый FlowTyping-state, но в Google Step 5.3.5 придётся ввести Google credentials с нуля (Incognito не делит Google session с обычным окном). Это OK — ожидаемо, потеряет ~30 секунд.

- [ ] **Step 5.3: Sign in via Google**

> **Про flow:** Convex Auth + `@auth/core/providers/google` использует **redirect-flow** (не popup) — тот же путь что GitHub в Phase 3. Текущая вкладка уходит на `accounts.google.com`, после авторизации возвращается на `localhost:5173`. Комментарий в `SignInScreen.svelte` про «popup-flow (Google)» в `finally`-блоке — defensive forward-compatibility (если когда-нибудь wrapper переключится), не описание текущего поведения.

1. Открой `http://localhost:5173/signin`
2. Должен быть SignInScreen с двумя кнопками + оговорка
3. Клик «Войти через Google»
4. Браузер перенаправляет на `accounts.google.com/o/oauth2/v2/auth?...` (current tab — не popup)
5. Google показывает «Sign in to FlowTyping (dev)» — выбери свой Google-аккаунт (тот, который добавил в Test Users в Pre-flight). **Если несколько Google аккаунтов** — выбирай whitelisted, иначе Google вернёт `access_denied`.
6. Google warning «This app isn't verified» (потому что OAuth app в Testing mode) → Advanced → «Go to FlowTyping (dev) (unsafe)» (если интерфейс Google на русском: «Дополнительные настройки» → «Перейти на сайт FlowTyping (dev) (небезопасно)»). Это OK для dev, в production пройдёт verification
7. «FlowTyping (dev) wants access to your name, email, language preference» → Continue. **Если ты уже даровал согласие этому OAuth Client'у раньше** (второй заход после прерывания) — Google пропускает Шаги 6-7 автоматически. Это нормально.
8. Google перенаправляет на `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/google?code=...`
9. Convex обрабатывает callback → `createOrUpdateUserHandler` создаёт user → перенаправляет на `SITE_URL=http://localhost:5173/`
10. Фронт грузится, `setupConvexAuth` + reactive `setAuth` (layout) восстанавливают session
11. Header показывает `<UserMenu>` с твоим Google-именем

> **Если flow прерван** (закрыл вкладку Google до Шага 7, нажал browser-back): просто открой `http://localhost:5173/signin` заново. Компонент перемонтируется, обе кнопки активны. `signingIn=true` state на старой `/signin` instance не существует — после navigation он сброшен.

**PASS criterion:** Header показывает UserMenu с твоим Google-именем + в Convex dashboard в `users` появилась свежая строка (Step 5.4 это подтвердит).

**Если** на шаге 11 UserMenu в loading (`…`) — открой DevTools Console; смотри ошибки. Также Step 5.6 — diagnose табличка.

- [ ] **Step 5.4: Verify юзер в Convex `users`**

В отдельном tab:

```bash
npx convex dashboard
```

Открой таблицу `users` — найди свежую запись с твоим Google email + name. Запиши `_id` (нужен для Step 5.5).

- [ ] **Step 5.5: «Провайдер = аккаунт» инвариант — проверка**

Это **business-critical assertion** (umbrella plan: «Связывание аккаунтов — NO link-by-email»).

**Защита уровнем выше уже есть:** `convex/auth.test.ts` содержит unit-тест на `createOrUpdateUserHandler` который явно валидирует «один email через два разных `existingUserId=null`-вызова → две разные строки». Этот тест уже зелёный (Phase 2 baseline) и продолжит быть зелёным после Phase 4, потому что handler провайдер-agnostic. То есть **если `convex/auth.test.ts` зелёный — инвариант сохранён** независимо от того, удалось ли провести browser-level проверку.

Step 5.5 — это **доп. подтверждение через реальный браузер**, не единственная gate. Делай тот вариант, который доступен:

**Вариант А — реальный совпадающий email (предпочтительный, если есть)**
Условие: твой Google-аккаунт и твой GitHub-аккаунт имеют **одинаковый primary email** (часто у разработчиков на личных аккаунтах).
1. Sign out из текущей Google-сессии (клик на имя в Header → «Выйти») → Header показывает «Войти»
2. DevTools → Application → Cookies: проверить **обе** записи: `localhost:5173` И `wandering-ocelot-9.eu-west-1.convex.site` (convex-auth-svelte хранит state cookies на backend domain). Удалить всё на обоих. Затем Application → Local Storage → `localhost:5173` → Clear.
3. Sign in via GitHub на `/signin`. Если после OAuth flow ты сразу залогинен как Google-юзер (без выбора GitHub-account) — это может быть: (a) cookies на `.convex.site` остались, вернись к Шагу 2; (b) GitHub.com сам помнит тебя — открой `github.com` в той же вкладке и нажми Sign out; (c) refresh-token в `localStorage` не был почищен — DevTools → Application → Local Storage → Clear для `localhost:5173`.
4. Открой Convex dashboard → таблица `users`: должны быть **ДВЕ строки** с одним email, разными `_id`

**Вариант Б — опереться на unit-тест (полностью допустимая альтернатива)**
Не fallback по причине failure'а — это самостоятельный путь, который покрывает инвариант на уровне handler'а напрямую. Выбирай его если: нет совпадающего email между GitHub и Google; не хочется заводить test Gmail на одноразовую проверку; cookie hygiene в Варианте А не сходится за один заход. **Условие**: `make test` зелёный, в выводе явно видна группа `convex/auth.test.ts` → `createOrUpdateUserHandler — provider = account` → тест `does NOT link by email — same email through different provider yields two separate users` как passing. Это точное имя теста в `convex/auth.test.ts:44-61`. Он закрывает runtime-путь handler'а напрямую, что и есть корневая защита инварианта.

Если выбрал Вариант Б — **в Step 6.6 (merge commit message)** добавь финальную строку в HEREDOC перед `EOF`:
```
Browser-level cross-provider check skipped; covered by unit test
convex/auth.test.ts → "does NOT link by email — same email through
different provider yields two separate users".
```

> **Намеренно не предлагаем «временную mutation для смены email»** как третий вариант. Mutation без auth-check'а на cloud-reachable deployment = cross-user email-change backdoor (anyone with deployment URL + user `_id` может изменить email любого юзера). Окно exposure до cleanup-коммита неприемлемо. Unit-тест уже покрывает то же property без security риска.

**Что считать провалом проверки** (Вариант А): после Sign-in вторым провайдером в `users` остаётся **одна строка** (с email от первого провайдера) → handler делает link-by-email где не должен → **не merge'ить Phase 4**. Escalate: смотри `convex/auth.ts` (handler) и `convex/auth.test.ts` (тесты).

- [ ] **Step 5.6: Если smoke fails — diagnose**

| Симптом | Причина | Куда смотреть |
| --- | --- | --- |
| Кнопка Google не реагирует | Context не установлен → `useAuth()` падает | `+layout.svelte` порядок: `setupConvexAuth` → reactive `$effect` → `createAuthStore` |
| Google OAuth flow есть, callback вернулся, но `users` пуста | `createOrUpdateUserHandler` failure / Convex env missing | `npx convex logs` за последнюю минуту; `npx convex env list \| grep AUTH_GOOGLE` |
| Юзер в `users`, но UserMenu `loading` бесконечно | Race на post-OAuth setAuth — Phase 3 fix сломан или wrapper bug | Verify reactive `$effect` блок (`if (auth.token) convex.setAuth(...)`) в `src/routes/+layout.svelte` живой |
| Callback вернулся, но браузер на пустой странице / 404 после OAuth | `SITE_URL` не выставлен или указывает не туда | `npx convex env list \| grep SITE_URL` — должен быть `http://localhost:5173`. Если пусто/другое: `npx convex env set SITE_URL http://localhost:5173` |
| Google `redirect_uri_mismatch` | URI в Google Cloud Console !== Convex callback URL | Cloud Console → Credentials → OAuth Client → Authorized redirect URIs: должно быть **ровно** `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/google` |
| Google «access_denied» | Email не в Test Users | Cloud Console → OAuth consent screen → Test users → Add Users |
| Google «App has reached its user cap» (Testing mode) | В Testing mode лимит 100 test users — обычно никогда не достигается соло-разработчику | Cloud Console → Audience → проверить счётчик; если близко — почистить старых tests |
| «Провайдер = аккаунт» инвариант сломан в browser smoke | createOrUpdateUserHandler ловит existingUserId по email | `convex/auth.test.ts` тесты на handler должны быть зелёными. Если зелёные — баг где-то в wrapper'е, эскалировать. Если красные — баг в handler'е |

**Если smoke не идёт за разумное время** (30 мин diagnose) — **остановись** (НЕ продолжай к Task 6) и escalate user'у. Done criteria требует green smoke + green инвариант; merge без них не делаем.

- [ ] **Step 5.7: No commit — это verification**

```bash
git status --porcelain    # должно быть пусто (никаких локальных правок Task 5)
```

Тестовые юзеры в `users` (Google + GitHub) можешь почистить через dashboard или оставить как seed.

---

## Task 6: CLAUDE.md update + merge в master

**Files:**
- Modify: `CLAUDE.md`

**Цель:** обновить документацию (текущие провайдеры — GitHub + Google) + merge feature-branch'а.

- [ ] **Step 6.1: Найти и обновить упоминания провайдеров в CLAUDE.md**

Открой `CLAUDE.md`. Найди строку (около `:88`):

```
- Текущий провайдер: GitHub. Google в Phase 4, Yandex/Apple/SberID — Roadmap V2.
```

Замени на:

```
- Текущие провайдеры: GitHub, Google. Yandex/Apple/SberID — Roadmap V2.
```

(Множественное число «провайдеры», список через запятую. Phase 4 теперь — done deal, не «в Phase 4».)

- [ ] **Step 6.2: Обновить остальные места про провайдеров + контракт-счётчик**

```bash
grep -n "Google\|GitHub\|providers\|контрактов агрегируются" CLAUDE.md
```

Просмотри результат. Места, которые нужно обновить (line-numbers могут плыть после Step 6.1; ищи по тексту, не строке):

**A. Строка про «Один email через GitHub и Google»** — без правок (инвариант теперь подтверждён smoke Task 5; формулировка корректна).

**B. Строка «Add new OAuth provider: Import из `@auth/core/providers/<name>`...»** — без правок, инструкция универсальная, на Phase 4 фактически проверена на втором провайдере.

**C. Строка про `AUTH_GITHUB_ID, AUTH_GITHUB_SECRET`** — **обновить (required)**:

```
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` — credentials OAuth Apps (см. `Add new OAuth provider`).
```

Симметрия = меньше когнитивной нагрузки. Оставлять только GitHub после Phase 4 = docs↔code drift.

**D. Строка «Все 15 контрактов агрегируются в `src/themes/contract.ts → THEME_CONTRACT` (~90 токенов)»** — **обновить**.

Сначала получи точное число токенов (после Task 3 завершения) — самый надёжный способ:

```bash
# Каждый токен — отдельная строка вида `'--token-name',` в *.contract.ts:
grep -rh "^  '--" src/components src/Root.contract.ts | sort -u | wc -l
```

Запиши число (около 109 после Phase 4). Затем подставь его в текст замены:

```
Все 17 контрактов агрегируются в `src/themes/contract.ts → THEME_CONTRACT` (<число> токенов). Контракт-тест `src/themes/contract.test.ts` enforce-ит, что каждая тема (`src/themes/<id>.css`) и `_template.css` декларируют каждый токен; значения свободны.
```

(15 → 17 — pre-existing drift от Phase 3, который Phase 3 plan забыл починить. Phase 4 — естественный момент. Не угадывай число — используй вывод grep'а выше.)

Все правки идут в этот же `docs(auth)` коммит.

- [ ] **Step 6.3: `make check-all`**

```bash
make check-all 2>&1 | tail -10
```

Zero errors. Markdown lint (если есть в `make lint`) — должен пройти.

- [ ] **Step 6.4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(auth): update CLAUDE.md to reflect GitHub + Google as active providers; fix contract-count drift (15→17)"
```

- [ ] **Step 6.5: Финальная сверка коммитов ветки + secret-leak grep**

```bash
git log master..feat/auth-google-provider --oneline
git diff master..feat/auth-google-provider --stat
```

Ожидаемо: **4 коммита** (Task 1, 2, 3, 6). Task 4 — без коммита по умолчанию; Task 5 — без коммита (verification). Если ты делал в Task 4 tune-commit на oklch-значения — получится 5.

<!-- cSpell:ignore GOCSPX -->
**Secret-leak guard** — критическая последняя проверка перед merge. Pre-flight включал работу с Google OAuth Client Secret; если он случайно (через комментарий, debug-print, `.env.local`) попал в git — нужно остановиться:

```bash
# 1) Проверка по содержимому: GOCSPX-/GOCSPX_ префиксы + AUTH_GOOGLE_SECRET в любом виде:
git log -p master..feat/auth-google-provider | \
  grep -iE 'GOCSPX[-_]|AUTH_GOOGLE_SECRET\s*[=: ]' || echo "clean (content scan)"

# 2) Проверка по именам файлов: .env* никогда не должны попадать в diff:
git diff master..feat/auth-google-provider --name-only | grep -E '\.env(\.|$)' && echo "WARN: env file in diff!" || echo "clean (file scan)"
```

Google Client Secret имеет префикс `GOCSPX-` (с 2021); `AUTH_GOOGLE_SECRET\s*[=: ]` ловит dotenv-, YAML- и shell-style выгрузки. Файловый scan ловит `.env.local`, `.env.production` и т.д. — `.env*` в `.gitignore`, но если кто-то форс-добавил `-f` — поймаем здесь.

Если хоть один grep что-то нашёл — **НЕ merge'ить**: `git reset --hard master`, разобраться где утечка, переделать ветку. **Не пытайся «удалить из истории»** — Secret уже скомпрометирован: в Google Cloud Console → Credentials → OAuth Client → **Reset secret**, обновить `AUTH_GOOGLE_SECRET` в Convex env, заново.

- [ ] **Step 6.6: Divergence check + merge**

```bash
# Сверить, что origin/master не уехал вперёд (не должен — push не делался с Phase 1)
git remote get-url origin >/dev/null 2>&1 && \
  (git fetch origin 2>/dev/null || echo 'WARN: fetch failed')
git rev-parse origin/master 2>/dev/null && {
  git log master..origin/master --oneline
} || echo "No origin/master ahead — skipping"

git switch master
# Если merge даёт conflict (типично — кто-то другой правил CLAUDE.md):
#   git merge --abort
#   git switch feat/auth-google-provider
#   git rebase master            # resolve conflicts here
#   git switch master
#   git merge --no-ff feat/auth-google-provider ...
git merge --no-ff feat/auth-google-provider -m "$(cat <<'EOF'
feat(auth): add Google OAuth as second provider

Phase 4 of docs/plans/auth.md. Adds Google as a second OAuth provider
alongside GitHub:

- convex/auth.ts: import Google from @auth/core/providers/google,
  add to providers array. createOrUpdateUserHandler unchanged
  (provider-agnostic; "provider = account" invariant holds).
- SignInScreen.svelte: refactor handleGithubSignIn -> handleSignIn(provider),
  add second button "Войти через Google" with provider-specific CSS class.
- SignInScreen.contract.ts: +4 tokens for Google button
  (background/color/border/hover-background).
- Themes: declare and fill Google tokens across _template.css +
  light/dark/sepia/nord (4 lines per file).
- CLAUDE.md: reflect GitHub + Google as active providers; fix
  pre-existing contract-count drift (15→17, ~90→~95 tokens) inherited
  from Phase 3 plan oversight.

"provider = account" invariant remains intact (covered by
convex/auth.test.ts; cross-provider sign-in browser-checked where
feasible — see Task 5.5 for details).
EOF
)"
```

- [ ] **Step 6.7: Post-merge `make check-all`**

```bash
make check-all 2>&1 | tail -10
```

Zero errors. Если падает (хотя пред-merge был зелёный) — `git reset --hard ORIG_HEAD` сразу и разбираться.

- [ ] **Step 6.8: Удалить feature-ветку**

```bash
git branch -d feat/auth-google-provider
```

---

## Done criteria (перед merge в master)

- [ ] `make check-all` зелёный (lint + check + test + spell + build) — Task 3 и Task 6
- [ ] Все темы декларируют 4 новых Google-токена (`make test` → contract-тест зелёный)
- [ ] Storybook отображает обе кнопки во всех 4 темах согласовано (Task 4 — глаз-проверка)
- [ ] **Browser smoke** (Task 5): real Google sign-in работает end-to-end → юзер в `users` → имя в Header → sign-out возвращает в `guest`
- [ ] **«Провайдер = аккаунт» инвариант** (Task 5.5): подтверждён либо Вариантом А (browser: одинаковый email через GitHub и Google → две `users`-строки), либо Вариантом Б (unit-тест `convex/auth.test.ts` → `does NOT link by email — same email through different provider yields two separate users` зелёный)
- [ ] `CLAUDE.md` обновлён: GitHub + Google как активные провайдеры (Task 6)

## Rollback plan

**До merge** — `git switch master && git branch -D feat/auth-google-provider`. Удалит ветку. `AUTH_GOOGLE_ID/SECRET` в Convex env можешь почистить: `npx convex env remove AUTH_GOOGLE_ID && npx convex env remove AUTH_GOOGLE_SECRET`.

**После merge, если post-merge `make check-all` сломался** — `git reset --hard ORIG_HEAD` сразу. Состояние master возвращается в `4fa23ce`. Side effects:
- Cloud Convex deployment — Google provider **остаётся live на backend'е** (env vars + deployed `auth.ts` с `[GitHub, Google]`). Frontend rollback'нулся, поэтому `signIn('google')` никто не вызовет, но endpoint `/api/auth/callback/google` всё ещё принимает coded redirect от Google. Практически безвредно (нужно знать URL + перехватить Google auth code), но не литерально zero-state.
  - **Рекомендуемая чистка после rollback'а:** дополнительным коммитом на master вернуть `convex/auth.ts` к `providers: [GitHub]` (revert одной строки в Task 1). Watcher (`make convex`) ДОЛЖЕН быть запущен — он пушит изменение в cloud. Если watcher не запущен — `npx convex dev --once` за один раз. После пуша `/api/auth/callback/google` начнёт возвращать ошибку «Unknown provider».
  - Optional: удалить env vars (`npx convex env remove AUTH_GOOGLE_ID && npx convex env remove AUTH_GOOGLE_SECRET`). Не критично — `auth.ts` без Google в providers их игнорирует.
- Google Cloud OAuth Client — оставь зарегистрированным; не вредит, пригодится при повторной попытке.

## Side effects на Convex deployment

Phase 4 трогает cloud dev deployment один раз — это **add-only**:
- `AUTH_GOOGLE_ID/SECRET` появляются в env (Pre-flight)
- `convex/auth.ts` push'нется watcher'ом в момент Task 1 → backend начнёт принимать `signIn('google')`
- Никаких schema migrations (`users` table расширения не делает Google)
- Никаких удалений / переименований

В случае Phase 4 abort — env vars можно почистить (см. Rollback). Никакой data corruption невозможен.

## What's captured for Phase 5 (Settings sync)

После Phase 4 у тебя:
- **Два рабочих провайдера** через тот же auth-flow и тот же `users`-table. Phase 5 (settings sync) отличает юзеров через `userId` независимо от провайдера — никаких provider-aware bridges.
- **Stable provider-agnostic shape** в auth-store. `signIn(provider: string)` — никаких изменений в Phase 5.
- **Tested «провайдер = аккаунт» инвариант** — Phase 5 settings sync строится на этом: settings привязаны к **конкретному `users._id`**, не к email. Юзер вошёл через GitHub и через Google → две независимые settings строки. Это by design.
- **THEME_CONTRACT extension pattern** утверждён повторно — для будущих UI-фаз (Stats UI в Phase 7, etc.) — паттерн «component contract spread'ится в агрегат» работает консистентно.

## Self-review notes

1. **Spec coverage vs umbrella Phase 4:**
   - `convex/auth.ts` — import + providers array ✓ Task 1
   - `SignInScreen.svelte` — кнопка Google ✓ Task 2
   - `auth-client.ts` — **не существует** в реальной архитектуре (Phase 3 решил без него; `auth-store.svelte.ts` напрямую обёртывает `useAuth()`). Umbrella plan говорил «расширить `Provider = 'github' | 'google'` в `auth-client.ts`» — этот элемент захвачен Task 2 как local `type OAuthProviderId = 'github' | 'google'` в `SignInScreen.svelte`.
   - Env vars в Convex ✓ Pre-flight
   - Google Cloud Console registration ✓ Pre-flight
   - «Провайдер = аккаунт» verification ✓ Task 5.5 (Вариант А — browser-level либо Вариант Б — unit-test fallback)
   - CLAUDE.md обновление ✓ Task 6

2. **Placeholder scan:**
   - Все шаги содержат полный код / точные команды / ожидаемый output.
   - Theme oklch значения для Google-кнопки — конкретные числа (не «подобрать»). Implementer может в Task 4 их подкрутить, если визуально плохо — это явная итерация, не placeholder.
   - Step 5.5 invariant verification — конкретная процедура (sign in Google, out, in GitHub, check 2 строк), не «проверить инвариант».

3. **Type consistency:**
   - `AuthStore` тип — импортируется из `@/lib/auth/auth-store.svelte` (matches existing `SignInScreen.svelte` Phase 3 code).
   - `OAuthProviderId = 'github' | 'google'` — узкий union на уровне компонента; `auth.signIn(provider: string)` принимает любой string, наш subset валиден.
   - Имена CSS-токенов идентичны во всех правках (`--sign-in-screen-btn-google-{background|color|border|hover-background}`) — без drift'а.

4. **Известные риски:**
   - Reactive `setAuth` fix в layout — закрывает race; если кто-то его удалит при повышение версии wrapper'а — Google login покажет «UserMenu loading forever» баг. Step 5.6 ловит.
   - Theme `oklch`-значения для Google — субъективны. Task 4 (Storybook visual review) — buffer для подгонки.
   - Google OAuth «unverified app» warning в Step 5.3 — нормально для Testing mode; не препятствие. В production-deployment Phase нужно verify app в Google Cloud Console (отдельная задача, не в этом плане).
   - **Cspell**: маловероятно, что новые слова появятся (Google/google не русское). Если упадёт — следуй CLAUDE.md руководству: опечатка → fix, калька → переписать, нормальный термин → whitelist.
   - **Cspell `GOCSPX` / `GOCSPX-` — НЕ добавлять в whitelist.** Если spell-чек падает на этих токенах — это **сработавший guard**, не bug: секрет попал в код/комментарий/MD. Fix — удали секрет (и обновляй Reset secret в Google Cloud Console), не глуши `cspell.json`. Step 6.5 grep — второй слой защиты на случай если spell случайно skipped.

5. **Что НЕ в плане (явно):**
   - Иконки/логотипы провайдеров — нет.
   - Кастомизация «remember me» / session TTL — wrapper-defaults используются.
   - Account linking UI (объединить два user рекорда) — Phase 10 (Roadmap V2).
   - Yandex/Apple/SberID setup — отдельные фазы (8/9/11 в Roadmap V2).
   - Push на origin — задача пользователя (memory `feedback_no_ahead_count.md`), план её не делает.
