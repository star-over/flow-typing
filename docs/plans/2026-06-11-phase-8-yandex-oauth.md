# Phase 8: Yandex OAuth Provider — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить Yandex как третий OAuth-провайдер (после GitHub в Phase 3 и Google в Phase 4). На `/signin` появляется третья кнопка «Войти через Yandex». Backend, фронт-кнопка, темы. Сохранить инвариант «провайдер = аккаунт» (отдельные `users`-строки для одного email при входе через разные провайдеры) — этот инвариант защищается существующим `createOrUpdateUserHandler` без правок.

**Architecture:** Минимальная фаза, шаблон один-в-один с Phase 4. Бэкенд — `import Yandex from '@auth/core/providers/yandex'` + добавление в `providers` array. Тип `OAuthProviderId` извлекается из локального `SignInScreen.svelte` в shared `src/lib/auth/auth.types.ts` и расширяется до `'github' | 'google' | 'yandex'` — это решение было отложено в Phase 4 plan'е до момента, когда появится третий потребитель типа. UI — третья кнопка в `SignInScreen.svelte`. Темы — 4 новых токена `--sign-in-screen-btn-yandex-{background,color,border,hover-background}` × 4 темы + `_template.css`. `authStore` уже provider-agnostic (`signIn(provider: string)`), правки не нужны.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes) · Convex Auth (`@convex-dev/auth@~0.0.94`) · `@auth/core@~0.41.2` (Yandex provider встроен — verified в `node_modules/@auth/core/providers/yandex.js:64-72`: `profile()` нормализует payload в `{ id, name: display_name ?? real_name ?? first_name, email: default_email ?? emails?.[0] ?? null, image: <конструкция из default_avatar_id> }`, нашему `createOrUpdateUserHandler` подходит без правок) · `@mmailaender/convex-auth-svelte@~0.1.3` · TypeScript strict.

> **Стек в одном предложении:** `@auth/core` — Auth.js — каталог OAuth-провайдеров. `@convex-dev/auth` — Convex-компонент, который запускает Auth.js callbacks на backend'е и хранит сессии в Convex DB. `@mmailaender/convex-auth-svelte` — community Svelte-обёртка, которая bridge'ит Convex client с Auth.js state (PKCE, token refresh) на фронте. Phase 8 трогает только первый пакет (добавляет Yandex провайдер), остальные два — наследие Phase 2/3 и не правятся.

---

## Starting state (после Phase 5 + cleanup, master @ `a987bdc`)

- **Master HEAD:** `a987bdc` — `docs(auth): update umbrella status table — Phase 2-5 done, 6-7 deferred`
- **Backend:** `convex/auth.ts` — GitHub + Google провайдеры, `createOrUpdateUserHandler` (provider-agnostic, тестируется в `convex/auth.test.ts:1-62`)
- **Frontend:** `SignInScreen.svelte` — две кнопки (GitHub, Google), `handleSignIn(provider: 'github' | 'google')`, локальный `type OAuthProviderId = 'github' | 'google'` в `<script>` блоке
- **Auth store:** `createAuthStore()` экспортирует `signIn(provider: string)` — без правок переиспользуется для Yandex
- **Layout:** `src/routes/+layout.svelte` — reactive `$effect` re-wires `convex.setAuth(auth.fetchAccessToken)` при изменении `auth.token` (ищи блок с комментарием «Work around convex-auth-svelte: wrapper calls client.setAuth(...) only ONCE»). **Это защищает и Yandex flow тоже** (race на post-OAuth PKCE exchange не provider-specific).
- **Auth types:** `src/lib/auth/auth.types.ts` уже существует (хранит `User` + `AuthState`), но НЕ хранит `OAuthProviderId` — он сейчас local в `SignInScreen.svelte`. Phase 8 Task 1 — экстракт типа сюда.
- **Storybook:** `StorybookAuthFrame.svelte` — wrapper для stories с заглушкой `'auth'` context'а. `signIn: (_provider: string) => Promise.resolve()` уже принимает любой провайдер.
- **Themes:** 4 темы (`light/dark/sepia/nord`) + `_template.css` декларируют 11 SignInScreen-токенов (3 base + 4 GitHub + 4 Google). После Phase 8 — 15 токенов в `SIGN_IN_SCREEN_CONTRACT` (+4 Yandex).
- **THEME_CONTRACT** (`src/themes/contract.ts`) агрегирует 17 component-контрактов; `SIGN_IN_SCREEN_CONTRACT` — один из них. Текущий count — **111 токенов** (verified: `grep -rh "^  '--" src/components src/Root.contract.ts | sort -u | wc -l` → 111). После Phase 8 — **115 токенов**.
- **CLAUDE.md** содержит «Текущие провайдеры: GitHub, Google. Yandex/Apple/SberID — Roadmap V2.» — Phase 8 переписывает это.
- **Convex env:** `AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET`, `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS` уже set. Phase 8 добавляет `AUTH_YANDEX_ID/SECRET`.

## Phase 8 deliverables

- `src/lib/auth/auth.types.ts` — экстракт `OAuthProviderId = 'github' | 'google' | 'yandex'` (тип становится shared, ranged расширяется на Yandex)
- `convex/auth.ts` — `import Yandex from '@auth/core/providers/yandex'` + `providers: [GitHub, Google, Yandex]`
- `src/components/auth/SignInScreen.svelte` — `import type { OAuthProviderId } from '@/lib/auth/auth.types'` (вместо local type) + третья кнопка с классом `sign-in-screen__btn-yandex`
- `src/components/auth/SignInScreen.contract.ts` — +4 токена для Yandex-кнопки
- `src/themes/_template.css` — +4 строки (Yandex токены как `unset`)
- `src/themes/{light,dark,sepia,nord}.css` — +4 строки в каждой теме с заполненными значениями
- `src/themes/contract.ts` — без правок (SIGN_IN_SCREEN_CONTRACT расширяется, агрегатор spread'ит автоматически)
- `src/components/auth/SignInScreen.stories.svelte` — без правок (Story рендерит компонент целиком; все три кнопки отрисуются автоматически)
- `CLAUDE.md` — обновить список провайдеров (GitHub + Google + Yandex), обновить контракт-счётчик (111 → 115), удалить Yandex из «Roadmap V2». `Add new OAuth provider` инструкция остаётся как есть (универсальная).
- **Browser smoke** — Task 6: Yandex sign-in работает + «провайдер = аккаунт» инвариант подтверждён (одинаковый email через Yandex и любой другой провайдер → две разные `users`-строки)

## Зафиксированные решения

- **Theme tokens: реплицируем GitHub/Google-паттерн.** 4 новых per-provider токена (`--sign-in-screen-btn-yandex-{background,color,border,hover-background}`). Никакого refactor'а в base + provider-variants. Решение пользователя по Phase 8 setup (см. контекст плана) — продолжаем линейный рост, цена принята.
- **`OAuthProviderId` extract в `src/lib/auth/auth.types.ts`.** Решено пользователем — Phase 4 plan явно говорил «отложим до Phase 8, когда появится третий потребитель типа». Phase 8 — этот момент. Тип становится shared; готовит почву для Phase 9 (Apple) и Phase 11 (SberID).
- **Visual style — нейтральный, как GitHub/Google.** Не вводим брендовый красный/жёлтый Яндекса. Решение пользователя — паттерн «contained dark vs outlined light» как в Phase 4 для Google. Не выделять один провайдер визуально.
- **Yandex OAuth setup — часть Pre-flight.** OAuth app ещё не зарегистрирован, пользователь явно попросил пошаговую инструкцию для oauth.yandex.ru.
- **Без логотипов в кнопках.** «Войти через Yandex» — текст-only, как «Войти через GitHub» и «Войти через Google». Брендовые SVG-иконки — Phase 4 отложила это «отдельный mini-PR если пользователь захочет»; пользователь Phase 8 явно выбрал «продолжаем text-only, иконки откладываем».
- **Без расширения `convex/auth.test.ts`.** `createOrUpdateUserHandler` уже тестируется (`convex/auth.test.ts:44-61` явно покрывает «один email через два разных вызова → две разные строки»); логика provider-agnostic. Добавление Yandex в `providers` array не меняет вход в handler. Тест продолжает быть source of truth для инварианта.
- **Storybook story остаётся `Default`.** Одна story на компонент, рендерит все три кнопки. Дополнительные stories («Loading github», «Loading google», «Loading yandex») не нужны — компонент держит общий `signingIn` flag без provider-specific state.
- **Reactive setAuth workaround в layout — не трогаем.** Phase 3 race-fix защищает Yandex flow тоже (re-wire не provider-specific). См. блок `$effect(() => { if (auth.token) convex.setAuth(...) })` в `src/routes/+layout.svelte`.
- **Cspell whitelist для `yandex`/`Yandex`/`oauth.yandex.ru`/`yapic` — добавлять только при падении spell-check'а.** `yandex` пишется латиницей (английский label провайдера и URL домена); русские слова про Яндекс мы вводим минимум. Если `make spell` упадёт после Phase 8 — следуй CLAUDE.md руководству.

## File Structure

```
convex/
└── auth.ts                                         # MODIFY: + import Yandex, + Yandex в providers

src/
├── lib/
│   └── auth/
│       └── auth.types.ts                           # MODIFY: + export type OAuthProviderId
├── components/
│   └── auth/
│       ├── SignInScreen.svelte                     # MODIFY: import OAuthProviderId, + 3rd button
│       ├── SignInScreen.contract.ts                # MODIFY: + 4 Yandex tokens
│       └── SignInScreen.stories.svelte             # UNTOUCHED (story рендерит компонент целиком)
└── themes/
    ├── _template.css                               # MODIFY: + 4 Yandex токенов как `unset`
    ├── light.css                                   # MODIFY: + 4 строки c oklch значениями
    ├── dark.css                                    # MODIFY: + 4 строки
    ├── sepia.css                                   # MODIFY: + 4 строки
    └── nord.css                                    # MODIFY: + 4 строки

CLAUDE.md                                           # MODIFY: список провайдеров → GitHub + Google + Yandex, count 111 → 115
```

**Untouched (с обоснованиями):**
- `convex/users.ts` — `viewer` query orthogonal к провайдеру.
- `convex/auth.config.ts`, `convex/http.ts`, `convex/schema.ts` — provider whitelist / HTTP routes / schema не меняются.
- `convex/auth.test.ts` — handler провайдер-agnostic, новых веток не добавляется.
- `convex/userSettings.ts` — settings sync (Phase 5) provider-agnostic.
- `src/lib/auth/auth-store.svelte.ts` — `signIn(provider: string)` уже provider-agnostic.
- `src/lib/auth/auth-state.ts` — `AuthState` derivation не зависит от провайдера.
- `src/components/auth/UserMenu.svelte` — UI отображения юзера, провайдер не виден.
- `src/components/auth/StorybookAuthFrame.svelte` — `signIn: (_provider: string)` уже принимает что угодно.
- `src/routes/+layout.svelte` — race-fix защищает Yandex тоже, никаких правок.
- `src/themes/contract.ts` — агрегатор spread'ит `SIGN_IN_SCREEN_CONTRACT`; расширение контракта попадёт в `THEME_CONTRACT` без явных правок этого файла.
- `cspell.json` — `oauth/OAuth` уже whitelisted; `yandex` — английский label, не должен падать (но если упадёт — fix по руководству).

---

## Pre-flight Checks

**Требования.** Перед стартом убедись, что у тебя есть:
- Рабочий **Yandex аккаунт** с подтверждённым email в Yandex Passport — нужен и для регистрации OAuth app, и для smoke-теста в Task 6. Если нет — `passport.yandex.ru` → зарегистрироваться за 2-3 минуты, обязательно подтвердить email-адрес (иначе scope `login:email` вернёт пустой `default_email`).
- Доступ к Convex deployment `wandering-ocelot-9` (Phase 1/2/3/4/5 уже настроены — `.env.local` должен содержать `CONVEX_DEPLOYMENT` и `PUBLIC_CONVEX_URL`).
- ~30-45 минут непрерывного времени (Task 3 и Task 4 — атомарная пара, не разрывай).

- [ ] **Чистый `master`:**

```bash
git status --porcelain          # пусто
git log -1 --oneline            # ожидаемо: a987bdc docs(auth): update umbrella status table
                                # Если master уехал — проверь
                                # git log --since='2026-06-11' --name-only — не должно быть свежих
                                # правок в convex/auth.ts, SignInScreen.svelte или темах
git switch master
git switch feat/auth-yandex-provider 2>/dev/null || git switch -C feat/auth-yandex-provider
```

> **Resume support.** Если ветка `feat/auth-yandex-provider` уже существует (второй заход после прерывания) — `git switch` без `-C` подхватит существующее состояние, не уничтожив частичную работу. `-C` (force) запасной путь для свежего старта. Чтобы понять, на каком Task'е остановился — `git log master..HEAD --oneline` покажет уже законченные задачи (commit-messages привязаны к task'ам).

- [ ] **Watcher в отдельном терминале** (Makefile — единая точка входа, см. CLAUDE.md «Commands»):

```bash
make convex
```

Должен подключиться к `wandering-ocelot-9.eu-west-1.convex.cloud`. Оставить running на всё время Phase 8 — codegen в `convex/_generated/` нужен для type-check.

- [ ] **Yandex OAuth app — регистрация (одноразовая, ~10 мин)**

Это пошаговая инструкция по `oauth.yandex.ru`, потому что пользователь явно попросил её в плане.

1. **Открыть Yandex OAuth Console:**
   - Перейти на `https://oauth.yandex.ru/`
   - Войти в Yandex-аккаунт (тот, который будет использоваться для smoke-теста)
   - Нажать **«Зарегистрировать новое приложение»** (или «Register a new application» если интерфейс на английском)

2. **Заполнить форму регистрации:**
   - **Название сервиса:** `FlowTyping (dev)` — отображается пользователю на consent screen, можно любое информативное
   - **Иконка:** опционально, можно пропустить
   - **Платформы:** **Веб-сервисы**
   - **Redirect URI:** ровно `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/yandex`
     - **Critical:** именно `.convex.site` (backend domain), не `.convex.cloud` (functions domain) и не `localhost`. Если URI не совпадает с тем, что Auth.js шлёт — Yandex вернёт `redirect_uri_mismatch`.

3. **Указать scopes (доступы):**
   - **Все три scope ОБЯЗАТЕЛЬНЫ.** Auth.js Yandex provider жёстко зашивает в authorization URL `scope=login:info+login:email+login:avatar` (verified в `node_modules/@auth/core/providers/yandex.js:61`). Если в OAuth Console отметить только подмножество — Yandex вернёт `invalid_scope` при первой авторизации. Хочешь отказаться от avatar — нужен override через `Yandex({ authorization: { params: { scope: 'login:info login:email' } } })` в `convex/auth.ts`, а Phase 8 этого override'а не делает (мы пока не рендерим аватары в UserMenu, но scope запросим чтобы flow не падал).
   - **UI-формулировки могут плыть** — Yandex периодически меняет подписи в Console. Точные названия из Auth.js docs (`node_modules/@auth/core/providers/yandex.d.ts:13-19`):
     - `login:email` — "Access to email address" (русский UI обычно «Доступ к адресу электронной почты»)
     - `login:info` — "Access to login, first name, last name, and gender" (русский UI «Доступ к логину, имени и фамилии, полу»)
     - `login:avatar` — "Access to the user's profile picture" (русский UI «Доступ к портрету пользователя»)
   - Ориентируйся на ключевые слова (email/почта, имя/login/info, аватар/portrait), не на точное совпадение строки. Отметь все три.

4. **Сохранить приложение** — кнопка внизу формы.

5. **Скопировать ClientID и Client secret** с экрана деталей приложения:
   - `ClientID` (он же «ID приложения») — публичный, можно сразу прописывать
   - `Client secret` (он же «Пароль приложения») — **показывается один раз сразу после регистрации**. Если потерял — на странице приложения нажать «Заменить» (Reset secret).

> **App publishing:** Yandex OAuth не имеет explicit «Testing mode» как у Google. App доступен сразу любому Yandex-юзеру, никакого test-users whitelisting. Это упрощает Pre-flight, но также значит — для production нужно будет помнить про rate limits / brand verification (если Yandex когда-то потребует — отдельная задача, не в этом плане).

- [ ] **Прописать credentials в Convex env (zsh-friendly):**

Сначала проверь, не выставлены ли уже (idempotent на втором заходе после прерывания):

```bash
npx convex env list | grep AUTH_YANDEX
```

Если обе строки есть и outputs не пустые — skip этот блок, переходи к «Verify env». Иначе:

```bash
# ID — не секрет, обычная переменная:
npx convex env set AUTH_YANDEX_ID '<paste ClientID here>'

# Secret — через zsh read с тихим input'ом + trap для guaranteed cleanup:
read -s "?AUTH_YANDEX_SECRET: " YANDEX_SECRET && echo
trap 'unset YANDEX_SECRET' EXIT INT TERM
npx convex env set AUTH_YANDEX_SECRET "$YANDEX_SECRET"
unset YANDEX_SECRET
trap - EXIT INT TERM
```

`read -s "?..."` — zsh-pattern для тихого ввода с inline-промптом. `-p` в zsh не работает как в bash. `trap 'unset ...' EXIT INT TERM` гарантирует чистку переменной даже при Ctrl-C или ошибке `npx convex env set` (network blip, expired auth). Echo после `read` — для перевода строки в терминале.

**Если `npx convex env set` упал**: secret уже почищен trap'ом, но **не зарегистрирован**. Получи secret заново на странице приложения в oauth.yandex.ru (Reset secret) и повтори.

- [ ] **Verify env:**

```bash
npx convex env list | grep AUTH_YANDEX
```

Ожидаемо: две строки — `AUTH_YANDEX_ID` и `AUTH_YANDEX_SECRET`.

- [ ] **Сверить SITE_URL не сбросился:**

```bash
npx convex env list | grep SITE_URL
```

Ожидаемо: `SITE_URL=http://localhost:5173`. Если пусто — добавить: `npx convex env set SITE_URL http://localhost:5173`.

---

## Task 1: Extract `OAuthProviderId` в `src/lib/auth/auth.types.ts`

**Files:**
- Modify: `src/lib/auth/auth.types.ts`

**Цель:** перенести `OAuthProviderId` из локального `<script>` блока `SignInScreen.svelte` в shared `auth.types.ts`. После Task 1 тип ещё не используется (SignInScreen всё ещё держит свою local копию), но shared-копия доступна для всех потребителей. Task 3 будет import'ить из этого модуля. Это решение было отложено в Phase 4 plan'е до Phase 8.

> **Почему не сразу в Task 3?** Atomic коммит. После Task 1: тип extract'нут, всё компилируется, тесты зелёные, SignInScreen работает на local-копии. После Task 3: SignInScreen переключается на shared-копию + добавляется 'yandex'. Каждый шаг — самостоятельная единица, безопасная при bisect.

- [ ] **Step 1.1: Прочитать текущий `auth.types.ts`**

```bash
cat src/lib/auth/auth.types.ts
```

Ожидаемо: 9 строк — `import { Doc } from convex datamodel`, `export type User`, `export type AuthState`. Phase 8 добавляет один экспорт.

- [ ] **Step 1.2: Добавить экспорт `OAuthProviderId`**

Открой `src/lib/auth/auth.types.ts`. **В конец файла** (после блока `AuthState`) добавь:

```ts

/**
 * Identifier OAuth-провайдера, поддерживаемого FlowTyping.
 *
 * Используется компонентами `auth/`-папки (`SignInScreen.svelte` и т.д.)
 * для типизации `auth.signIn(provider)` вызова. `authStore.signIn` принимает
 * любой `string` (см. `@mmailaender/convex-auth-svelte` wrapper) — наш
 * subset нужен, чтобы UI явно перечислял, какие провайдеры реально поддержаны.
 */
export type OAuthProviderId = 'github' | 'google' | 'yandex';
```

> **Naming:** `OAuthProviderId` (а не `Provider`) следует project-паттерну `<Domain>Id` (`PhysicalLayoutId`, `FingerLayoutId`, `SymbolLayoutId`) — см. `docs/02-naming-conventions.md`. Имя совпадает с тем, что было в `SignInScreen.svelte:5` локально — после Task 3 local-копия удалится, имя сохранится.

- [ ] **Step 1.3: `make check`**

```bash
make check 2>&1 | tail -3
```

Zero errors. Новый тип — unused, type-check это терпит (`export type` без использования — OK для shared модуля).

- [ ] **Step 1.4: `make test`**

```bash
make test 2>&1 | tail -5
```

Zero errors. Контракт-тест не падает (новый тип не CSS-токен, contract.ts не трогается). Backend-тесты не падают (auth.types — фронт-только модуль, convex его не импортирует).

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/auth/auth.types.ts
git commit -m "refactor(auth-types): extract OAuthProviderId to shared auth.types module"
```

---

## Task 2: Add Yandex provider в `convex/auth.ts`

**Files:**
- Modify: `convex/auth.ts`

**Цель:** Convex Auth backend знает про Yandex. После Task 2 любой клиентский `signIn('yandex')` начнёт OAuth flow → callback на `.convex.site/api/auth/callback/yandex` → `createOrUpdateUserHandler` → новая `users` запись. Сам клиент ещё не использует — это Task 3.

- [ ] **Step 2.1: Прочитать текущий `convex/auth.ts`**

```bash
cat convex/auth.ts
```

Запомнить структуру: импорты `GitHub from '@auth/core/providers/github'` + `Google from '@auth/core/providers/google'`, `providers: [GitHub, Google]`, callback `createOrUpdateUser`. Phase 8 добавляет один import + расширяет array.

- [ ] **Step 2.2: Добавить импорт и Yandex в providers**

Открой `convex/auth.ts` и сделай ровно две правки:

**A.** Сразу после строки `import Google from '@auth/core/providers/google';` добавь:

```ts
import Yandex from '@auth/core/providers/yandex';
```

**B.** В блоке `convexAuth({ providers: [GitHub, Google], ... })` замени `[GitHub, Google]` на `[GitHub, Google, Yandex]`:

```ts
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub, Google, Yandex],
  callbacks: {
    // Передаём в helper только нужные поля, чтобы изолировать тесты от
    // полного callback args shape (`type`, `provider`, `shouldLink` и т.д. — не используем).
    createOrUpdateUser: (ctx, { existingUserId, profile }) =>
      createOrUpdateUserHandler({ ctx, existingUserId, profile }),
  },
});
```

Других правок в файле нет. `createOrUpdateUserHandler` остаётся как есть — он провайдер-agnostic. Yandex provider normalize'ит профиль в `{ id, name, email, image }` shape (verified в `node_modules/@auth/core/providers/yandex.js`), что точно соответствует тому, что handler ожидает.

- [ ] **Step 2.3: Verify watcher подхватил изменения**

В терминале с `make convex` watcher должен напечатать что-то вроде:

```
Convex functions ready! (XXXms)
```

Что значат разные сигналы:
- Просто «functions ready» (с любым timing'ом) — успех, двигайся дальше.
- Строки с `warning` / `warn` / `[WARN]` — обычно устаревания, не препятствие. Игнорируй.
- Строки с `error` / `Error` / `Failed` / `Type 'Yandex' is not assignable` — **стоп**. Конфликт версий `@auth/core` или import-typo. Разбирайся (проверь буквы в `from '@auth/core/providers/yandex'` — нижний регистр), затем перезапусти watcher.
- Watcher молчит после save'а — `Ctrl+C` и `make convex` заново, иногда watcher теряет file-watch на macOS после некоторого времени.

- [ ] **Step 2.4: `make check` + `make test`**

```bash
make check && make test 2>&1 | tail -10
```

Zero errors. Тесты остаются зелёными — `createOrUpdateUserHandler` провайдер-agnostic, Yandex в `providers` array не меняет ни одной существующей ветки логики. Тест `does NOT link by email — same email through different provider yields two separate users` продолжает быть зелёным; он покрывает инвариант на уровне handler'а напрямую, независимо от того, сколько провайдеров в массиве.

- [ ] **Step 2.5: Commit**

```bash
git status --short              # проверь не появилось ли лишних файлов
git add convex/auth.ts
# Если git status показывает изменения в convex/_generated/api.* — добавь их в commit:
# git add convex/_generated/
git commit -m "feat(auth): add Yandex OAuth provider to Convex Auth backend"
```

`convex/_generated/` отслеживается в git (см. `git ls-files convex/_generated/`). Convex watcher регенерирует эти файлы при правке `convex/*.ts`; обычно для добавления одного провайдера regen не нужен (тип-сигнатуры не меняются), но если `git status` показывает diff — это нормально, закоммитить с основной правкой.

---

## Task 3: Refactor `SignInScreen.svelte` — import shared type + Yandex кнопка

**Files:**
- Modify: `src/components/auth/SignInScreen.svelte`

**Цель:** убрать локальный `type OAuthProviderId = 'github' | 'google'` (Task 1 уже extract'нул shared копию), добавить import из `@/lib/auth/auth.types`, добавить третью кнопку «Войти через Yandex». После Task 3 (но до Task 4) Yandex-кнопка работает функционально, но CSS-токенов нет — стиль будет «голый» (fallback'и). Это OK для атомарного коммита — Task 4 заполняет токены.

- [ ] **Step 3.1: Прочитать текущий компонент**

```bash
cat src/components/auth/SignInScreen.svelte
```

Сейчас в `<script>` — local `type OAuthProviderId = 'github' | 'google'` + `handleSignIn(provider: OAuthProviderId)`. В template — две кнопки (GitHub, Google). В `<style>` — параллельные блоки `.sign-in-screen__btn-github` и `.sign-in-screen__btn-google`. Phase 8 добавляет третий параллельный набор для Yandex + переключает тип на shared.

- [ ] **Step 3.2: Заменить блок `<script>` — убрать local type, добавить import**

Открой `src/components/auth/SignInScreen.svelte`. Найди блок:

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  type OAuthProviderId = 'github' | 'google';

  const auth = getContext<AuthStore>('auth');
```

Замени на:

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';
  import type { OAuthProviderId } from '@/lib/auth/auth.types';

  const auth = getContext<AuthStore>('auth');
```

Все остальные строки `<script>` блока (state, `handleSignIn`, try/catch/finally) — без правок. `handleSignIn(provider: OAuthProviderId)` теперь принимает расширенный union (`'github' | 'google' | 'yandex'`) автоматически через import.

- [ ] **Step 3.3: Добавить третью кнопку в template**

Найди блок template (под `<h1>`):

```svelte
  <button
    type="button"
    class="sign-in-screen__btn-google"
    disabled={signingIn}
    onclick={() => handleSignIn('google')}
  >
    {signingIn ? 'Перенаправление…' : 'Войти через Google'}
  </button>

  <p class="sign-in-screen__disclaimer">
```

Между блоком Google и `<p class="sign-in-screen__disclaimer">` добавь третью кнопку:

```svelte
  <button
    type="button"
    class="sign-in-screen__btn-google"
    disabled={signingIn}
    onclick={() => handleSignIn('google')}
  >
    {signingIn ? 'Перенаправление…' : 'Войти через Google'}
  </button>

  <button
    type="button"
    class="sign-in-screen__btn-yandex"
    disabled={signingIn}
    onclick={() => handleSignIn('yandex')}
  >
    {signingIn ? 'Перенаправление…' : 'Войти через Yandex'}
  </button>

  <p class="sign-in-screen__disclaimer">
```

`signingIn` — общий флаг для всех трёх кнопок (одновременно нажать всё равно нельзя — `disabled` отключает все). `'Перенаправление…'` — обобщённый тип-текст.

> **Label «Войти через Yandex»** — латиница в имени бренда, как у GitHub/Google. Эта строка не локализуется (она не в i18n словарях — `dictionaries/{en,ru}.json` для FlowTyping-копирайтинга, не для provider names). Если когда-нибудь захотим «Войти через Яндекс» (кириллица) — отдельное решение, scope не Phase 8.

- [ ] **Step 3.4: Добавить стили для `.sign-in-screen__btn-yandex`**

В `<style>` блоке, **сразу после** существующего блока:

```css
  .sign-in-screen__btn-google:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
```

(но **перед** блоком `.sign-in-screen__error`), добавь параллельный набор для Yandex:

```css
  .sign-in-screen__btn-yandex {
    background: var(--sign-in-screen-btn-yandex-background);
    color: var(--sign-in-screen-btn-yandex-color);
    border: var(--sign-in-screen-btn-yandex-border);
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-sm, 0.25rem);
    cursor: pointer;
    font-size: 1rem;
  }

  .sign-in-screen__btn-yandex:hover {
    background: var(--sign-in-screen-btn-yandex-hover-background);
  }

  .sign-in-screen__btn-yandex:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
```

Padding/radius/cursor/font-size — идентичны GitHub/Google, чтобы все три кнопки выглядели как тройка. Различаются только background/color/border (через свои токены).

- [ ] **Step 3.5: `make check`**

```bash
make check 2>&1 | tail -3
```

Zero errors. Type check должен проверить, что `handleSignIn(provider: OAuthProviderId)` принимает `'yandex'` literal (после Task 1 union включает yandex). `auth.signIn(provider)` — wrapper принимает любой string, subset валиден.

- [ ] **Step 3.6: `make test`**

```bash
make test 2>&1 | tail -5
```

**Ожидаемо: всё зелёное.** Логика:
- `contract.test.ts` итерирует токены из `THEME_CONTRACT` → проверяет, что каждый объявлен в темах. Контракт мы пока НЕ расширяли (Task 4 это сделает), так что contract-тест не видит ничего нового.
- Компонент теперь ссылается на `var(--sign-in-screen-btn-yandex-*)`, которых в темах нет — но это **не валидируется тестами**. Браузер для unresolved CSS variable возвращает initial value (`unset`/inherited) — никаких ошибок, кнопка просто будет «голой» до Task 4.
- Component-level rendering tests на SignInScreen не существуют (Storybook only).

Если красное — `--filter contract` для изоляции; fix перед Task 4.

- [ ] **Step 3.7: Commit**

```bash
git add src/components/auth/SignInScreen.svelte
git commit -m "feat(auth-ui): import shared OAuthProviderId, add Yandex sign-in button"
```

> **Не разрывай работу здесь.** Этот commit намеренно оставляет компонент в промежуточном состоянии — Yandex-кнопка ссылается на CSS-переменные, которых в темах нет, поэтому в браузере выглядит «голой» (browser fallback на `unset` / inherited). Task 4 закрывает эту дыру. Если ветка bisect'нется на этом коммите — будет visual regression на `/signin`. Task 3 + Task 4 — атомарная пара; **не оставляй ветку на ночь между ними**.

---

## Task 4: Theme tokens — contract + `_template.css` + 4 темы

**Files:**
- Modify: `src/components/auth/SignInScreen.contract.ts`
- Modify: `src/themes/_template.css`
- Modify: `src/themes/light.css`
- Modify: `src/themes/dark.css`
- Modify: `src/themes/sepia.css`
- Modify: `src/themes/nord.css`

**Цель:** добавить 4 Yandex-токена в контракт и заполнить значения во всех темах. После Task 4 `make check-all` зелёный, Yandex-кнопка визуально консистентна в каждой теме. `src/themes/contract.ts` НЕ трогаем — он spread'ит `SIGN_IN_SCREEN_CONTRACT` (`...SIGN_IN_SCREEN_CONTRACT` уже в `THEME_CONTRACT`), расширение контракта попадёт в агрегат автоматически.

> **Не DRY эти токены.** Соблазн извлечь общий `--sign-in-screen-btn-base-*` и оставить только differing tokens per provider — **отказались** в «Зафиксированные решения» выше. Phase 4 / Phase 8 явно реплицируют GitHub-паттерн как есть. Refactor отложен на будущее (если когда-то Apple/SberID/др. сделают линейный рост невыносимым). `_template.css` — скелет, enforce'имый contract-тестом, чтобы новые темы не пропускали токены; держим его в синхроне через простую append-операцию, без хитрых иерархий.

- [ ] **Step 4.1: Расширить `SIGN_IN_SCREEN_CONTRACT`**

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
  '--sign-in-screen-btn-yandex-background',  // background кнопки Yandex
  '--sign-in-screen-btn-yandex-color',       // color текста кнопки Yandex
  '--sign-in-screen-btn-yandex-border',      // border кнопки Yandex
  '--sign-in-screen-btn-yandex-hover-background', // background кнопки Yandex при hover
] as const satisfies readonly `--${string}`[];
```

Header-комментарий `/** Theme contract for SignInScreen.svelte. ... */` обнови: «SignInScreen — экран входа с кнопками **«Войти через GitHub»**, **«Войти через Google»** и **«Войти через Yandex»** + предупреждением о привязке прогресса к провайдеру.»

- [ ] **Step 4.2: Запустить test → contract должен упасть (RED)**

```bash
make test 2>&1 | tail -15
```

Ожидаемо: contract-тест в `src/themes/contract.test.ts` падает с указанием, что в `_template.css` (и в каждой из 4 тем) отсутствуют `--sign-in-screen-btn-yandex-*` токены.

- [ ] **Step 4.3: Заполнить `_template.css`**

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
  --sign-in-screen-btn-google-background : unset;
  --sign-in-screen-btn-google-color      : unset;
  --sign-in-screen-btn-google-border     : unset;
  --sign-in-screen-btn-google-hover-background: unset;
```

Добавь 4 строки **сразу после** последней строки `--sign-in-screen-btn-google-hover-background: unset;` и **перед** комментарием `/* UserMenu */`:

```css
  --sign-in-screen-btn-yandex-background : unset;
  --sign-in-screen-btn-yandex-color      : unset;
  --sign-in-screen-btn-yandex-border     : unset;
  --sign-in-screen-btn-yandex-hover-background: unset;
```

**Critical:** комментарий — `/* SignInScreen */` без двоеточия. Парсер contract-теста ломается на `/* === Auth: SignInScreen === */`-style комментариях с двоеточием (известный gotcha из Phase 3/4).

- [ ] **Step 4.4: Заполнить `light.css`**

Открой `src/themes/light.css`. Найди блок `/* SignInScreen */` (около строки 294). Найди строку `--sign-in-screen-btn-google-hover-background: oklch(95% 0 0);` (последняя Google-строка перед комментарием `/* UserMenu */`). Добавь 4 строки **сразу после** неё и **перед** комментарием `/* UserMenu */`:

```css
  --sign-in-screen-btn-yandex-background : oklch(20% 0.02 280);
  --sign-in-screen-btn-yandex-color      : oklch(98% 0 0);
  --sign-in-screen-btn-yandex-border     : 1px solid oklch(15% 0.02 280);
  --sign-in-screen-btn-yandex-hover-background: oklch(30% 0.03 280);
```

**Палитра:** Yandex в light теме повторяет GitHub-паттерн «contained dark» (тёмная заливка + светлый текст). GitHub и Yandex визуально похожи (оба «contained dark»), Google — outlined light. Три кнопки группируются в два визуальных стиля: «contained» (GitHub + Yandex) и «outlined» (Google) — это естественно читается как пара альтернатив в каждом стиле.

- [ ] **Step 4.5: Заполнить `dark.css`**

Открой `src/themes/dark.css`. Найди блок `/* SignInScreen */` (около строки 293). Найди последнюю Google-строку (`--sign-in-screen-btn-google-hover-background`). Добавь 4 строки сразу после неё:

```css
  --sign-in-screen-btn-yandex-background : oklch(95% 0 0);
  --sign-in-screen-btn-yandex-color      : oklch(15% 0 0);
  --sign-in-screen-btn-yandex-border     : 1px solid oklch(75% 0 0);
  --sign-in-screen-btn-yandex-hover-background: oklch(88% 0 0);
```

**Палитра:** в dark теме Yandex — «contained light» (как GitHub в dark — почти white заливка + тёмный текст). Google в dark — outlined-style на тёмном bg. Так в каждой теме сохраняется визуальная асимметрия: GitHub + Yandex одного стиля, Google противоположного — читается на glance как «два + один».

- [ ] **Step 4.6: Заполнить `sepia.css`**

Открой `src/themes/sepia.css`. Найди блок `/* SignInScreen */` (около строки 284). Найди последнюю Google-строку. Добавь 4 строки сразу после неё:

```css
  --sign-in-screen-btn-yandex-background : oklch(32% 0.04 60);
  --sign-in-screen-btn-yandex-color      : oklch(95% 0.02 70);
  --sign-in-screen-btn-yandex-border     : 1px solid oklch(25% 0.04 60);
  --sign-in-screen-btn-yandex-hover-background: oklch(42% 0.05 60);
```

**Палитра:** sepia использует тёплые тоны. Yandex — глубокий тёмный (`32% 0.04 60`), как GitHub в sepia. Google — outlined на светлом sepia. «Тёплая инверсия пары» сохраняется.

- [ ] **Step 4.7: Заполнить `nord.css`**

Открой `src/themes/nord.css`. Найди блок `/* SignInScreen */` (около строки 285). Найди последнюю Google-строку. Добавь 4 строки сразу после неё:

```css
  --sign-in-screen-btn-yandex-background : oklch(95% 0.01 234);
  --sign-in-screen-btn-yandex-color      : oklch(25% 0.02 254);
  --sign-in-screen-btn-yandex-border     : 1px solid oklch(75% 0.01 234);
  --sign-in-screen-btn-yandex-hover-background: oklch(88% 0.01 234);
```

**Палитра:** nord — холодные синие. Yandex в nord — почти white заливка (как GitHub), Google — outlined средне-синий. Сохраняем визуальную пару «contained» (GitHub + Yandex) vs «outlined» (Google).

- [ ] **Step 4.8: Run test → GREEN**

```bash
make test 2>&1 | tail -10
```

Ожидаемо: contract-тест зелёный. Все 4 новых токена объявлены в `_template.css` и в каждой из 4 тем.

- [ ] **Step 4.9: `make check-all`**

```bash
make check-all 2>&1 | tail -10
```

Zero errors всеми инструментами (lint + check + test + spell + build). Если spell падает — следуй CLAUDE.md руководству:
- `yandex` / `Yandex` (английский label провайдера, доменное имя `oauth.yandex.ru`) → whitelist в `cspell.json → words`. Обоснование — внешнее имя без аналога, доменный термин.
- `yapic` (часть URL аватара `avatars.yandex.net/get-yapic/...`) — мы его не используем в коде Phase 8 (avatar поддержка orthogonal), но если случайно где-то всплывёт → whitelist.
- Если spell упал на чём-то другом (опечатка / калька) — fix по руководству, не whitelist'и кальки.

- [ ] **Step 4.10: Commit**

```bash
git add src/components/auth/SignInScreen.contract.ts \
        src/themes/_template.css \
        src/themes/light.css \
        src/themes/dark.css \
        src/themes/sepia.css \
        src/themes/nord.css
# Если на Step 4.9 пришлось править cspell.json (добавить yandex/Yandex) — добавь:
# git add cspell.json
git commit -m "feat(auth-ui): add Yandex button theme tokens across 4 themes"
```

---

## Task 5: Visual verification в Storybook

**Files:** ничего не меняется (но может потребоваться tune oklch-значений).

**Цель:** глазами увидеть, что Yandex-кнопка отрисовалась во всех 4 темах согласованно с GitHub и Google. Это не automated test — это глаз-проверка дизайн-консистентности. Если выглядит плохо — вернуться в Task 4 и подкрутить значения oklch.

- [ ] **Step 5.1: Запустить Storybook**

```bash
make storybook
```

В отдельном терминале Storybook на `http://localhost:6006`.

- [ ] **Step 5.2: Открыть SignInScreen story**

В Storybook UI: `auth/SignInScreen → Default`. Должны быть видны:
- Заголовок «Войти в FlowTyping»
- Кнопка «Войти через GitHub» (Phase 3 — без изменений)
- Кнопка «Войти через Google» (Phase 4 — без изменений)
- Кнопка «Войти через Yandex» (новая)
- Оговорка

- [ ] **Step 5.3: Переключать темы через Storybook toolbar**

В Storybook toolbar (верхняя панель canvas'а) есть theme switcher — paintbrush-icon (`globalTypes.theme` в `.storybook/preview.ts`). Клик по иконке → dropdown с пунктами `Auto (system) / light / dark / sepia / nord`. Decorator выставляет `document.documentElement.dataset.theme` синхронно с выбором, поэтому переключение мгновенное.

Пройти все 4 темы: `light → dark → sepia → nord`. На каждой:
- Все три кнопки видны и кликабельны (hover-state visible at minimum)
- Yandex не «провалена» (не сливается с фоном) и не «выпрыгивает» (не разорвана visual hierarchy)
- Дисциплина: Yandex-кнопка визуально «парная» к GitHub (по выбранной палитре «contained» group) — обе должны выглядеть как один стиль, не два разных foreign components
- Glance test: открыв любую тему на 2 секунды, можно прочитать «три кнопки одного семейства» — если глаз видит «две кнопки и одну чужеродную» — не сходится, итерация на Step 5.4

- [ ] **Step 5.4: Если визуально плохо — итерация**

Если в какой-то теме выглядит плохо (например, Yandex border сливается с фоном) — открой `src/themes/<theme>.css`, подкрути `oklch()`-значения Yandex-токенов. Просто `Cmd+S` — Storybook hot-reload'нет. Когда устроило — `Ctrl+C` Storybook, commit с правкой:

```bash
git add src/themes/<theme>.css
git commit -m "chore(themes): tune Yandex button colors in <theme>"
```

Если ничего не правил — без коммита, иди дальше.

- [ ] **Step 5.5: `Ctrl+C` Storybook**

---

## Task 6: Browser smoke E2E — Yandex sign-in + «провайдер = аккаунт» инвариант

**Files:** ничего не меняется.

**Цель:** проверить end-to-end, что Yandex-вход реально работает в браузере. Phase 8 main acceptance criterion. **Этот шаг — без коммита**, это verification.

> **Очень важно.** Phase 3 race-fix (`+layout.svelte:30-35`) защищает Yandex flow тоже, потому что re-wire на `auth.token` change не provider-specific. Если этот fix вдруг сломался (вернулся к Phase-3-pre-fix code) — Yandex login покажет тот же симптом «UserMenu вечный loading». См. Step 6.6 для диагностики.

- [ ] **Step 6.1: Запустить dev-сервер**

В отдельном терминале (терминал 1 — watcher `make convex`; терминал 2 — рабочий шелл; терминал 3 был занят Storybook'ом в Task 5, освободился после Ctrl+C на Step 5.5):

```bash
make dev
```

Vite на `http://localhost:5173`.

> **Watcher liveness не влияет на OAuth callback.** Yandex перенаправляет на `wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/yandex` — это **cloud deployment endpoint**, который держит Convex infrastructure независимо от твоего локального watcher'а. Watcher нужен только для type-codegen (`convex/_generated/`). Если watcher умер между Task 2 и сейчас — `make check` и `make dev` работают на закэшированном `_generated/`, OAuth flow в браузере проходит как обычно. Если codegen стал устаревшим — перезапусти watcher.

- [ ] **Step 6.2: Cold start — clear localStorage**

В браузере открой DevTools → Application → Local Storage → `http://localhost:5173`. Удали всё. Также Cookies → удалить записи для `localhost:5173` И `wandering-ocelot-9.eu-west-1.convex.site` (convex-auth-svelte хранит state cookies на backend domain).

**Альтернатива — Incognito:** `http://localhost:5173/signin` в Incognito mode даёт чистый FlowTyping-state, но в Yandex Step 6.3.5 придётся ввести Yandex credentials с нуля (Incognito не делит Yandex session с обычным окном). Это OK — ожидаемо, потеряет ~30 секунд.

- [ ] **Step 6.3: Sign in via Yandex**

> **Про flow:** Convex Auth + `@auth/core/providers/yandex` использует **redirect-flow** (не popup) — тот же путь что GitHub в Phase 3 и Google в Phase 4. Текущая вкладка уходит на `oauth.yandex.ru`, после авторизации возвращается на `localhost:5173`.

1. Открой `http://localhost:5173/signin`
2. Должен быть SignInScreen с **тремя** кнопками + оговорка
3. Клик «Войти через Yandex»
4. Браузер перенаправляет на `oauth.yandex.ru/authorize?...` (current tab — не popup)
5. Yandex показывает «Войти в Yandex» — введи credentials whitelisted-аккаунта (тот, под которым регистрировал OAuth app в Pre-flight, или любой с подтверждённым email). **Если уже залогинен в Yandex в браузере** — Yandex может пропустить шаг логина и сразу перейти на consent screen
6. Yandex показывает consent screen «Приложение FlowTyping (dev) запрашивает доступ к: имени, эл. почте, портрету» → **«Разрешить»** (Continue). **Возможный пропуск:** если ты уже даровал согласие этому OAuth Client'у раньше (второй заход после прерывания, или smoke-цикл повторяется после rollback и re-merge) — Yandex может skip'нуть consent screen и перенаправлять сразу на callback. Это нормально, не failure mode.
7. Yandex перенаправляет на `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/yandex?code=...`
8. Convex обрабатывает callback → `createOrUpdateUserHandler` создаёт user → перенаправляет на `SITE_URL=http://localhost:5173/`
9. Фронт грузится, `setupConvexAuth` + reactive `setAuth` (layout) восстанавливают session
10. Header показывает `<UserMenu>` с твоим Yandex-именем (`display_name` или `real_name` — provider normalization выбирает первое доступное)

> **Если flow прерван** (закрыл вкладку Yandex до Шага 6, нажал browser-back): просто открой `http://localhost:5173/signin` заново. Компонент перемонтируется, все три кнопки активны. `signingIn=true` state на старой `/signin` instance не существует — после navigation он сброшен.

**PASS criterion:** Header показывает UserMenu с твоим Yandex-именем + в Convex dashboard в `users` появилась свежая строка (Step 6.4 это подтвердит).

**Если** на шаге 10 UserMenu в loading (`…`) — открой DevTools Console; смотри ошибки. Также Step 6.6 — diagnose табличка.

- [ ] **Step 6.4: Verify юзер в Convex `users`**

В отдельном tab:

```bash
npx convex dashboard
```

Открой таблицу `users` — найди свежую запись с твоим Yandex email + name. Запиши `_id` (нужен для Step 6.5).

- [ ] **Step 6.5: «Провайдер = аккаунт» инвариант — проверка**

Это **business-critical assertion** (umbrella plan: «Связывание аккаунтов — NO link-by-email»).

**Защита уровнем выше уже есть:** `convex/auth.test.ts:44-61` содержит unit-тест на `createOrUpdateUserHandler` который явно валидирует «один email через два разных `existingUserId=null`-вызова → две разные строки». Этот тест уже зелёный (Phase 2 baseline) и продолжит быть зелёным после Phase 8, потому что handler провайдер-agnostic. То есть **если `convex/auth.test.ts` зелёный — инвариант сохранён** независимо от того, удалось ли провести browser-level проверку.

Step 6.5 — это **доп. подтверждение через реальный браузер**, не единственная gate. Делай тот вариант, который доступен:

**Вариант А — реальный совпадающий email (предпочтительный, если есть)**
Условие: твой Yandex-аккаунт и твой GitHub-аккаунт (или Google-аккаунт) имеют **одинаковый primary email**. Часто у разработчиков это так — `me@gmail.com` зарегистрирован и в Yandex (как backup), и в GitHub.
1. Sign out из текущей Yandex-сессии (клик на имя в Header → «Выйти») → Header показывает «Войти»
2. DevTools → Application → Cookies: проверить **обе** записи: `localhost:5173` И `wandering-ocelot-9.eu-west-1.convex.site`. Удалить всё на обоих. Затем Application → Local Storage → `localhost:5173` → Clear.
3. Sign in via GitHub (или Google) на `/signin`. Если после OAuth flow ты сразу залогинен как Yandex-юзер (без выбора GitHub-account) — это может быть: (a) cookies на `.convex.site` остались, вернись к Шагу 2; (b) GitHub.com сам помнит тебя — открой `github.com` в той же вкладке и нажми Sign out; (c) refresh-token в `localStorage` не был почищен — DevTools → Application → Local Storage → Clear для `localhost:5173`.
4. Открой Convex dashboard → таблица `users`: должны быть **ДВЕ строки** с одним email, разными `_id`

**Вариант Б — опереться на unit-тест (полностью допустимая альтернатива)**
Не fallback по причине failure'а — это самостоятельный путь, который покрывает инвариант на уровне handler'а напрямую. Выбирай его если: нет совпадающего email между Yandex и GitHub/Google; не хочется регистрировать совпадающий email только ради проверки; cookie hygiene в Варианте А не сходится за один заход. **Условие**: `make test` зелёный, в выводе явно видна группа `convex/auth.test.ts` → `createOrUpdateUserHandler — provider = account` → тест `does NOT link by email — same email through different provider yields two separate users` как passing.

Если выбрал Вариант Б — **в Step 7.6 (merge commit message)** добавь финальную строку в HEREDOC перед `EOF`:
```
Browser-level cross-provider check skipped; covered by unit test
convex/auth.test.ts → "does NOT link by email — same email through
different provider yields two separate users".
```

> **Намеренно не предлагаем «временную mutation для смены email»** как третий вариант. Mutation без auth-check'а на cloud-reachable deployment = cross-user email-change backdoor (anyone with deployment URL + user `_id` может изменить email любого юзера). Окно exposure до cleanup-коммита неприемлемо. Unit-тест уже покрывает то же property без security риска.

**Что считать провалом проверки** (Вариант А): после Sign-in вторым провайдером в `users` остаётся **одна строка** (с email от первого провайдера) → handler делает link-by-email где не должен → **не merge'ить Phase 8**. Escalate: смотри `convex/auth.ts` (handler) и `convex/auth.test.ts` (тесты).

- [ ] **Step 6.6: Если smoke fails — diagnose**

| Симптом | Причина | Куда смотреть |
| --- | --- | --- |
| Кнопка Yandex не реагирует | Context не установлен → `useAuth()` падает | `+layout.svelte` порядок: `setupConvexAuth` → reactive `$effect` → `createAuthStore` |
| Yandex OAuth flow есть, callback вернулся, но `users` пуста | `createOrUpdateUserHandler` failure / Convex env missing | `npx convex logs` за последнюю минуту; `npx convex env list \| grep AUTH_YANDEX` |
| Юзер в `users`, но UserMenu `loading` бесконечно | Race на post-OAuth setAuth — Phase 3 fix сломан или wrapper bug | Verify reactive `$effect` блок (`if (auth.token) convex.setAuth(...)`) в `src/routes/+layout.svelte` живой |
| Callback вернулся, но браузер на пустой странице / 404 после OAuth | `SITE_URL` не выставлен или указывает не туда | `npx convex env list \| grep SITE_URL` — должен быть `http://localhost:5173`. Если пусто/другое: `npx convex env set SITE_URL http://localhost:5173` |
| Yandex `redirect_uri_mismatch` | URI в Yandex OAuth Console !== Convex callback URL | `oauth.yandex.ru` → твоё приложение → Edit → Redirect URI: должно быть **ровно** `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/yandex` |
| Yandex consent screen без email scope | scope не отмечен при регистрации | `oauth.yandex.ru` → твоё приложение → Edit → отметить «Доступ к адресу электронной почты» |
| `users` row создан, но `email` поле `undefined`/`null` | Scope `login:email` не выдан или email не подтверждён в Yandex Passport | Проверить scope в OAuth Console; проверить `passport.yandex.ru` → твой email confirmed |
| `users` row создан, но `name` поле `undefined`/`null` | Scope `login:info` не выдан или у Yandex-аккаунта нет display_name/real_name/first_name | Проверить scope в OAuth Console; проверить, что в `passport.yandex.ru` указано имя |
| «Провайдер = аккаунт» инвариант сломан в browser smoke | createOrUpdateUserHandler ловит existingUserId по email | `convex/auth.test.ts` тесты на handler должны быть зелёными. Если зелёные — баг где-то в wrapper'е, эскалировать. Если красные — баг в handler'е |

**Если smoke не идёт за разумное время** (30 мин diagnose) — **остановись** (НЕ продолжай к Task 7) и escalate user'у. Done criteria требует green smoke + green инвариант; merge без них не делаем.

- [ ] **Step 6.7: No commit — это verification**

```bash
git status --porcelain    # должно быть пусто (никаких локальных правок Task 6)
```

Тестовые юзеры в `users` (Yandex + GitHub/Google) можешь почистить через dashboard или оставить как seed.

---

## Task 7: CLAUDE.md update + merge в master

**Files:**
- Modify: `CLAUDE.md`

**Цель:** обновить документацию (текущие провайдеры — GitHub + Google + Yandex; обновить контракт-счётчик 111 → 115) + merge feature-branch'а.

- [ ] **Step 7.1: Найти и обновить упоминания провайдеров в CLAUDE.md**

Открой `CLAUDE.md`. Найди строку (около `:88`):

```
- Текущие провайдеры: GitHub, Google. Yandex/Apple/SberID — Roadmap V2.
```

Замени на:

```
- Текущие провайдеры: GitHub, Google, Yandex. Apple/SberID — Roadmap V2.
```

(Yandex переехал из Roadmap в активные. Apple и SberID остаются в Roadmap V2.)

- [ ] **Step 7.2: Обновить контракт-счётчик и сверить остальные места**

Сначала получи точное число токенов после Task 4 (самый надёжный способ):

```bash
# Каждый токен — отдельная строка вида `'--token-name',` в *.contract.ts:
grep -rh "^  '--" src/components src/Root.contract.ts | sort -u | wc -l
```

Ожидаемо: **115** (было 111, +4 Yandex).

Найди строку в CLAUDE.md (около `:125`):

```
Все 17 контрактов агрегируются в `src/themes/contract.ts → THEME_CONTRACT` (111 токенов). Контракт-тест `src/themes/contract.test.ts` enforce-ит, что каждая тема (`src/themes/<id>.css`) и `_template.css` декларируют каждый токен; значения свободны.
```

Замени `(111 токенов)` на `(115 токенов)`. Число «17 контрактов» — без изменений (Phase 8 не добавляет новых контракт-файлов).

Затем сверь остальные места про провайдеров (часть остаётся без правок, одна строка про env vars — обязательная правка, см. ниже):

```bash
grep -n "Google\|GitHub\|Yandex\|providers" CLAUDE.md
```

Просмотри результат. Места:
- **«Один email через GitHub и Google = два разных юзера»** (`:85`) — формулировка корректна (это пример инварианта; Yandex добавляет ещё одну вариацию, но смысл тот же). Можно опционально расширить: «Один email через GitHub, Google или Yandex = три разных юзера». Решение по вкусу — не критично; оставим оригинал, чтобы не разрастать.
- **«Add new OAuth provider: Import из `@auth/core/providers/<name>`...»** (`:91`) — без правок, инструкция универсальная, Phase 8 фактически проверила её на третьем провайдере.
- **«`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`»** (`:101`) — **обновить (required)**:

```
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_YANDEX_ID`, `AUTH_YANDEX_SECRET` — credentials OAuth Apps (см. `Add new OAuth provider`).
```

Симметрия = меньше когнитивной нагрузки. Оставлять только GitHub+Google после Phase 8 = docs↔code drift.

- **«Один email через GitHub vs Google = два юзера = два независимых settings row»** (`:147`, Phase 5 секция) — без правок (Phase 5 пример; смысл идентичен — Yandex просто добавляет третий случай, но формулировка остаётся валидной).

Все правки идут в этот же `docs(auth)` коммит.

- [ ] **Step 7.3: `make check-all`**

```bash
make check-all 2>&1 | tail -10
```

Zero errors. Markdown lint (если есть в `make lint`) — должен пройти.

- [ ] **Step 7.4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(auth): reflect Yandex as third active provider, update contract count (111→115)"
```

- [ ] **Step 7.5: Финальная сверка коммитов ветки + secret-leak grep**

```bash
git log master..feat/auth-yandex-provider --oneline
git diff master..feat/auth-yandex-provider --stat
```

Ожидаемо: **5 коммитов** (Task 1, 2, 3, 4, 7). Task 5 — без коммита по умолчанию; Task 6 — без коммита (verification). Если ты делал в Task 5 tune-commit на oklch-значения — получится 6.

**Secret-leak guard** — критическая последняя проверка перед merge. Pre-flight включал работу с Yandex Client Secret; если он случайно (через комментарий, debug-print, `.env.local`) попал в git — нужно остановиться:

<!-- cSpell:ignore GOCSPX -->
```bash
# 1) Проверка по содержимому: Yandex client secret — буквенно-цифровая строка
#    без фиксированного префикса (в отличие от Google GOCSPX-). Самый надёжный
#    sentinel — само имя переменной (любой формат: dotenv, YAML, shell):
git log -p master..feat/auth-yandex-provider | \
  grep -iE 'AUTH_YANDEX_SECRET\s*[=: ]' || echo "clean (content scan AUTH_YANDEX_SECRET)"

# 2) Yandex client_id — тоже UUID-like; проверим что нигде не залип:
git log -p master..feat/auth-yandex-provider | \
  grep -iE 'AUTH_YANDEX_ID\s*[=: ][^*\s]+\w' | grep -v '<' || echo "clean (content scan AUTH_YANDEX_ID)"

# 3) Проверка по именам файлов: .env* никогда не должны попадать в diff:
git diff master..feat/auth-yandex-provider --name-only | grep -E '\.env(\.|$)' && echo "WARN: env file in diff!" || echo "clean (file scan)"
```

Файловый scan ловит `.env.local`, `.env.production` и т.д. — `.env*` в `.gitignore`, но если кто-то форс-добавил `-f` — поймаем здесь. Yandex secret не имеет фиксированного префикса (в отличие от Google `GOCSPX-`), поэтому единственный надёжный sentinel — само имя env var'и.

Если хоть один grep что-то нашёл — **НЕ merge'ить**: `git reset --hard master`, разобраться где утечка, переделать ветку. **Не пытайся «удалить из истории»** — Secret уже скомпрометирован: `oauth.yandex.ru` → твоё приложение → Edit → **«Заменить пароль»** (Reset secret), обновить `AUTH_YANDEX_SECRET` в Convex env, заново.

- [ ] **Step 7.6: Divergence check + merge**

```bash
# Сверить, что origin/master не уехал вперёд (не должен — push не делался)
git remote get-url origin >/dev/null 2>&1 && \
  (git fetch origin 2>/dev/null || echo 'WARN: fetch failed')
git rev-parse origin/master 2>/dev/null && {
  git log master..origin/master --oneline
} || echo "No origin/master ahead — skipping"

git switch master
# Если merge даёт conflict (типично — кто-то другой правил CLAUDE.md):
#   git merge --abort
#   git switch feat/auth-yandex-provider
#   git rebase master            # resolve conflicts here
#   git switch master
#   git merge --no-ff feat/auth-yandex-provider ...
git merge --no-ff feat/auth-yandex-provider -m "$(cat <<'EOF'
feat(auth): add Yandex OAuth as third provider

Phase 8 of docs/plans/auth.md. Adds Yandex as a third OAuth provider
alongside GitHub (Phase 3) and Google (Phase 4):

- src/lib/auth/auth.types.ts: extract OAuthProviderId from
  SignInScreen.svelte local scope to shared module; widen union to
  'github' | 'google' | 'yandex'. Phase 4 plan deferred this extract
  until a third consumer appeared — Phase 8 is that moment.
- convex/auth.ts: import Yandex from @auth/core/providers/yandex,
  add to providers array. createOrUpdateUserHandler unchanged
  (provider-agnostic; "provider = account" invariant holds).
- SignInScreen.svelte: import shared OAuthProviderId (replace local
  type), add third button "Войти через Yandex" with provider-specific
  CSS class.
- SignInScreen.contract.ts: +4 tokens for Yandex button
  (background/color/border/hover-background).
- Themes: declare and fill Yandex tokens across _template.css +
  light/dark/sepia/nord (4 lines per file). Visual style: neutral,
  no brand colors — GitHub + Yandex "contained" pair vs Google
  "outlined" lone, in each theme.
- CLAUDE.md: reflect GitHub + Google + Yandex as active providers,
  Apple/SberID remain in Roadmap V2; update contract count 111→115.

"provider = account" invariant remains intact (covered by
convex/auth.test.ts; cross-provider sign-in browser-checked where
feasible — see Task 6.5 for details).
EOF
)"
```

- [ ] **Step 7.7: Post-merge `make check-all`**

```bash
make check-all 2>&1 | tail -10
```

Zero errors. Если падает (хотя пред-merge был зелёный) — `git reset --hard ORIG_HEAD` сразу и разбираться.

- [ ] **Step 7.8: Удалить feature-ветку**

```bash
git branch -d feat/auth-yandex-provider
```

---

## Done criteria (перед merge в master)

- [ ] `make check-all` зелёный (lint + check + test + spell + build) — Task 4 и Task 7
- [ ] Все темы декларируют 4 новых Yandex-токена (`make test` → contract-тест зелёный)
- [ ] Storybook отображает все три кнопки во всех 4 темах согласовано (Task 5 — глаз-проверка)
- [ ] `OAuthProviderId` extract'нут в `src/lib/auth/auth.types.ts` (shared, не local) (Task 1)
- [ ] **Browser smoke** (Task 6): real Yandex sign-in работает end-to-end → юзер в `users` → имя в Header → sign-out возвращает в `guest`
- [ ] **«Провайдер = аккаунт» инвариант** (Task 6.5): подтверждён либо Вариантом А (browser: одинаковый email через Yandex и другой провайдер → две `users`-строки), либо Вариантом Б (unit-тест `convex/auth.test.ts` → `does NOT link by email — same email through different provider yields two separate users` зелёный)
- [ ] `CLAUDE.md` обновлён: GitHub + Google + Yandex как активные провайдеры; контракт-счётчик 111 → 115 (Task 7)

## Rollback plan

**До merge** — `git switch master && git branch -D feat/auth-yandex-provider`. Удалит ветку. `AUTH_YANDEX_ID/SECRET` в Convex env можешь почистить: `npx convex env remove AUTH_YANDEX_ID && npx convex env remove AUTH_YANDEX_SECRET`.

**После merge, если post-merge `make check-all` сломался** — `git reset --hard ORIG_HEAD` сразу. Состояние master возвращается в `a987bdc`. Side effects:
- Cloud Convex deployment — Yandex provider **остаётся live на backend'е** (env vars + deployed `auth.ts` с `[GitHub, Google, Yandex]`). Frontend rollback'нулся, поэтому `signIn('yandex')` никто не вызовет, но endpoint `/api/auth/callback/yandex` всё ещё принимает coded redirect от Yandex. Практически безвредно (нужно знать URL + перехватить Yandex auth code), но не литерально zero-state.
  - **Рекомендуемая чистка после rollback'а:** дополнительным коммитом на master вернуть `convex/auth.ts` к `providers: [GitHub, Google]` (revert одной строки + удалить Yandex import). Watcher (`make convex`) ДОЛЖЕН быть запущен — он пушит изменение в cloud. Если watcher не запущен — `npx convex dev --once` за один раз. После пуша `/api/auth/callback/yandex` начнёт возвращать ошибку «Unknown provider».
  - Optional: удалить env vars (`npx convex env remove AUTH_YANDEX_ID && npx convex env remove AUTH_YANDEX_SECRET`). Не критично — `auth.ts` без Yandex в providers их игнорирует.
- Yandex OAuth app — оставь зарегистрированным; не вредит, пригодится при повторной попытке.

## Side effects на Convex deployment

Phase 8 трогает cloud dev deployment один раз — это **add-only**:
- `AUTH_YANDEX_ID/SECRET` появляются в env (Pre-flight)
- `convex/auth.ts` push'нется watcher'ом в момент Task 2 → backend начнёт принимать `signIn('yandex')`
- Никаких schema migrations (`users` table расширения не делает Yandex; новые поля типа `psuid` / `default_avatar_id` остаются в Auth.js нормализации, в DB попадает только `{ email, name, image }`)
- Никаких удалений / переименований

В случае Phase 8 abort — env vars можно почистить (см. Rollback). Никакой data corruption невозможен.

## What's captured for Phase 9 (Apple OAuth)

После Phase 8 у тебя:
- **Три рабочих провайдера** через тот же auth-flow и тот же `users`-table. Phase 9 (Apple) пойдёт по тому же шаблону — Apple provider в `@auth/core/providers/apple` (verified в node_modules), normalization profile shape тот же `{ id, name, email, image }`.
- **`OAuthProviderId` уже shared.** Phase 9 нужно расширить union до `'github' | 'google' | 'yandex' | 'apple'` одной строкой в `src/lib/auth/auth.types.ts`. SignInScreen import не меняется.
- **Theme tokens паттерн утверждён повторно.** Phase 9 = +4 токена для Apple, +4 строки в 5 файлах темы. Линейный рост принят как стиль.
- **Browser smoke рутина** теперь stable: clear localStorage + cookies (`.convex.site`!), OAuth flow в одной вкладке, проверить `users` в dashboard, опционально проверить cross-provider инвариант.
- **Apple specifics** (отличные от Yandex):
  - Apple OAuth требует **Apple Developer Program membership** ($99/год) — Pre-flight Phase 9 включает оплату/верификацию.
  - Apple требует **domain verification** через `.well-known/apple-developer-domain-association.txt` — для dev deployment'а это сложнее, чем у Yandex (нужен HTTPS endpoint, который Apple проверит). Возможно потребуется production-deployment с verified domain раньше Phase 9.
  - Apple OAuth response shape — отдельный edge case: email **может быть hidden relay** (`@privaterelay.appleid.com`) или **может отсутствовать вообще** во втором логине того же пользователя. Это `email?: string | null` — handler уже это терпит, но проверь в Phase 9 что cross-provider инвариант не пострадает (два Apple-логина одного пользователя могут получить разные email-relay → две `users`-строки, что согласуется с «провайдер = аккаунт», но может быть неожиданно).

## Self-review notes

1. **Spec coverage vs umbrella Phase 8 (Roadmap V2 первая фаза):**
   - `convex/auth.ts` — import + providers array ✓ Task 2
   - `SignInScreen.svelte` — кнопка Yandex ✓ Task 3
   - `OAuthProviderId` extract — отложенное решение Phase 4 plan'а ✓ Task 1 (закрывает технический долг)
   - Env vars в Convex ✓ Pre-flight
   - Yandex OAuth Console registration ✓ Pre-flight (с пошаговой инструкцией по запросу пользователя)
   - «Провайдер = аккаунт» verification ✓ Task 6.5 (Вариант А — browser-level либо Вариант Б — unit-test fallback)
   - CLAUDE.md обновление ✓ Task 7 (включая контракт-count drift fix 111 → 115)

2. **Placeholder scan:**
   - Все шаги содержат полный код / точные команды / ожидаемый output.
   - Theme oklch значения для Yandex-кнопки — конкретные числа (не «подобрать»). Implementer может в Task 5 их подкрутить, если визуально плохо — это явная итерация, не placeholder.
   - Step 6.5 invariant verification — конкретная процедура (sign in Yandex, out, in GitHub/Google, check 2 строк), не «проверить инвариант».
   - Pre-flight Yandex OAuth registration — пошаговая инструкция с точными UI-strings (название сервиса, Redirect URI, scopes), не «зарегистрируй app».

3. **Type consistency:**
   - `AuthStore` тип — импортируется из `@/lib/auth/auth-store.svelte` (matches existing `SignInScreen.svelte` Phase 4 code).
   - `OAuthProviderId = 'github' | 'google' | 'yandex'` — extract'нут в `src/lib/auth/auth.types.ts` (Task 1), импортируется в SignInScreen (Task 3). После Task 3 local-копия типа удалена.
   - Имена CSS-токенов идентичны во всех правках (`--sign-in-screen-btn-yandex-{background|color|border|hover-background}`) — без drift'а.
   - Имя ветки `feat/auth-yandex-provider` — идентично во всех Pre-flight, Task 7.5, Task 7.6 шагах. Не плывёт.
   - Контракт-counter `111 → 115` — упоминается в Starting state и в Task 7.2; число согласовано (verified `grep | wc -l` → 111 на старте; +4 Yandex = 115).

4. **Известные риски:**
   - Reactive `setAuth` fix в layout — закрывает race; если кто-то его удалит при повышение версии wrapper'а — Yandex login покажет «UserMenu loading forever» баг. Step 6.6 ловит.
   - Theme `oklch`-значения для Yandex — субъективны. Task 5 (Storybook visual review) — buffer для подгонки. Стратегия «contained pair (GitHub+Yandex) vs outlined (Google)» — мой выбор; если пользователю эстетически не зайдёт, можно перевернуть.
   - Yandex consent screen на русском — это OK для dev smoke; настройки приложения тоже на русском. Pre-flight инструкция написана на смеси (`Доступ к адресу электронной почты` русский, `login:email` английский) — implementer должен сопоставить по смыслу, не по строгому имени.
   - Yandex `email` может быть `null` если пользователь его не подтвердил в Yandex Passport. Step 6.6 diagnose-табличка это ловит. По умолчанию requirements в Pre-flight: «подтверждённый email».
   - **Cspell**: `yandex` / `Yandex` — английский label, не должны падать. Если упадут — whitelist (доменный термин, внешнее имя), это OK. Не whitelist'и `yapic`-подобные production-only вещи если их в нашем коде нет.

5. **Что НЕ в плане (явно):**
   - Иконки/логотипы провайдеров — нет (явное решение пользователя).
   - Брендовые цвета Yandex (красный/жёлтый) — нет (явное решение пользователя).
   - Кастомизация «remember me» / session TTL — wrapper-defaults используются.
   - Account linking UI (объединить два user рекорда) — Phase 10 (Roadmap V2).
   - Apple/SberID setup — отдельные фазы (9/11 в Roadmap V2).
   - Поддержка Yandex `psuid` / `default_avatar_id` — Auth.js normalization выкидывает эти поля, мы в DB храним только нормализованные `email/name/image`. Avatar URL конструкция из `default_avatar_id` — orthogonal задача (если когда-то захотим показывать аватары в UserMenu — отдельный PR).
   - Push на origin — задача пользователя (memory `feedback_no_ahead_count.md`), план её не делает.
