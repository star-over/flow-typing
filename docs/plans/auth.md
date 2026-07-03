# Auth — план внедрения Convex Auth

Umbrella-план интеграции аутентификации в FlowTyping. Разбит на фазы; каждая фаза — отдельная ветка, отдельный план, отдельный merge. Фазы независимы по deliverable, но зависят по порядку (нельзя начать Phase 3 без Phase 2).

## Статус

| Фаза | Статус | Merge / Note |
| --- | --- | --- |
| Phase 0 — Организационная подготовка | ✅ done | Convex cloud аккаунт зарегистрирован; проект `flow-typiing` (опечатка в имени — не препятствие) |
| Phase 1 — Bootstrap Convex | ✅ done | merge `2b0380b` + follow-up `c86803c` (startup guard) |
| Phase 2 — Convex Auth backend | ✅ done | merge `f3436e8` |
| Phase 3 — Auth UI: store + SignIn + UserMenu | ✅ done | merge `60c92de` + follow-up `4fa23ce` (post-merge minor findings) |
| Phase 4 — Google-провайдер | ✅ done | merge `0f3b3ee` |
| Phase 5 — Settings sync | ✅ done | merge `11fb2ca` |
| Phase 8 — Yandex-провайдер | ✅ done | merge `4d4cb58` |
| Phase 6 — Sessions tracking | ✅ done | реализовано иначе: журнал `sessionSummaries` (план `2026-06-24-session-summaries.md`) |
| Phase 7 — `/stats` с реальными данными | ✅ done | таблица сеансов + прогресс ступени (план `2026-06-24-stats-sessions-table.md`) |
| Phase 9 — Apple-провайдер | 📋 backlog | `docs/backlog.md` (driver = Apple Developer enrollment) |
| Phase 10 — Account linking V2 | 📋 backlog | `docs/backlog.md` (driver = user request) |
| Phase 11 — SberID | 📋 backlog | `docs/backlog.md` (driver = бизнес-need + ИП/ООО) |
| Phase 12 — Telegram | 📋 backlog | `docs/backlog.md` (driver = бизнес-need в Telegram-аудитории; не OAuth, custom HMAC flow) |

**Convex deployment mode:** **cloud dev** (`dev:wandering-ocelot-9`, EU-West-1). Выбран ради HTTPS (нужно для Apple OAuth в Phase 9) и production-equivalence. Free tier покрывает.

Подробный план Phase 1: `docs/plans/2026-06-10-phase-1-bootstrap-convex.md`.

## Зафиксированные решения

| Решение | Значение | Аргумент |
| --- | --- | --- |
| Backend для auth | **Convex Auth** (`@convex-dev/auth`) | бесплатно, юзеры в твоей БД, нет vendor lock-in, поддерживает любые OAuth провайдеры через `@auth/core` (включая Yandex и собственные — для SberID) |
| Convex deployment | **Cloud dev tier** (`dev:wandering-ocelot-9`, EU-West-1) | HTTPS из коробки (нужен для Apple OAuth, Phase 9), production-equivalence, не нужен local daemon. Free tier покрывает |
| Frontend-режим | **SvelteKit `adapter-static` + SPA-only auth** («гибрид») | соответствует текущей архитектуре, бесплатный хостинг, риски SPA-auth для typing-trainer'а пренебрежимы |
| Связывание аккаунтов | **Провайдер = аккаунт** (NO link-by-email) | безопасность приоритетнее эргономики; цена — UX-ловушка «один и тот же email через GitHub и Google = два разных юзера», смягчаем явной коммуникацией в UI |
| Scope резервной копии | **Settings + historical session stats** (без сырых attempts) | покрывает 95% задач «cross-device backup», экономно по storage |
| Гостевой режим | ~~Поддерживается~~ **Снят** (superseded ADR 0012, 2026-07-03) | полу-режим «печатает без роста профиля» нарушал soft-progression по построению; тренировка требует входа; возврат гостя — только анонимным профилем (ADR 0005/0012) |
| MVP-провайдеры | **GitHub + Google** | минимально полезный путь, проверка всей обвязки на двух провайдерах |
| Roadmap-провайдеры | Yandex → Apple → SberID | по возрастанию организационной сложности |

## Архитектурные правила игры

Эти правила соблюдаются во всех фазах. Их нарушение делает миграцию на SSR в будущем дорогой; их соблюдение — делает её правкой 3-4 файлов.

### Правило 1: трёхзначное auth-состояние, никогда двузначное

```ts
type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User }
  | { status: 'guest' }
```

Каждое место в UI, зависящее от auth, обрабатывает все три ветки. Никаких `if (user) ... else ...`.

### Правило 2: один источник правды — `authStore`

Никакого `localStorage.getItem('convex-token')` врозь по компонентам. Чтение/запись токена — только через `src/lib/auth/auth-store.svelte.ts`. Компоненты подписываются на хранилище.

### Правило 3: бизнес-функции получают `userId` параметром, не лезут за ним сами

Mutations и queries не зовут `authStore` внутри. Вызывающий компонент решает, откуда взять `userId`, и передаёт его как аргумент.

### Правило 4: никаких `*.server.ts` файлов

`+page.server.ts`, `+layout.server.ts`, `hooks.server.ts` — не создаём, пока проект на `adapter-static`. Эти файлы работают в dev-режиме и ломаются в build — ловушка. Auth-логика только в `*.svelte` и `.svelte.ts`.

## Каркас фазы

Каждая фаза содержит:

- **Цель** — что фаза достигает (одно предложение)
- **In scope / Out of scope** — явные границы
- **Ветка** — `feat/...` или `chore/...`
- **Изменения файлов** — что создаётся / правится
- **Шаги реализации** — ordered, с привязкой к коду
- **Стратегия тестов** — что и как тестируем
- **Done criteria** — testable, проверяемые
- **Verification** — `make check-all` обязательно, плюс ручная проверка
- **Merge** — локальный merge ветки в `master` (`git switch master && git merge --no-ff feat/<x>`); push на remote не предполагается планом

---

## Phase 0 — Организационная подготовка ✅

**Не фаза в коде. Чек-лист предусловий перед Phase 1.**

- [x] Зарегистрироваться на [convex.dev](https://convex.dev) (Google/GitHub-login, бесплатно)
- [x] Подтвердить, что dev-машина имеет Node ≥ 18 (`node -v` = v24.9.0)
- [x] Решить: имя проекта в Convex — `flow-typiing` (typo, не препятствие); deployment `wandering-ocelot-9` (EU-West-1)
- [x] Закрепить за собой `master` как merge-target всех фаз

**Время:** 10 минут. **Никаких коммитов.**

---

## Phase 1 — Bootstrap Convex (без auth) ✅

**Статус: merged `2b0380b` (Phase 1 main) + `c86803c` (startup guard follow-up).** Детальный план был адаптирован под cloud mode перед исполнением, см. `docs/plans/2026-06-10-phase-1-bootstrap-convex.md`. Ниже — оригинальный umbrella-набросок, оставлен для будущей справки.

**Цель.** Convex встроен в проект как backend; минимальный query/mutation проходит end-to-end в браузере; `make check-all` зелёный.

### Scope

**In:**
- Установка `convex` пакета
- Инициализация `convex/` директории через `npx convex dev`
- Минимальный `convex/schema.ts` с диагностической таблицей `health`
- Минимальный `convex/health.ts` (query `ping`, mutation `tick`)
- Singleton-клиент `src/lib/convex.ts`
- Проверочный вызов из `+layout.svelte` (или dev-only страница) — убедиться, что connection работает
- Обновление `.env.example`, `Makefile`, `CLAUDE.md`, `cspell.json`

**Out:**
- Auth (отдельная фаза)
- Продуктовые таблицы (`userSettings`, `sessions` — отдельные фазы)
- Любые UI-изменения помимо проверочного вызова

### Ветка

`feat/convex-bootstrap`

### Изменения файлов

| Действие | Путь | Что |
| --- | --- | --- |
| new | `convex/_generated/` | автогенерируется CLI |
| new | `convex/schema.ts` | `defineSchema({ health: defineTable({ tickedAt: v.number() }) })` |
| new | `convex/health.ts` | `query ping → "pong"`, `mutation tick → insert tickedAt: Date.now()` |
| new | `convex.json` | конфиг Convex (минимальный) |
| new | `src/lib/convex.ts` | `export const convex = new ConvexClient(PUBLIC_CONVEX_URL)` |
| new | `src/routes/_dev/+page.svelte` | dev-only страница с кнопкой «ping» (удаляется в Phase 3) |
| modify | `package.json` | добавить `convex` в deps |
| modify | `.env.example` | `PUBLIC_CONVEX_URL=` placeholder |
| modify | `.gitignore` | добавить `.env.local`, если ещё не игнорируется |
| modify | `Makefile` | новый target `make convex` для `npx convex dev` |
| modify | `CLAUDE.md` | добавить секцию «### Convex backend» внутри `## Architecture` |
| modify | `cspell.json` | добавить `convex`, `Convex` в whitelist |

### Шаги реализации

1. `npm install convex` (через `make` нет — package-level)
2. `npx convex dev` → ввести имя проекта → получить deployment URL
3. CLI создаст `convex/`, `convex.json`, `.env.local`
4. Перенести `CONVEX_DEPLOYMENT` (если нужен) и `PUBLIC_CONVEX_URL` в `.env.local`; в репозиторий положить `.env.example` с пустыми значениями
5. Написать `convex/schema.ts` и `convex/health.ts`
6. Написать `src/lib/convex.ts`
7. Написать минимальный `src/routes/_dev/+page.svelte` с кнопкой «ping» и выводом результата
8. Запустить `make dev` + `make convex` в двух терминалах, проверить в браузере
9. Обновить `CLAUDE.md` (секция про Convex, env vars, как стартовать)
10. Обновить `cspell.json`

### Стратегия тестов

- **Unit:** не пишем (нет продуктовой логики)
- **Smoke:** ручная — открыть `/_dev`, нажать ping, увидеть pong; нажать tick, увидеть, что появилась строка в Convex dashboard
- **CI:** `make check-all` должен оставаться зелёным; добавление Convex не должно ломать существующие тесты

### Done criteria

- [x] `npx convex dev` стартует без ошибок
- [x] В Convex dashboard видна таблица `health`
- [x] Из браузера через `/dev` успешно вызывается `ping` (получаем `"pong"`)
- [x] `make check-all` зелёный (250 тестов, 0 ошибок lint/check/spell/build)
- [x] `CLAUDE.md` обновлён: новый разработчик может развернуть проект, прочитав инструкции
- [x] `.env.example` лежит в репозиторий, `.env.local` — нет

### Verification

```bash
make check-all   # lint + check + test + spell + build
make dev         # Vite dev-сервер
make convex      # Convex dev (отдельный терминал)
# Открыть http://localhost:5173/_dev, нажать ping
```

### Merge

Локально:

```bash
git switch master
git merge --no-ff feat/convex-bootstrap -m 'feat(convex): bootstrap Convex backend with health-check endpoint'
git branch -d feat/convex-bootstrap
```

---

## Phase 2 — Convex Auth backend (без UI)

**Цель.** Convex Auth настроен на бэкенде с GitHub-провайдером и собственным `createOrUpdateUser` callback'ом (правило «провайдер = аккаунт»). Sign-in работает из консоли разработчика; в `users` появляется строка.

### Scope

**In:**
- Установка `@convex-dev/auth` и `@auth/core`
- `convex/auth.config.ts`
- `convex/auth.ts` с GitHub-провайдером и собственным `createOrUpdateUser`
- `convex/http.ts` (регистрация auth-роутов)
- Расширение `convex/schema.ts` через `...authTables`
- Минимальный `convex/users.ts` с `viewer()` query
- Регистрация GitHub OAuth app, прописывание env vars в Convex
- Документация в `CLAUDE.md`

**Out:**
- Фронтенд UI (отдельная фаза)
- Google-провайдер (отдельная фаза)
- Любая работа с `userSettings` / `sessions`

### Ветка

`feat/convex-auth-backend`

### Изменения файлов

| Действие | Путь | Что |
| --- | --- | --- |
| new | `convex/auth.config.ts` | whitelist Convex как issuer |
| new | `convex/auth.ts` | `convexAuth({ providers: [GitHub], callbacks: { createOrUpdateUser } })` |
| new | `convex/http.ts` | `auth.addHttpRoutes(http)` |
| new | `convex/users.ts` | `viewer` query — возвращает текущего юзера или `null` |
| modify | `convex/schema.ts` | `defineSchema({ ...authTables, health: ... })` |
| modify | `package.json` | добавить `@convex-dev/auth`, `@auth/core` |
| modify | `CLAUDE.md` | секция «### Authentication» с env vars и провайдерами |
| modify | `cspell.json` | `oauth`, `JWKS`, `JWT`, `OIDC`, и др. |

### Шаги реализации

1. `npm install @convex-dev/auth @auth/core`
2. Запустить setup-скрипт Convex Auth (генерирует `JWT_PRIVATE_KEY`, `JWKS`): команда указана в docs `@convex-dev/auth`
3. Зарегистрировать GitHub OAuth app:
   - GitHub → Settings → Developer settings → OAuth Apps → New
   - Application name: `FlowTyping (dev)`
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/github` (cloud dev deployment, HTTPS)
4. Сохранить Client ID / Secret через CLI:
   ```bash
   npx convex env set AUTH_GITHUB_ID Iv1.xxx
   npx convex env set AUTH_GITHUB_SECRET ghs_xxx
   npx convex env set SITE_URL http://localhost:5173
   ```
5. Написать `convex/auth.config.ts`
6. Написать `convex/auth.ts` с явным `createOrUpdateUser` (см. ниже)
7. Расширить `convex/schema.ts` (`...authTables`)
8. Написать `convex/http.ts`
9. Написать `convex/users.ts`
10. Smoke-проверка: через консоль Convex dashboard вызвать `signIn` с GitHub-токеном, увидеть запись в `users`
11. Обновить `CLAUDE.md`

### Контракт `createOrUpdateUser`

```ts
// convex/auth.ts
import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // existingUserId есть → юзер уже входил через ЭТОТ ЖЕ провайдер
      if (args.existingUserId) return args.existingUserId;

      // Новый OAuth-аккаунт → новый user. НЕ ищем по email.
      return ctx.db.insert("users", {
        email: args.profile.email,
        name: args.profile.name,
        image: args.profile.image,
      });
    },
  },
});
```

### Стратегия тестов

- **Unit (Vitest):** тест `createOrUpdateUser` через `convex-test` — два случая:
  - `existingUserId` передан → возвращается тот же id, новой строки нет
  - `existingUserId` не передан → создаётся новая строка даже если email уже есть в другой строке
- **Smoke:** вручную — sign-in через консоль, проверка строки в Convex dashboard

### Done criteria

- [ ] Все env vars прописаны в Convex deployment
- [ ] Sign-in через GitHub: через Convex dashboard или временный скрипт можно инициировать flow и получить запись в `users`
- [ ] Unit-тесты `createOrUpdateUser` проходят
- [ ] `make check-all` зелёный
- [ ] `CLAUDE.md` содержит инструкцию «как добавить OAuth-провайдера»

### Verification

```bash
make check-all
npx convex env list   # сверить, что все ключи на месте
# Через Convex dashboard или CLI вызвать signIn, проверить users
```

### Merge

Локально:

```bash
git switch master
git merge --no-ff feat/convex-auth-backend -m 'feat(auth): add Convex Auth backend with GitHub provider'
git branch -d feat/convex-auth-backend
```

---

## Phase 3 — Auth UI: store + SignIn + UserMenu

**Цель.** Юзер может зайти через GitHub из браузера, увидеть своё имя в Header, выйти. Auth-state управляется единым `authStore` с тремя ветками (loading/authenticated/guest).

### Scope

**In:**
- `src/lib/auth/auth-store.svelte.ts` — Svelte 5 runes-based store
- `src/lib/auth/auth-client.ts` — обёртки над `@convex-dev/auth`
- `src/lib/auth/auth.types.ts` — `AuthState`, `User`
- `src/components/auth/SignInScreen.svelte`
- `src/components/auth/UserMenu.svelte`
- `src/routes/signin/+page.svelte`
- Обновление `src/routes/+layout.svelte` (bootstrap auth, передача через context)
- Обновление `src/components/app/Header.svelte` (добавить `<UserMenu />`)
- Удаление dev-only `src/routes/_dev/+page.svelte`

**Out:**
- Google-провайдер (Phase 4)
- Любой sync settings/stats (Phase 5+)
- Защита роутов (нечего защищать)

### Ветка

`feat/auth-ui`

### Изменения файлов

| Действие | Путь | Что |
| --- | --- | --- |
| new | `src/lib/auth/auth-store.svelte.ts` | runes-store с `$state<AuthState>` |
| new | `src/lib/auth/auth-client.ts` | `signInWith(provider)`, `signOut()` |
| new | `src/lib/auth/auth.types.ts` | типы |
| new | `src/components/auth/SignInScreen.svelte` | UI с кнопкой «Войти через GitHub» + оговорка |
| new | `src/components/auth/UserMenu.svelte` | имя + аватар + кнопка выхода |
| new | `src/components/auth/SignInScreen.contract.ts` | темизация по проекту (если есть стилизация) |
| new | `src/components/auth/UserMenu.contract.ts` | то же |
| new | `src/routes/signin/+page.svelte` | хост `<SignInScreen />` |
| modify | `src/routes/+layout.svelte` | bootstrap authStore, setContext |
| modify | `src/components/app/Header.svelte` | добавить `<UserMenu />` в angle |
| modify | `src/themes/_template.css` + все темы | добавить токены SignIn/UserMenu |
| modify | `src/themes/contract.ts` | THEME_CONTRACT расширяется новыми токенами |
| delete | `src/routes/_dev/+page.svelte` | dev-проверка больше не нужна |
| modify | `cspell.json` | новые слова при необходимости |

### Шаги реализации

1. Написать `auth.types.ts` — `User`, `AuthState`
2. Написать `auth-client.ts` — тонкие обёртки над `@convex-dev/auth`
3. Написать `auth-store.svelte.ts` — runes-based class с методами `bootstrap`, `signInWith`, `signOut`
4. Bootstrap в `+layout.svelte`: при mount создать store, вызвать `bootstrap()`, передать через `setContext('auth', store)`
5. Написать `SignInScreen.svelte` с оговоркой про «провайдер = аккаунт»
6. Написать `UserMenu.svelte` (loading state, signed-in state)
7. Создать контракты тем для обоих компонентов; добавить токены в `_template.css` и каждую тему
8. Обновить `THEME_CONTRACT` в `src/themes/contract.ts` (контракт-тест должен оставаться зелёным)
9. Обновить `Header.svelte`: добавить `<UserMenu />` в angle
10. Создать роут `/signin` для прямого входа
11. Удалить `_dev`
12. Прогнать `make check-all`

### Стратегия тестов

- **Unit (auth-store):**
  - `bootstrap` со свежим состоянием → переход `loading → guest`
  - `bootstrap` с валидным токеном в storage → переход `loading → authenticated`
  - `signInWith` инициирует redirect — подменяем заглушками Convex client
  - `signOut` → переход `authenticated → guest`, токен удалён
- **Component (Vitest + svelte-testing):**
  - `SignInScreen` рендерит оговорка
  - `UserMenu` рендерит «loading...» при `status: 'loading'`
  - `UserMenu` рендерит имя при `status: 'authenticated'`
  - `UserMenu` рендерит «войти» при `status: 'guest'`
- **Storybook stories** для `SignInScreen` и `UserMenu` (3 состояния)
- **Contract test:** `src/themes/contract.test.ts` остаётся зелёным после расширения

### Done criteria

- [ ] Зайти через GitHub в браузере end-to-end (клик → GitHub OAuth → возврат → видно имя в Header)
- [ ] Выйти через UserMenu — состояние сбрасывается, токен удалён
- [ ] Reload страницы при авторизованном состоянии — остаёшься авторизованным (нет ререндера «loading → guest → authenticated»)
- [ ] Unit-тесты `authStore` зелёные
- [ ] Component-тесты зелёные
- [ ] Storybook stories отображают корректно все 3 состояния `UserMenu`
- [ ] Все темы (`light`, `dark`, `sepia`, `nord`) визуально единообразны
- [ ] `make check-all` зелёный

### Verification

```bash
make check-all
make dev
# Открыть http://localhost:5173, кликнуть «войти», пройти GitHub OAuth, вернуться
# Reload — состояние должно сохраниться
# Выйти — состояние сбрасывается
make storybook
# Проверить storybook stories UserMenu в трёх состояниях
```

### Merge

Локально:

```bash
git switch master
git merge --no-ff feat/auth-ui -m 'feat(auth): add sign-in UI and user menu'
git branch -d feat/auth-ui
```

---

## Phase 4 — Google-провайдер

**Цель.** Добавить Google как второй провайдер. Юзер может выбрать GitHub или Google на SignInScreen.

### Scope

**In:**
- Регистрация Google OAuth Client в Google Cloud Console
- Добавление `Google` в `convex/auth.ts` providers
- Кнопка «Войти через Google» в `SignInScreen.svelte`
- Env vars в Convex

**Out:**
- Изменения логики `authStore` (она уже provider-agnostic)
- Account linking (Phase 10+)

### Ветка

`feat/auth-google-provider`

### Изменения файлов

| Действие | Путь | Что |
| --- | --- | --- |
| modify | `convex/auth.ts` | импорт + добавление в providers array |
| modify | `src/components/auth/SignInScreen.svelte` | вторая кнопка |
| modify | `src/lib/auth/auth-client.ts` | расширить тип `Provider = 'github' \| 'google'` |
| modify | `CLAUDE.md` | обновить список провайдеров |

### Шаги реализации

1. Google Cloud Console → New Project → OAuth consent screen (External, Testing mode, добавить себя в test users)
2. Credentials → OAuth client ID → Web application
3. Authorized redirect URI: `https://wandering-ocelot-9.eu-west-1.convex.site/api/auth/callback/google`
4. Получить Client ID / Secret → `npx convex env set AUTH_GOOGLE_ID ...` / `AUTH_GOOGLE_SECRET ...`
5. Обновить `convex/auth.ts`
6. Обновить `SignInScreen.svelte` + `auth-client.ts`

### Стратегия тестов

- Smoke-проверка: войти через Google end-to-end
- **Проверить «провайдер = аккаунт»:**
  - Войти через GitHub с email `foo@example.com` — запомнить `users._id`
  - Выйти, войти через Google с тем же `foo@example.com` — должен создаться новый `users._id`
  - Подтвердить: в таблице `users` две строки с одинаковым email

### Done criteria

- [ ] Кнопка Google работает end-to-end
- [ ] Проверена изоляция аккаунтов (две разные записи в `users` при одинаковом email)
- [ ] `make check-all` зелёный

### Merge

Локально:

```bash
git switch master
git merge --no-ff feat/auth-google-provider -m 'feat(auth): add Google OAuth provider'
git branch -d feat/auth-google-provider
```

---

## Phase 5 — Settings sync

**Цель.** Настройки (язык, тема, layout, и т.д.) синхронизируются между устройствами через Convex для авторизованных юзеров. Гость продолжает работать с localStorage.

### Scope

**In:**
- Таблица `userSettings` в `convex/schema.ts`
- `convex/userSettings.ts`: `getMine` query, `upsertMine` mutation
- Расширение `src/lib/settings.ts`: интеграция с authStore, push при изменении, pull при логине
- Стратегия last-write-wins по `updatedAt`
- UI-индикатор «синхронизировано / не синхронизировано» (опционально, MVP — без него)

**Out:**
- Conflict resolution UI (не нужно для last-write-wins)
- Merge между двумя offline-устройствами
- `sessions` (Phase 6)

### Ветка

`feat/settings-sync`

### Изменения файлов

| Действие | Путь | Что |
| --- | --- | --- |
| modify | `convex/schema.ts` | добавить `userSettings` таблицу |
| new | `convex/userSettings.ts` | `getMine`, `upsertMine` |
| modify | `src/lib/settings.ts` | hook на authStore: pull при login, push при изменении |
| modify | `CLAUDE.md` | обновить «Settings и i18n» секцию |

### Шаги реализации

1. Добавить таблицу `userSettings`:
   ```ts
   userSettings: defineTable({
     userId: v.id("users"),
     symbolLayoutId: v.string(),
     fingerLayoutId: v.string(),
     languageId: v.string(),
     themeId: v.string(),
     updatedAt: v.number(),
   }).index("by_user", ["userId"]),
   ```
2. Написать `convex/userSettings.ts`:
   - `getMine`: возвращает строку или null
   - `upsertMine`: создаёт или обновляет; `userId` берётся из `ctx.auth.getUserIdentity()`
3. Расширить `src/lib/settings.ts`:
   - При signIn (subscribe на authStore) вызвать `getMine`
   - Сравнить `cloud.updatedAt` и `local.updatedAt`
   - Победитель пишется в store; проигравший — в Convex (если local победил) или localStorage (если cloud победил)
   - При любом `update`/`set` после signIn — push в Convex параллельно с localStorage
4. Обновить `CLAUDE.md`

### Стратегия тестов

- **Unit (settings.ts):**
  - Гость: только localStorage, никаких вызовов Convex
  - Логин при пустом cloud → push локальной копии
  - Логин при cloud новее → перетирает local
  - Логин при local новее → push, cloud перетирается
  - Изменение настроек после логина → одновременно localStorage + Convex
- **Unit (Convex mutations):** `upsertMine` корректно работает для нового юзера и существующего

### Done criteria

- [ ] Меняешь тему на устройстве A → авторизован → захожу на устройстве B (или incognito) под тем же провайдером → видишь ту же тему
- [ ] Гость продолжает работать без Convex (offline, localStorage only)
- [ ] Все тесты зелёные
- [ ] `make check-all` зелёный

### Verification

```bash
make check-all
make dev
# Войти в browser A, сменить тему на dark
# Открыть incognito (или другой профиль), войти тем же провайдером — тема dark подтянулась
# Выйти, обновить — последняя локальная сохранена
```

### Merge

Локально:

```bash
git switch master
git merge --no-ff feat/settings-sync -m 'feat(auth): sync user settings to Convex for signed-in users'
git branch -d feat/settings-sync
```

---

## Phase 6 — Sessions tracking, Phase 7 — `/stats` с реальными данными

Отложены. Каждая фаза — отдельная запись в [`docs/backlog.md`](../backlog.md) с описанием scope, драйвера возобновления и существующих скетчей file changes / тест-стратегии (унаследованы из черновика этого плана). Возобновление любой из них — через `writing-plans` поверх записи в backlog'е.

---

## Roadmap V2 (по запросу, не в umbrella) — Phase 9 (Apple), Phase 10 (Account linking V2), Phase 11 (SberID), Phase 12 (Telegram)

Все четыре фазы отложены под внешний driver (Apple Developer enrollment, явный user request, юр./орг. подготовка к SberID, бизнес-need в Telegram-аудитории). Подробности — в [`docs/backlog.md`](../backlog.md).

Phase 12 (Telegram) уникальна тем, что **не OAuth 2.0** — Telegram Login Widget использует custom HMAC-flow и не лежит в каталоге `@auth/core/providers/*`. Перед стартом — отдельная research-задача Phase 12.0 на выбор подхода (Credentials provider vs custom OAuth vs raw Convex HTTP-route).

Phase 8 (Yandex) тоже изначально жила в этом разделе; merged `4d4cb58`, см. строку статуса выше.

---

## Глоссарий

- **Convex deployment** — твой экземпляр Convex backend'а. Имеет URL вида `https://<adj-noun-123>.convex.cloud` (для функций) и `https://<adj-noun-123>.convex.site` (для HTTP-routes, включая OAuth callbacks).
- **IdP (Identity Provider)** — сервис, который выпускает JWT (Identity Token). В нашем случае это сам Convex deployment с раскатанным Convex Auth.
- **JWT** — подписанный токен с identity. Convex проверяет его подпись и кладёт claims в `ctx.auth`.
- **MAU** — Monthly Active Users. Метрика billing'а у Clerk/Auth0.
- **`@convex-dev/auth`** — npm-пакет, реализующий Convex Auth.
- **`@auth/core`** — npm-пакет с каталогом OAuth-провайдеров (от команды Auth.js / NextAuth).
- **adapter-static** — текущий SvelteKit-адаптер; собирает SPA без сервера.

## Ссылки

- Convex Auth docs: https://labs.convex.dev/auth
- `@convex-dev/auth` GitHub: https://github.com/get-convex/convex-auth
- Convex Auth example: https://github.com/get-convex/convex-auth-example
- Auth.js providers (=`@auth/core/providers/*`): https://authjs.dev/getting-started/providers
- `convex-auth-svelte` (community wrapper, опционально): https://github.com/mmailaender/convex-auth-svelte
