# ADR 0012: auth-required тренировка + dev-вход — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Снести неавторизованный доступ к тренировке (ADR 0012) — все `drill*`-функции auth-required, гость на `/train` видит приглашение войти — и дать ИИ-агентам/E2E инструментальный dev-вход (Password-провайдер за env-флагом), причём dev-вход поднимается раньше закрытия, чтобы прогоны агентов не ломались ни на минуту.

**Architecture:** Порядок закреплён ADR 0012: сначала dev-вход (стоковый `Password` из `@convex-dev/auth`, регистрируется в `convex/auth.ts` только при env-флаге Convex — на production флага нет, провайдера физически не существует; кнопка на `/signin` за `PUBLIC_DEV_LOGIN*` из `.env.local`), затем барьер `/train` (приглашение по образцу `/stats`) и auth-required `drillNext` (ядро отбора уже за швом `selectDrillsHandler` — остаётся throw 'Not authenticated' в обёртке симметрично `drillRecord` и сужение `resolveOpenedSteps`). Ветка `userId === null → DEFAULT_OPENED_STEPS` умирает; ветка `profile === null → DEFAULT_OPENED_STEPS` (cold start авторизованного) **остаётся**.

**Tech Stack:** Convex (`@convex-dev/auth` Password), SvelteKit 2 / Svelte 5 runes (`$env/dynamic/public`), XState v5 (не меняется), Vitest projects (`convex` edge-runtime, `src` node), convex-test.

**Канон:** ADR 0012 (это решение), ADR 0013 (at-most-once — формулировки комментариев), ADR 0005/0008 (server-authoritative, cold start), CLAUDE.md (handler-паттерн, «где код — там тест», конвенции коммитов).

**Ветка:** `feat/adr-0012-auth-required` от `master`. **Предусловие (выполнено 2026-07-03):** канон закреплён в коммите на `ADR_Rethink` (`0da0cfd`), `master` влит в неё (`f6fde7f`, включая шов `selectDrillsHandler`); ветка исполнения создаётся от `ADR_Rethink`. В `master` вливаются последовательно: сначала `ADR_Rethink`, затем эта ветка.

---

### Task 0: Подготовка окружения (env-флаги)

Ручные шаги CLI, кода нет. Значения флагов living в env, не в репозитории.

- [ ] **Step 1: Включить dev-вход на dev-deployment Convex**

```bash
npx convex env set AUTH_DEV_LOGIN_ENABLED true
```

- [ ] **Step 2: Добавить клиентские флаги в `.env.local`** (gitignored; пароль ≥ 8 символов — дефолтная валидация Password-провайдера)

```bash
PUBLIC_DEV_LOGIN=true
PUBLIC_DEV_LOGIN_EMAIL=agent@flow.test
PUBLIC_DEV_LOGIN_PASSWORD=<локальный-пароль-минимум-8-символов>
```

- [ ] **Step 3: Задокументировать флаги в `.env.example`** (закомментированными, со ссылкой на ADR 0012) — commit вместе с Task 3.

---

### Task 1: Password-провайдер за env-флагом (`buildProviders`)

**Files:**
- Modify: `convex/auth.ts`
- Test: `convex/auth.test.ts`

- [ ] **Step 1: Написать падающий тест** — в конец `convex/auth.test.ts` добавить describe, в шапку — импорты:

```ts
// в шапку файла (рядом с `import { createOrUpdateUserHandler } from './auth';`):
import { buildProviders } from './auth';
import Password from '@convex-dev/auth/providers/Password';
```

```ts
describe('buildProviders — dev-вход за флагом (ADR 0012)', () => {
  test('флаг выключен → только три OAuth-провайдера, Password отсутствует', () => {
    const providers = buildProviders({ devLoginEnabled: false });
    expect(providers).toHaveLength(3);
    expect(providers).not.toContain(Password);
  });

  test('флаг включён → Password добавлен (dev-deployment)', () => {
    const providers = buildProviders({ devLoginEnabled: true });
    expect(providers).toHaveLength(4);
    expect(providers).toContain(Password);
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npx vitest run convex/auth.test.ts`
Expected: FAIL — `buildProviders` не экспортируется из `./auth`.

- [ ] **Step 3: Реализация в `convex/auth.ts`** — импорт + seam + подстановка в `convexAuth`:

```ts
import Password from '@convex-dev/auth/providers/Password';
```

```ts
/**
 * Список auth-провайдеров. Password — инструментальный dev-вход для ИИ-агентов
 * и E2E (ADR 0012): регистрируется ТОЛЬКО при env-флаге на dev-deployment; на
 * production флага нет — провайдера физически не существует. Не продуктовый режим.
 */
export function buildProviders({ devLoginEnabled }: { devLoginEnabled: boolean }) {
  const oauth = [GitHub, Google, Yandex];
  return devLoginEnabled ? [...oauth, Password] : oauth;
}
```

В `convexAuth({ providers: [GitHub, Google, Yandex], ... })` заменить строку providers:

```ts
  providers: buildProviders({ devLoginEnabled: process.env.AUTH_DEV_LOGIN_ENABLED === 'true' }),
```

- [ ] **Step 4: Прогнать тесты**

Run: `npx vitest run convex/auth.test.ts`
Expected: PASS (все прежние + 2 новых).

- [ ] **Step 5: Проверить развёртывание** (convex-test/build не ловят ошибки развёртывания — правило проекта)

Run: `npx convex dev --once`
Expected: успешный push, без ошибок схемы/функций.

- [ ] **Step 6: Commit**

```bash
git add convex/auth.ts convex/auth.test.ts
git commit -m "feat(auth): dev-вход — Password-провайдер за env-флагом (ADR 0012)"
```

---

### Task 2: Проброс params в `authStore.signIn`

**Files:**
- Modify: `src/lib/auth/auth-store.svelte.ts:40`

Обёртка `@mmailaender/convex-auth-svelte` принимает `signIn(provider, params?)` — наш store сужает сигнатуру до `(provider)`. Тонкий binding без собственной логики — отдельный тест не нужен (проект тестирует `computeAuthState`, а не тонкие привязки); типы держит `svelte-check`.

- [ ] **Step 1: Расширить сигнатуру** — заменить строку 40:

```ts
    signIn: (provider: string) => auth.signIn(provider),
```

на:

```ts
    // params — для password-провайдера dev-входа (ADR 0012): { email, password, flow }.
    signIn: (provider: string, params?: FormData | Record<string, string>) =>
      auth.signIn(provider, params),
```

- [ ] **Step 2: Проверить типы**

Run: `make check`
Expected: 0 errors (сигнатура совместима с call-site `auth.signIn(provider)` в SignInScreen).

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/auth-store.svelte.ts
git commit -m "feat(auth): проброс params в authStore.signIn (для dev-входа)"
```

---

### Task 3: Кнопка dev-входа на `/signin`

**Files:**
- Modify: `src/components/auth/SignInScreen.svelte`
- Modify: `.env.example` (документация флагов из Task 0)

Кнопка «один клик»: данные входа читаются из `$env/dynamic/public` (в prod-сборке переменных нет → кнопки нет). Сначала `flow: 'signIn'`; на первом прогоне юзера ещё нет → fallback `flow: 'signUp'` создаёт его (через существующий `createOrUpdateUserHandler` — «провайдер = аккаунт» не трогается). Стили — сознательно вне theme-контракта (dev-инструмент, не продуктовый UI); строки без i18n по той же причине.

- [ ] **Step 1: Добавить в `<script>` SignInScreen.svelte** (после существующих импортов и `handleSignIn`):

```ts
  import { env } from '$env/dynamic/public';

  // Dev-вход (ADR 0012): кнопка существует только когда .env.local даёт все три
  // флага (в prod-сборке их нет). Серверная половина — Password-провайдер за
  // AUTH_DEV_LOGIN_ENABLED (convex/auth.ts) — на production отсутствует.
  const devLoginAvailable =
    env.PUBLIC_DEV_LOGIN === 'true' &&
    Boolean(env.PUBLIC_DEV_LOGIN_EMAIL) &&
    Boolean(env.PUBLIC_DEV_LOGIN_PASSWORD);

  async function handleDevSignIn() {
    error = null;
    signingIn = true;
    const credentials = {
      email: env.PUBLIC_DEV_LOGIN_EMAIL!,
      password: env.PUBLIC_DEV_LOGIN_PASSWORD!,
    };
    try {
      try {
        await auth.signIn('password', { ...credentials, flow: 'signIn' });
      } catch {
        // Первый прогон: юзера ещё нет — регистрируем тем же паролем.
        await auth.signIn('password', { ...credentials, flow: 'signUp' });
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      signingIn = false;
    }
  }
```

- [ ] **Step 2: Добавить разметку** — после `<p class="sign-in-screen__disclaimer">…</p>`, перед `{#if error}`:

```svelte
  {#if devLoginAvailable}
    <button
      type="button"
      class="sign-in-screen__btn-dev"
      disabled={signingIn}
      onclick={handleDevSignIn}
    >
      {signingIn ? 'Входим…' : 'Dev-вход (агент / E2E)'}
    </button>
  {/if}
```

- [ ] **Step 3: Добавить стиль** — в `<style>` после `.sign-in-screen__btn-yandex:disabled`:

```css
  /* Dev-инструмент (ADR 0012): сознательно вне theme-контракта — кнопка живёт
     только в dev-сборке за PUBLIC_DEV_LOGIN, темизировать нечего. */
  .sign-in-screen__btn-dev {
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px dashed var(--color-text-secondary);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm, 0.25rem);
    cursor: pointer;
    font-size: 0.875rem;
  }

  .sign-in-screen__btn-dev:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
```

- [ ] **Step 4: Дописать `.env.example`**:

```bash
# Dev-вход для ИИ-агентов и E2E (ADR 0012). Только локально: серверная половина
# включается `npx convex env set AUTH_DEV_LOGIN_ENABLED true` (dev-deployment).
# PUBLIC_DEV_LOGIN=true
# PUBLIC_DEV_LOGIN_EMAIL=agent@flow.test
# PUBLIC_DEV_LOGIN_PASSWORD=<минимум 8 символов>
```

- [ ] **Step 5: Ручная проверка (dev-вход работает до закрытия доступа — порядок ADR)**

Run: `make dev` (+ `make convex` в соседнем терминале). В браузере: `/signin` → кнопка «Dev-вход» видна → клик → UserMenu в шапке показывает юзера `agent@flow.test`. Повторный клик после signOut — входит без регистрации.
Expected: вход одним кликом, без внешних OAuth-форм.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/SignInScreen.svelte .env.example
git commit -m "feat(auth): кнопка dev-входа на /signin за PUBLIC_DEV_LOGIN (ADR 0012)"
```

---

### Task 4: Auth-барьер `/train`

**Files:**
- Modify: `src/routes/train/+page.svelte`
- Modify: `dictionaries/en.json`, `dictionaries/ru.json`

Паттерн `/stats`: гость — приглашение (плюс ссылка на `/signin`, как `UserMenu`), `loading` — ничего (не мигать), авторизованный — `<App />`. Лендинг `/` и `/signin` остаются публичными. UI-ветвление тривиально — модульного теста нет (по практике проекта: барьер `/stats` не тестировался), проверка ручная.

- [ ] **Step 1: i18n-ключи.** В `dictionaries/en.json` после секции `repertoire_progress` (якорь — её последний ключ `guest_invite`), перед `"debug"`:

```json
  "train_gate": {
    "guest": "Training requires signing in — your profile and progress live on the server.",
    "sign_in": "Sign in"
  },
```

В `dictionaries/ru.json` в том же месте (после `guest_invite`, перед `"debug"`):

```json
  "train_gate": {
    "guest": "Для тренировки нужен вход — профиль и прогресс живут на сервере.",
    "sign_in": "Войти"
  },
```

- [ ] **Step 2: Переписать `src/routes/train/+page.svelte` целиком:**

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import { resolve } from '$app/paths';
  import App from '@/components/app/App.svelte';
  import { dictionary } from '@/lib/i18n';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  // Auth-барьер (ADR 0012): тренировка требует входа. Гость — приглашение (по
  // образцу /stats), loading — ничего (не мигать), авторизованный — тренажёр.
  const auth = getContext<AuthStore>('auth');
  const t = $derived($dictionary.train_gate);
</script>

{#if auth.state.status === 'guest'}
  <div class="train-gate">
    <p class="muted">{t.guest}</p>
    <a href={resolve('/signin')}>{t.sign_in}</a>
  </div>
{:else if auth.state.status === 'authenticated'}
  <App />
{/if}

<style>
  .train-gate {
    margin: 4rem auto;
    max-width: 24rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .muted {
    color: var(--color-text-secondary);
  }
</style>
```

- [ ] **Step 3: Проверить типы и тесты** (словари типизируются от en.json — новая секция должна пройти обе стороны)

Run: `make check-dev`
Expected: чисто.

- [ ] **Step 4: Ручная проверка**

В браузере: выйти (signOut в UserMenu) → открыть `/train` → приглашение + ссылка «Войти»; dev-вход → `/train` → меню тренажёра как раньше; пауза/Resume внутри `/train` не задеты.
Expected: гость не видит тренажёр; авторизованный путь не изменился.

- [ ] **Step 5: Commit**

```bash
git add src/routes/train/+page.svelte dictionaries/en.json dictionaries/ru.json
git commit -m "feat(train): auth-барьер /train — гостю приглашение войти (ADR 0012)"
```

---

### Task 5: `drillNext` auth-required (гостевые ветки сервера умирают)

**Files:**
- Modify: `convex/drill.ts` (`resolveOpenedSteps` :54–69; обёртка `drillNext` :190–215; упоминания «cold-start 1 для гостя» в комментариях)
- Test: `convex/drill.test.ts` (8 call sites `t.query(api.drill.drillNext, …)` :55–149 → ядро `selectDrillsHandler`; describe `resolveOpenedSteps` :458–486; новый guest-тест)

Ядро отбора уже за швом `selectDrillsHandler({ ctx, symbolLayoutId, openedSteps, budgetChars, seed })` (рефакторинг `refactor/drill-next-selection-seam` на master) — политика тестируется напрямую, минуя auth. Остаётся: auth-барьер в обёртке (симметрично `drillRecord`, образец guest-throw теста — `convex/sessions.test.ts`), сужение `resolveOpenedSteps` до непустого `userId`, миграция гостевых тестов обёртки на ядро.

- [ ] **Step 1: Написать падающий guest-тест** — в `convex/drill.test.ts`, в конец describe `drillNext`:

```ts
  test('гость (без identity) → throw Not authenticated (ADR 0012)', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);
    await expect(
      t.query(api.drill.drillNext, { symbolLayoutId: 'йцукен', budgetChars: 10, seed: 1 })
    ).rejects.toThrow('Not authenticated');
  });
```

Run: `npx vitest run convex/drill.test.ts`
Expected: FAIL — сейчас drillNext отвечает гостю порцией.

- [ ] **Step 2: Сузить `resolveOpenedSteps`** — `userId` перестаёт быть nullable, ветка гостя умирает; cold start (профиля нет) остаётся:

```ts
/** Репертуар из профиля (user × раскладка); нет профиля → cold start. */
export async function resolveOpenedSteps({
  ctx,
  userId,
  symbolLayoutId,
}: {
  ctx: QueryCtx | MutationCtx;
  userId: Id<'users'>;
  symbolLayoutId: string;
}): Promise<number> {
  const profile = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId))
    .unique();
  return profile?.openedSteps ?? DEFAULT_OPENED_STEPS;
}
```

- [ ] **Step 3: Auth-барьер в обёртке `drillNext`** (`convex/drill.ts` :204–215) — ядро не трогается; заменить handler обёртки:

```ts
  // Обёртка разрешает identity → openedSteps и делегирует политику отбора ядру
  // (паттерн repertoireSnapshotHandler / applyDrillSummaryHandler). Тренировка
  // требует входа (ADR 0012) — симметрично drillRecord; cold start (профиля нет)
  // разрешается в openedSteps = 1 внутри resolveOpenedSteps.
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error('Not authenticated');
    }
    const openedSteps = await resolveOpenedSteps({ ctx, userId, symbolLayoutId: args.symbolLayoutId });
    return await selectDrillsHandler({
      ctx,
      symbolLayoutId: args.symbolLayoutId,
      openedSteps,
      budgetChars: args.budgetChars,
      seed: args.seed,
    });
  },
```

Попутно убрать «для гостя» из упоминаний cold-start в комментариях `drill.ts` (header :27 и docstring `resolveOpenedSteps`): cold start = авторизованный без профиля; гостевого заслона нет (ADR 0012).

- [ ] **Step 4: Мигрировать 8 call sites** (`drill.test.ts` :55–149). Эти тесты всегда работали на cold-start `openedSteps = 1` (комментарий :159–161 это фиксирует) — сценарии сохраняются буквально, юзеры не нужны: каждый

```ts
    const res = await t.query(api.drill.drillNext, { symbolLayoutId: 'test', budgetChars: 10, seed: 42 });
```

становится

```ts
    const res = await t.run(async (ctx) =>
      selectDrillsHandler({ ctx, symbolLayoutId: 'test', openedSteps: 1, budgetChars: 10, seed: 42 }),
    );
```

(`selectDrillsHandler` уже в импорте шапки файла). Для пары детерминизма (:125–126) оба вызова — в одном `t.run`. Комментарий :159–161 («`t.query` всегда даёт null → cold-start 1…») переписать: обёртка гостя больше не пускает (ADR 0012), cold-start ветка ядра тестируется через `openedSteps: 1`.

- [ ] **Step 5: Describe `resolveOpenedSteps`** (:458–486): первые три теста не меняются (уже зовут с настоящим `userId`); четвёртый (гостевой: `null userId` → cold-start 1, :483–486) — **удалить** (компилятор больше не пропускает `null`; гостя закрывает guest-throw тест из Step 1).

- [ ] **Step 6: Прогнать тесты + типы**

Run: `npx vitest run convex/drill.test.ts && make check`
Expected: PASS все; 0 type errors (`resolveOpenedSteps` больше нигде не зовётся с `null` — единственный прод-вызов в обёртке `drillNext` после throw).

- [ ] **Step 7: Проверить развёртывание**

Run: `npx convex dev --once`
Expected: успешный push.

- [ ] **Step 8: Commit**

```bash
git add convex/drill.ts convex/drill.test.ts
git commit -m "feat(drill): drillNext auth-required — гостевые ветки сняты (ADR 0012)"
```

---

### Task 6: Комментарии доставки (ADR 0013) + легализация `resetMyProfile`

**Files:**
- Modify: `src/machines/session-impl.ts` (:59–61, :72, :74–75, :85)
- Modify: `convex/drill.ts` (doc-комментарий над `resetMyProfile`, :459)

Кода-поведения нет — только формулировки: «гость» из причин silent-catch исчезает (ADR 0012), остаётся офлайн by design (ADR 0013).

- [ ] **Step 1: `session-impl.ts`.** Комментарий над `recordCheckpoint` (:59–61):

```ts
    // Fire-and-forget: запись профиля не блокирует сессию. Офлайн/сбой сети →
    // мутация бросает → молча гасим: доставка сводки best-effort at-most-once
    // (ADR 0013), потеря дельты допустима. Гостя на тренировке нет (ADR 0012).
```

`.catch` :72: `'drillRecord пропущен (гость/офлайн)'` → `'drillRecord пропущен (офлайн, at-most-once — ADR 0013)'`.

Комментарий над `recordSessionSummary` (:74–75): `«Гость → 'Not authenticated' → молча гасим.»` → `«Офлайн → молча гасим (at-most-once, ADR 0013).»`

`.catch` :85: `'sessionSummary пропущен (гость/офлайн)'` → `'sessionSummary пропущен (офлайн, at-most-once — ADR 0013)'`.

- [ ] **Step 2: `convex/drill.ts`** — doc-комментарий над `export const resetMyProfile`:

```ts
/**
 * Инструмент «чистого листа» для dev-прогонов агентов и E2E (ADR 0012):
 * сбрасывает профили текущего юзера перед детерминированным прогоном.
 * Не продуктовая функция — пара к dev-входу (Password за env-флагом).
 */
```

- [ ] **Step 3: Прогнать быстрый цикл + commit**

Run: `make check-dev`
Expected: чисто.

```bash
git add src/machines/session-impl.ts convex/drill.ts
git commit -m "chore(session): формулировки доставки at-most-once (ADR 0013); resetMyProfile — dev-инструмент"
```

---

### Task 7: Канон вслед за кодом

**Files:**
- Modify: `docs/adr/0012-training-requires-authentication.md` (статус-строка)
- Modify: `docs/adr/README.md` (индекс, строка 0012)
- Modify: `CONTEXT.md` (Relationships — снять «снос в работе»)
- Modify: `CLAUDE.md` (роут `/train`, секция Authentication)

- [ ] **Step 1: ADR 0012 статус-строка** — `Реализация: план сноса гостевых веток — следующий шаг (сначала dev-вход, потом закрытие /train)` → `Реализация: в коде (план docs/plans/2026-07-03-adr-0012-auth-required.md)`.

- [ ] **Step 2: README-индекс** — в строке 0012: `план сноса гостевых веток (не начат)` → `в коде`.

- [ ] **Step 3: CONTEXT.md** — в строке Relationships про ADR 0012 убрать скобку `; снос гостевых веток — в работе`.

- [ ] **Step 4: CLAUDE.md** — (а) в «UI entry points» у `/train` добавить: `auth-барьер (ADR 0012): гостю — приглашение войти`; (б) в секцию **Authentication** добавить пункт:

```markdown
- **Dev-вход (ADR 0012):** Password-провайдер за `AUTH_DEV_LOGIN_ENABLED` (env Convex, только dev-deployment; на production провайдера нет). Кнопка на `/signin` — за `PUBLIC_DEV_LOGIN*` из `.env.local` (см. `.env.example`). Пара к нему — `resetMyProfile` («чистый лист» прогонов). Инструмент для ИИ-агентов/E2E, не продуктовый режим.
```

- [ ] **Step 5: Commit**

```bash
git add docs/adr/0012-training-requires-authentication.md docs/adr/README.md CONTEXT.md CLAUDE.md
git commit -m "docs(adr): ADR 0012 реализован — статусы и канон вслед за кодом"
```

---

### Task 8: Финальная верификация и merge

- [ ] **Step 1: Полная проверка**

Run: `make check-all`
Expected: lint + check + test + spell + build — всё зелёное (spell обязан быть чистым).

- [ ] **Step 2: Проверка развёртывания**

Run: `npx convex dev --once`
Expected: успешный push.

- [ ] **Step 3: Сквозная ручная проверка (чек-лист ADR 0012)**

1. Гость: `/` открывается, CTA ведёт на `/train` → приглашение войти (тренажёра нет).
2. `/signin`: кнопка «Dev-вход» → один клик → авторизован.
3. `/train`: меню → Start → тренировка идёт, refill работает.
4. После сессии: строка появляется в `/stats` (чекпоинт и журнал пишутся).
5. signOut → `/train` снова показывает приглашение.
6. `git grep "гость/офлайн" src/` — пусто (формулировки ADR 0013).

- [ ] **Step 4: Merge**

```bash
git switch master && git merge --no-ff feat/adr-0012-auth-required
```

---

## Вне scope

- Anonymous-провайдер / анонимный профиль — отложенный путь возврата гостя (ADR 0012, этап auto-flow).
- Идемпотентность `drillRecord` / outbox — закрыто ADR 0013 (at-most-once), кода не требует.
- `repertoireSnapshot` / `progressionDetail` — уже отдают `null` гостю; не трогаем.
- qwerty-этап (серверные данные второй раскладки) — `docs/backlog.md`.
