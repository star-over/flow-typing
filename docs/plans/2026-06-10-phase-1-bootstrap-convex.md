# Phase 1: Bootstrap Convex — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convex backend подключён к FlowTyping end-to-end: схема + health-функции развёрнуты в local Convex, клиент инициализирован из SvelteKit, диагностическая страница доказывает работу connection.

**Architecture:** Cloud dev deployment Convex (`dev:wandering-ocelot-9`, EU-West-1) + стандартный SvelteKit Vite-клиент. Модуль `health` — диагностический, не продуктовый, удаляется в Phase 3. Все env-переменные приводятся к SvelteKit-конвенции `PUBLIC_*`. Cloud-mode выбран ради HTTPS (Apple OAuth требует это в Phase 9) и production-equivalence.

**Tech Stack:** Convex 1.40 (уже в `package.json`) · SvelteKit 2 / Svelte 5 (runes) · TypeScript strict · Vitest (существующий).

---

## Starting state (что уже есть)

- `convex` v1.40 в `package.json`
- `convex/` директория с `_generated/`, `README.md`, `tsconfig.json` (Convex CLI инициализирован)
- `.env.local` содержит:
  - `CONVEX_DEPLOYMENT=dev:wandering-ocelot-9` — **cloud dev deployment** (project name `flow-typiing` — опечатка в названии Convex-проекта, не блокирует ничего; имя deployment'а `wandering-ocelot-9` стабильно)
  - `NEXT_PUBLIC_CONVEX_URL=https://wandering-ocelot-9.eu-west-1.convex.cloud` — URL functions
  - `NEXT_PUBLIC_CONVEX_SITE_URL=https://wandering-ocelot-9.eu-west-1.convex.site` — URL HTTP-routes (понадобится в Phase 2 для OAuth callback'ов)
- `.env.example` содержит устаревший `VITE_CONVEX_URL=your_convex_url_here`
- `.gitignore` корректно исключает `.env*` (commit'аем только `.env.example`)
- Нет: `convex/schema.ts`, `convex/health.ts`, `src/lib/convex.ts`, `make convex` target

## File Structure

```
convex/                              # EXISTS — расширяется
├── _generated/                      # EXISTS — регенерируется CLI после добавления функций
│   ├── api.d.ts                     # (auto) типы для api.health.ping и api.health.tick появятся после deploy
│   ├── api.js                       # (auto)
│   ├── dataModel.d.ts               # (auto)
│   ├── server.d.ts                  # (auto)
│   └── server.js                    # (auto)
├── README.md                        # EXISTS — boilerplate Convex, не трогаем
├── tsconfig.json                    # EXISTS — конфиг для Convex runtime, не трогаем
├── schema.ts                        # NEW — defineSchema({ health: ... })
└── health.ts                        # NEW — ping query + tick mutation

src/
├── lib/
│   └── convex.ts                    # NEW — ConvexClient singleton + re-export `api`
└── routes/
    └── dev/
        └── +page.svelte             # NEW — диагностическая страница (удалится в Phase 3)

.env.local                           # MODIFY — переименовать NEXT_PUBLIC_* → PUBLIC_*
.env.example                         # MODIFY — синхронизировать с .env.local
Makefile                             # MODIFY — добавить `convex` target
CLAUDE.md                            # MODIFY — добавить секцию «### Convex backend»
cspell.json                          # MODIFY — добавить `convex`, `Convex`, `tickedAt`
```

**Файлы НЕ трогаем:** `convex/_generated/*` (регенерируется), `convex/README.md` (boilerplate), `convex/tsconfig.json` (Convex CLI владеет), `.env` (содержит unrelated GOOGLE_CLOUD_PROJECT и т.д., не auth-проект).

---

## Pre-flight Checks

Прежде чем стартовать первый задача:

- [ ] **Подтвердить Convex cloud dev deployment.** Открыть `.env.local`, увидеть строку `CONVEX_DEPLOYMENT=dev:<deployment-name>` (у нас `dev:wandering-ocelot-9`). Префикс `dev:` означает cloud dev tier (бесплатно). Если deployment local self-hosted (`CONVEX_DEPLOYMENT=local:...`) — план НЕ применим, нужны другие URL'ы и watcher-семантика.
- [ ] **Convex CLI logged in.** `npx convex --version` должно отработать без login-prompt'а; если просит логин — `npx convex login`.
- [ ] **Стартовать с чистого `master`.** Сначала проверить, что текущий состояние чистый и `master` существует, потом создать ветку:
  ```bash
  git status --porcelain                              # должно быть пусто
  git rev-parse --abbrev-ref HEAD                     # запомнить текущую ветку
  git rev-parse --verify feat/convex-bootstrap 2>/dev/null \
    && echo 'BRANCH EXISTS — inspect before reusing' || echo 'fresh start, OK'
  git switch master
  git switch -C feat/convex-bootstrap
  ```
  - Если `git status --porcelain` НЕ пустой — `git stash -u` (или commit на текущей ветке), не сбрасывать вслепую.
  - Если предыдущая команда сообщила `BRANCH EXISTS` — посмотреть `git log feat/convex-bootstrap --not master --oneline`. Если там есть коммиты, которых нет на `master`, `git switch -C` их **выбросит без предупреждения**. Альтернатива — `git switch -c` (без `-C`, упадёт на existing) и разобраться руками.
  - Если `git switch master` падает с `invalid reference: master` — локального `master` нет, создать через `git switch -c master origin/master`.
- [ ] **Node ≥ 18.** `node -v` → должно показать v18 или новее (требование `convex`).
- [ ] **Запустить watcher в dedicated терминале.** Открыть **новый таб/окно терминала** и пометить его как `convex-watch`. В нём:
  ```bash
  npx convex dev
  ```
  Это watcher: при каждом изменении файла в `convex/` синхронизирует с cloud deployment'ом (`wandering-ocelot-9.eu-west-1.convex.cloud`) и регенерирует `convex/_generated/`. **Все последующие задачи предполагают, что этот процесс живёт.** Не закрывать таб и не делать `Ctrl+C` до Step 8.6. Все остальные команды плана — в другом терминале.

  > Параллельные вызовы `npx convex dev --once` в других командах плана **безопасны** при живом watcher'е — они просто пушат текущее состояние и выходят, watcher продолжает работать. Race на регенерации `convex/_generated/*` теоретически возможен в момент коммита; если `git status` показывает grey diff после `git add` — повторить `git add convex/_generated`.

---

## Task 1: Стандартизировать env-vars под SvelteKit

**Files:**
- Modify (local-only, gitignored): `.env.local`
- Modify (committed): `.env.example`

**Цель:** перейти с `NEXT_PUBLIC_*` на `PUBLIC_*` для совместимости с SvelteKit `$env/static/public`.

> **Почему вручную.** Convex CLI не переименовывает existing env-vars из whitelist (`NEXT_PUBLIC_*` остаётся как есть) — делаем руками.

- [ ] **Step 1.1: Переписать `.env.local`**

Открыть `.env.local` и привести Convex-блок к виду:

```env
CONVEX_DEPLOYMENT=dev:wandering-ocelot-9 # team: a1exandr-belan, project: flow-typiing
PUBLIC_CONVEX_URL=https://wandering-ocelot-9.eu-west-1.convex.cloud
PUBLIC_CONVEX_SITE_URL=https://wandering-ocelot-9.eu-west-1.convex.site
```

Действия:
- Старые строки `NEXT_PUBLIC_CONVEX_URL=...` и `NEXT_PUBLIC_CONVEX_SITE_URL=...` — **удалить**, не оставлять дубли. Если оставить оба префикса, `resolveEnvVarName` определяет `matching.length > 1`, пишет в лог «cannot update automatically», и любая последующая попытка CLI трогать env-файл no-op'ит.
- `CONVEX_DEPLOYMENT` оставить как есть — это вход для CLI.

- [ ] **Step 1.2: Обновить `.env.example`**

Полностью переписать `.env.example` (текущее содержимое — устаревший `VITE_CONVEX_URL=your_convex_url_here`):

```env
# Convex cloud dev deployment.
# Run `npx convex dev` to populate .env.local with actual values.
# Format: dev:<deployment-name> for dev tier; URLs follow <deployment-name>.<region>.convex.{cloud,site}.
CONVEX_DEPLOYMENT=
PUBLIC_CONVEX_URL=
PUBLIC_CONVEX_SITE_URL=
```

- [ ] **Step 1.3: Verify — CLI не сломан правкой**

При живом watcher'е (Pre-flight) или одноразово:

```bash
npx convex dev --once
```

Ожидаемо: CLI успешно подключается к cloud deployment, пушит (пока пустую) схему, `.env.local` не пересоздаётся. `cat .env.local` — `PUBLIC_*` остались.

- [ ] **Step 1.4: Проверить, что .env.local игнорируется git**

```bash
git status .env.local
```
Ожидаемо: пустой вывод. Если показывает «untracked» — баг в `.gitignore`, проверить `.env*`.

- [ ] **Step 1.5: Commit**

`.env.local` не отслеживается; коммитим только `.env.example`.

```bash
git add .env.example
git diff --staged   # убедиться, что в staging только .env.example
git commit -m "chore(convex): adopt PUBLIC_ prefix for SvelteKit env vars"
```

---

## Task 2: Создать health-схему

**Files:**
- Create: `convex/schema.ts`

**Цель:** определить диагностическую таблицу `health` с одним полем `tickedAt: number`. Это базовый «alive»-индикатор; продуктовых таблиц пока нет.

- [ ] **Step 2.1: Написать schema.ts**

Создать `convex/schema.ts`:

```ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  health: defineTable({
    tickedAt: v.number(),
  }),
});
```

- [ ] **Step 2.2: Развернуть схему и проверить регенерацию типов**

```bash
npx convex dev --once
```

Ожидаемо: CLI выводит `✔ Schema pushed`. Открыть `convex/_generated/dataModel.d.ts` — теперь должен содержать ссылку на таблицу `"health"`.

Если CLI ругается на ошибку валидации — проверить синтаксис, перезапустить.

- [ ] **Step 2.3: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(convex): define health diagnostic table"
```

---

## Task 3: Написать health-функции (query + mutation)

**Files:**
- Create: `convex/health.ts`

**Цель:** объявить две функции — `ping` (query без аргументов, возвращает `"pong"`) и `tick` (mutation без аргументов, вставляет строку в `health` с текущим временем).

**О тестах:** для Phase 1 unit-тесты функций **не пишем**. Логика тривиальна (`"pong"` и `Date.now()`), а инфраструктура для тестов Convex-функций (`convex-test`) ставится в Phase 2, где появляется реальная логика (`createOrUpdateUser`). Здесь полагаемся на ручную smoke-проверку через `/dev` в Task 5.

- [ ] **Step 3.1: Написать health.ts**

Создать `convex/health.ts`:

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

- [ ] **Step 3.2: Развернуть функции**

```bash
npx convex dev --once
```

Ожидаемо: CLI выводит `✔ Pushed` и упоминает `health:ping`, `health:tick`. Открыть `convex/_generated/api.d.ts` — должен теперь содержать `health.ping` и `health.tick` в типах.

- [ ] **Step 3.3: Smoke-проверка через CLI**

`npx convex dev` (без `--once`) должен быть запущен с Pre-flight шага про watcher — он синхронизирует с cloud и регенерирует `_generated/`. Проверить:

```bash
npx convex run health:ping
```

Ожидаемо: `"pong"`. Если `cannot connect` — backend daemon упал; запустить `npx convex dev` заново в watcher-терминале. (`make convex` ещё не создан — это будет в Task 6.)

- [ ] **Step 3.4: Commit**

```bash
git add convex/health.ts convex/_generated
git commit -m "feat(convex): add ping query and tick mutation for health checks"
```

---

## Task 4: Создать Convex-клиент в src/lib

**Files:**
- Create: `src/lib/convex.ts`

**Цель:** один singleton `ConvexClient`, который импортируется по псевдониму `@/lib/convex`. Re-export `api` оттуда же — чтобы компоненты не делали относительные импорты в `../../convex/_generated`.

- [ ] **Step 4.1: Написать src/lib/convex.ts**

Создать `src/lib/convex.ts`:

```ts
import { ConvexClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../convex/_generated/api';

export const convex = new ConvexClient(PUBLIC_CONVEX_URL);
export { api };
```

**Почему `convex/browser`, а не `convex/react`:** проект на Svelte, React-обёртки нам не нужны. `ConvexClient` из `convex/browser` — framework-agnostic, имеет методы `query`, `mutation`, `action`, `onUpdate` (для реактивных подписок).

**Почему re-export `api`:** изоляция знания о расположении `convex/_generated`. Если когда-нибудь поменяется structure — правится одно место.

- [ ] **Step 4.2: Проверить типы**

```bash
make check
```

Ожидаемо: `svelte-check` проходит без ошибок. Если ругается на `$env/static/public` — нужен `svelte-kit sync` (запускается автоматически `make check`, но если SvelteKit ещё не синхронизировался — `make sync`).

- [ ] **Step 4.3: Commit**

```bash
git add src/lib/convex.ts
git commit -m "feat(convex): add ConvexClient singleton with api re-export"
```

---

## Task 5: Диагностическая страница /dev

**Files:**
- Create: `src/routes/dev/+page.svelte`

**Цель:** SvelteKit-маршрут `/dev` с двумя кнопками (Ping, Tick) и выводом результата. Используется один раз для smoke-проверки end-to-end; удалится в Phase 3.

**Production-guard:** используем `import { dev } from '$app/environment'` — SvelteKit статически вырезает dev-ветку из production-сборки (`dev` заменяется на литерал `false` на этапе сборки, template-условие исчезает целиком). Это **корректный tree-shake**, в отличие от `import.meta.env.DEV` в шаблоне (последний только скрывает контент в runtime, но markup остаётся в сборке).

- [ ] **Step 5.1: Написать +page.svelte**

Создать `src/routes/dev/+page.svelte`:

```svelte
<script lang="ts">
  import { dev } from '$app/environment';
  import { api, convex } from '@/lib/convex';

  let pingResult: string | null = $state(null);
  let tickResult: string | null = $state(null);
  let error: string | null = $state(null);

  async function handlePing() {
    error = null;
    try {
      pingResult = await convex.query(api.health.ping, {});
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleTick() {
    error = null;
    try {
      const id = await convex.mutation(api.health.tick, {});
      tickResult = id;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

{#if dev}
  <h1>Convex health check</h1>
  <p>This page is dev-only diagnostic for Convex connection. Deleted in Phase 3.</p>

  <button onclick={handlePing}>Ping</button>
  <p>Ping result: {pingResult ?? '(not called yet)'}</p>

  <button onclick={handleTick}>Tick</button>
  <p>Tick result: {tickResult ?? '(not called yet)'}</p>

  {#if error}
    <pre style='color: red;'>Error: {error}</pre>
  {/if}
{:else}
  <p>Not available in production.</p>
{/if}
```

**Про типы:** `convex.mutation(api.health.tick, {})` возвращает `Id<'health'>`. В Convex 1.40 этот тип — `string & { __tableName: 'health' }` (branded), который **assignable в `string`**, поэтому `tickResult = id` проходит `svelte-check` без cast'а.

- [ ] **Step 5.2: Запустить dev-сервер и проверить вручную**

Watcher из Pre-flight уже работает. В рабочем терминале:

```bash
make dev
```

Открыть в браузере `http://localhost:5173/dev`. Ожидаемо:

1. Нажать **Ping** → строчка «Ping result: pong»
2. Нажать **Tick** → строчка «Tick result: <id-строки-в-Convex>» (id вроде `kg2abc...`)
3. `npx convex dashboard` откроет cloud UI (`https://dashboard.convex.dev/d/wandering-ocelot-9`). Найти таблицу `health` → видеть новые строки с `tickedAt`.

Если Ping падает с network error — проверить, что `npx convex dev` запущен и что `PUBLIC_CONVEX_URL` указывает на cloud-deployment (`https://wandering-ocelot-9.eu-west-1.convex.cloud`).

- [ ] **Step 5.3: Commit**

```bash
git add src/routes/dev
git commit -m "feat(convex): add /dev diagnostic page for health checks"
```

---

## Task 6: Makefile target для Convex

**Files:**
- Modify: `Makefile`

**Цель:** добавить `make convex` как стандартную точку входа (соответствует конвенции «package.json без npm-скриптов»).

- [ ] **Step 6.1: Добавить target и phony**

Реальный `.PHONY` в `Makefile` — **3 строки** с двумя `\`-continuation (после `lint-fix` и после `create-drills`). Аккуратно дописать `convex` в конец третьей строки после `reinstall-gemini-cli`:

Было:
```makefile
.PHONY: all help install sync clean dev build preview check test coverage lint lint-fix \
        spell storybook storybook-build check-all compile-drills create-drills \
        normalize-rus-corp reinstall-gemini-cli
```

Стало:
```makefile
.PHONY: all help install sync clean dev build preview check test coverage lint lint-fix \
        spell storybook storybook-build check-all compile-drills create-drills \
        normalize-rus-corp reinstall-gemini-cli convex
```

В блоке `help:` найти строку про `make preview` и сразу после неё добавить:

```makefile
	@echo ""
	@echo "  make convex           - npx convex dev (sync с cloud dev deployment + auto-deploy функций)"
```

(Если попадает не туда визуально — выбрать любое разумное место в help-блоке. Сортировка help-вывода в этом Makefile не строгая.)

В конце файла добавить сам target:

```makefile
# ==============================================================================
# CONVEX
# ==============================================================================

convex:
	npx convex dev
```

- [ ] **Step 6.2: Проверить, что target работает**

```bash
make help | grep convex          # строка `make convex - ...` присутствует
make -n convex                    # dry-run: должно вывести `npx convex dev`, без ошибок про «No rule to make target»
grep -E '^\.PHONY' Makefile       # убедиться, что .PHONY-блок не сломан continuation'ами и `convex` действительно в нём
```

Грубо: `make -n convex` должен напечатать `npx convex dev`. Если не напечатал — `.PHONY` сломан или target определён неверно.

Robust verification (не зависит от формулировок разных версий make):

```bash
make -n convex 2>&1 | grep -q 'npx convex dev' && echo OK || echo BROKEN
```

Если **BROKEN**, диагностика по фактическому выводу `make -n convex` (формулировки зависят от версии GNU Make):
- На **macOS GNU Make 3.81** (дефолт): `make: Nothing to be done for 'convex'.` — make нашёл директорию `convex/` и трактует её как удовлетворённый target вместо phony. **Это самый коварный исход**, потому что выглядит как success. Проверить, что `convex` действительно в `.PHONY`-списке.
- На **GNU Make ≥ 4 (Linux)**: `'convex' is up to date.` — та же причина, другая формулировка.
- `make: *** No rule to make target 'convex'. Stop.` — target вообще не определён (редко, потому что директория `convex/` обычно перебивает это сообщение).

Watcher из Pre-flight уже запущен — повторный `make convex` для тестирования НЕ запускать (два watcher'а конфликтуют за порты).

- [ ] **Step 6.3: Commit**

```bash
git add Makefile
git commit -m "chore(convex): add make convex target"
```

---

## Task 7: Документация — CLAUDE.md и cspell

**Files:**
- Modify: `CLAUDE.md`
- Modify: `cspell.json`

**Цель:** новый разработчик читает `CLAUDE.md` и понимает (1) что Convex — это backend, (2) как его запускать, (3) что в `.env.local`. CSpell-словарь обновлён до того, как `make spell` начнёт падать.

- [ ] **Step 7.1: Найти место в CLAUDE.md**

Открыть `CLAUDE.md`. Найти секцию `## Architecture`. После подсекции `### Domain language` (или перед `### Темы и компонентные контракты` — выбрать визуально логично) добавить новую подсекцию:

```markdown
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
- **Диагностика:** маршрут `/dev` + `convex/health.ts` (ping query + tick mutation). Не продуктовый код, удаляется в Phase 3.
```

- [ ] **Step 7.2: Обновить раздел Commands**

В таблице `## Commands` добавить строку (после `make dev`):

```markdown
| `make convex` | `npx convex dev` — local Convex backend + watch-deploy функций |
```

- [ ] **Step 7.3: Обновить cspell.json**

Открыть `cspell.json`. В массив `words` дописать в конец (порядок в массиве не строгий — это смешанный en+ru список):

- `convex`
- `Convex`
- `convexAuth`
- `authTables`
- `JWKS`
- `JWT`
- `OAuth`
- `oauth`
- `OIDC`
- `signIn`
- `signOut`
- `isAuthenticated`
- `createOrUpdateUser`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `viewer`
- `convex-test`
- `CONVEX_SITE_URL`
- `SITE_URL`
- `applicationID`
- `addHttpRoutes`
- `jwks`

Первые два нужны прямо сейчас (CLAUDE.md секция, имя пакета). Остальные — для Phase 2; добавляем заранее, чтобы Phase 2 ветка не возила cspell-delta.

**Замечание про scope:** `make spell` сканирует `src/**/*.{svelte,ts,css}`, `dictionaries/*.json`, `static/*.html`. Файлы `convex/**/*.ts` и `CLAUDE.md` в scope **не входят**, поэтому слова в них cspell не проверяет напрямую. Если решишь расширить scope spell — это отдельный мини-задача, в эту фазу не пихай.

- [ ] **Step 7.4: Прогнать spell**

```bash
make spell
```
Ожидаемо: ноль ошибок. Если падает на других словах, не связанных с задачей — это не наш bug; зафиксируй и не трогай в этой фазе.

- [ ] **Step 7.5: Commit**

```bash
git add CLAUDE.md cspell.json
git commit -m "docs(convex): document Convex bootstrap in CLAUDE.md"
```

---

## Task 8: Финальная верификация

**Files:** ничего не правится. Только smoke-checks.

- [ ] **Step 8.1: make check-all зелёный**

```bash
make check-all
```

Ожидаемо: lint + check + test + spell + build — все зелёные. Если падает:
- `lint` — посмотри на новые файлы (`convex/*.ts`, `src/lib/convex.ts`, `src/routes/dev/+page.svelte`), исправь
- `check` — типы; чаще всего «не найден `$env/static/public`» → запустить `make sync` и повторить
- `test` — никаких новых тестов, существующие должны проходить
- `spell` — проверь cspell.json
- `build` — production-сборка должна работать (страница /dev безопасно покажет «Not available in production» в build, см. Task 5)

- [ ] **Step 8.2: Финальный smoke**

Watcher из Pre-flight уже жив; в другом терминале — `make dev`. Повторить smoke из Step 5.2: открыть `http://localhost:5173/dev`, Ping → `"pong"`, Tick → id, dashboard показывает новые строки.

- [ ] **Step 8.3: Production build smoke**

```bash
make build
make preview
```

Открыть preview URL → `/dev` → видишь только «Not available in production.» (без кнопок). Это подтверждает, что условный рендер защищает прод.

- [ ] **Step 8.4: Smoke на `npx convex env` против cloud deployment**

Phase 2 будет интенсивно использовать `npx convex env set/get` (и автоматически из `npx @convex-dev/auth` setup-команды). Чтобы не упереться в стену в середине Phase 2, проверить сейчас:

```bash
npx convex env set TEST_KEY hello
npx convex env list | grep TEST_KEY              # ожидаемо: TEST_KEY=hello
npx convex env remove TEST_KEY
npx convex env list | grep CONVEX_SITE_URL       # ожидаемо: CONVEX_SITE_URL=https://wandering-ocelot-9.eu-west-1.convex.site (auto-set cloud)
```

Если все четыре команды отработали — Phase 2 пойдёт штатно. Если последняя строка пуста (CONVEX_SITE_URL не auto-set) — Phase 2 нужно будет выставить руками через `npx convex env set CONVEX_SITE_URL https://wandering-ocelot-9.eu-west-1.convex.site` (плановое допущение в Step 8.5 «не трогать» окажется неверным для этой Convex-версии).

Если `set` или `list` упали — записать симптом в локальные заметки. **Fallback для Phase 2** (если `npx @convex-dev/auth` не запустится автоматически):
1. Сгенерировать RS256-ключи через `jose` руками; проставить `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` через `npx convex env set` поштучно.
2. **Создать руками** файлы, которые CLI обычно генерирует каркас: `convex/auth.config.ts`, `convex/auth.ts`, `convex/http.ts` — шаблоны на https://labs.convex.dev/auth/setup/manual.
3. `npx @convex-dev/auth` без шага 2 **недостаточен** — Convex Auth не работает без этих трёх файлов. Это полный manual setup, а не только «env vars».

- [ ] **Step 8.5: Зафиксировать значения для Phase 2 (в локальный локальные заметки, не в репозиторий)**

В Phase 2 пригодятся **три** URL'ы — не путать:

| Что | Значение в cloud dev mode | Где живёт | Куда пойдёт |
| --- | --- | --- | --- |
| `PUBLIC_CONVEX_SITE_URL` | `https://wandering-ocelot-9.eu-west-1.convex.site` | frontend (`.env.local`) | база OAuth callback'ов: `<URL>/api/auth/callback/github` — это значение пойдёт в GitHub OAuth App как Authorization callback URL |
| `SITE_URL` | `http://localhost:5173` (dev) или production-домен фронта | **Convex backend env** (`npx convex env set SITE_URL ...`) | куда Convex Auth перенаправляет браузер после успешного логина (Vite в dev, production-домен в release) |
| `CONVEX_SITE_URL` | `https://wandering-ocelot-9.eu-west-1.convex.site` | **Convex backend internal** (auto-set cloud, **НЕ устанавливать руками**) | issuer URL в `auth.config.ts` (`process.env.CONVEX_SITE_URL`); Convex Auth проверяет, что JWT выпущен этим issuer'ом |

**Триплет.** `PUBLIC_CONVEX_SITE_URL` — для фронта; `SITE_URL` — куда Convex перенаправляет после логина (Vite origin в dev); `CONVEX_SITE_URL` — issuer-URL для self-issued JWT. **Особое внимание:** не делать `npx convex env set CONVEX_SITE_URL ...` — это перетрёт автозначение cloud-deployment'а.

**Cloud-HTTPS преимущество.** Все Convex URL'ы — HTTPS на cloud-домене (`*.eu-west-1.convex.{cloud,site}`). GitHub OAuth Apps принимают их напрямую без вопросов про `127.0.0.1` vs `localhost`. Apple Sign In (Phase 9) тоже работает на HTTPS-домене из коробки.

**Setup-команда `@convex-dev/auth`.** В Phase 2 для генерации `JWT_PRIVATE_KEY`/`JWKS` запускается:

```bash
npx @convex-dev/auth
```

Это интерактивный one-shot; делает несколько вещей:
1. Конфигурирует `SITE_URL` через `npx convex env set` (см. Step 8.4 smoke).
2. Генерирует RS256-ключи через `jose` и пушит `JWT_PRIVATE_KEY` + `JWKS` в Convex env.
3. **Проверяет `convex/tsconfig.json`.** Если `moduleResolution: 'Bundler'` и `skipLibCheck: true` уже стоят — no-op (наш случай: оба уже выставлены текущим CLI Convex'а). Если бы стояло что-то другое — форсит эти настройки. В Phase 2 ждать diff'а `convex/tsconfig.json` НЕ нужно: для текущего состояния файла CLI пройдёт мимо.
4. Генерирует каркас `convex/auth.config.ts`, `convex/auth.ts`, `convex/http.ts`.

Если автоматический запуск не получится — manual fallback расписан в Step 8.4.

- [ ] **Step 8.6: Локальный merge `feat/convex-bootstrap` → `master`**

Рабочее дерево чистое (последний коммит из Task 7), все коммиты фазы на ветке. Финальная сверка:

```bash
git log master..feat/convex-bootstrap --oneline   # увидеть все коммиты фазы
git diff master..feat/convex-bootstrap --stat     # увидеть итоговый стейтмент изменений
```

**Проверить, что `master` не разошёлся за время работы** (если есть remote `origin`):

```bash
git remote get-url origin >/dev/null 2>&1 && \
  (git fetch origin || echo 'WARN: fetch failed (offline?), divergence check below uses stale ref')
git log master..origin/master --oneline    # remote ahead: что-то прилетело в origin
git log origin/master..master --oneline    # local ahead: локальные коммиты в master, которых нет в origin
```

Если **обе** команды пусты — `master` синхронен, merge'имся напрямую.
Если **первая** непуста (remote ahead): `git switch master && git pull --ff-only`. Если ff-only не получается — кто-то параллельно работал; вне scope плана.
Если **вторая** непуста (local ahead): локальный `master` имеет коммиты, которых нет в `origin/master` — обычно безвредно для merge, просто push в конце будет ahead. Если непонятно откуда они — `git log origin/master..master` покажет, разобраться руками.

После того как `master` зеленый и up-to-date — merge с явным merge-commit'ом (`--no-ff` сохраняет «это была функция-ветка» в истории):

```bash
git switch master
git merge --no-ff feat/convex-bootstrap -m "$(cat <<'EOF'
feat(convex): bootstrap Convex backend with health-check endpoint

Phase 1 of docs/plans/auth.md. Wires Convex as a backend without business logic:

- Standardize env vars to SvelteKit PUBLIC_* convention
- Add health diagnostic table + ping/tick functions
- Register ConvexClient singleton in src/lib/convex.ts
- Add /dev smoke page (dev-only, removed in Phase 3)
- Add `make convex` Makefile target
- Document Convex bootstrap in CLAUDE.md
EOF
)"
```

**Если `git merge` выдаёт conflicts** (master имел дивергентные изменения тех же файлов): `git merge --abort` возвращает в до-merge состояние; разрешать конфликты лучше на ветке (rebase или merge `master` в `feat/...`), потом повторить шаг.

**Повторить `make check-all` ПОСЛЕ merge** на `master` — на случай, если интеграция изменений ветки + (возможный) свежий код `master` дал что-то новое:

```bash
make check-all
```

**Если `make check-all` упал ПОСЛЕ merge** (merge-commit уже на `master`, но красный): сразу, до новых коммитов:

```bash
git reset --hard ORIG_HEAD   # откатывает merge, ORIG_HEAD = master tip до merge
```

И разбираться на ветке. Если уже сделал коммиты поверх — `git reset --hard ORIG_HEAD` уже не подойдёт, искать merge-commit через `git reflog`.

Только если `make check-all` зелёный — удалить ветку:

```bash
git branch -d feat/convex-bootstrap
```

(`-d` сам откажется удалять, если ветка не fully merged — это правильная страховка; не использовать `-D`.)

Push на remote (если нужно) делается отдельно и **остаётся за пользователем** — план в нём не участвует.

---

## Done criteria (перед merge в master)

- [ ] `make check-all` зелёный
- [ ] Ping/Tick работают end-to-end в dev
- [ ] Production-сборка корректно прячет `/dev`
- [ ] `CLAUDE.md` обновлён: новый разработчик может развернуть проект, прочитав инструкции
- [ ] `.env.example` лежит в репозиторий с актуальными ключами, `.env.local` остаётся gitignored
- [ ] Никакого `auth`-кода в этой фазе (это Phase 2)

## Rollback plan

Если что-то идёт не так и нужно откатить:

```bash
git checkout master
git branch -D feat/convex-bootstrap
# Файлы convex/_generated регенерируются автоматически при следующем `npx convex dev`
```

Локальный Convex backend (если был запущен) можно остановить `Ctrl+C` в терминале `make convex`. Local-данные в `health`-таблице остаются — это нормально, они не мешают.

## What's captured for Phase 2

После завершения Phase 1 у тебя должно быть в локальной заметке:

- **URL'ы и setup-команда** — см. таблицу (три URL: `PUBLIC_CONVEX_SITE_URL`, `SITE_URL`, `CONVEX_SITE_URL`) и блок «Setup-команда» в Step 8.5 (не дублируем здесь, чтобы не разъезжалось).
- **Результат env-smoke (из Step 8.4):** работает ли `npx convex env set/list/remove` против cloud deployment. Должно работать штатно; если упало — Phase 2 начинается с manual fallback (см. Step 8.4).
- **Предпосылка Phase 2:** `npx convex dev` (или `make convex`) должен быть запущен в отдельном терминале при выполнении `npx @convex-dev/auth` setup-команды (она внутри ходит к cloud backend через `npx convex env set`).
- **Smoke-метод Phase 2:** Convex dashboard работает напрямую (мы на cloud) — можно проверить sign-in через `users` таблицу. Дополнительно — временный вызов из `/dev` страницы (Phase 2 ещё не удаляет `/dev`).
- **Phase 2 step 1 должен включать** `npm install -D convex-test` — Phase 2 пишет unit-тесты для `createOrUpdateUser` через `convex-test`, но пакет сейчас не установлен.

---

## Self-review notes (auditor's checklist)

Этот план прошёл self-review автора:

1. **Spec coverage против Phase 1 в umbrella-плане:**
   - `convex/_generated/` — авто, не правим ✓
   - `convex/schema.ts` — Task 2 ✓
   - `convex/health.ts` — Task 3 ✓
   - `convex.json` — **отсутствует**, и это OK: `convex.json` опционален в обоих режимах (cloud и local) и нужен только для нестандартного конфига (собственный `functions` path, components, и т.д.). Для текущего setup'а не требуется.
   - `src/lib/convex.ts` — Task 4 ✓
   - `src/routes/dev/+page.svelte` — Task 5 ✓
   - `.env.example` — Task 1 ✓
   - `.gitignore` — pre-flight check (уже корректен, не правим)
   - `Makefile` — Task 6 ✓
   - `CLAUDE.md` — Task 7 ✓
   - `cspell.json` — Task 7 ✓

2. **Placeholder scan:** прошёл, все шаги содержат полный код и точные команды.

3. **Type consistency:** `api.health.ping`, `api.health.tick`, `ConvexClient`, `PUBLIC_CONVEX_URL` — единообразно через все задачи.
