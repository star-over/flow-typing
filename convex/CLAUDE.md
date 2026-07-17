# Convex backend

Backend для синхронизированных данных (auth с Phase 2, settings sync, sessions). Запускается отдельным процессом параллельно с Vite.

- **Mode:** cloud dev deployment (`CONVEX_DEPLOYMENT` в `.env.local` — конкретный id и регион там). Production-deployment — отдельный cloud-deployment позже.
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
- Настроенные провайдеры — в `convex/auth.ts` (`buildProviders`). Apple/SberID — Roadmap V2.
- **Dev-вход (ADR 0012; механизм — ADR 0024):** стоковый Password-провайдер за единственным признаком не-prod (`convex/auth.ts:buildProviders` требует `!isProduction()`; fail-closed `DEPLOY_ENV`, ADR 0023). На production провайдера нет: без явного `DEPLOY_ENV=development` deployment трактуется как prod. Кнопка на `/signin` — за `import.meta.env.DEV` (нет в prod-сборке; единообразно с `window.__*` dev-helper'ами, `appActor.ts`), тестовый dev-аккаунт зашит в компонент. Ноль env-флагов клиенту, ноль `.env.local`. Пара к нему — `resetMyProfile` («чистый лист» прогонов). Инструмент для ИИ-агентов/E2E (тренировка требует входа — `/train` и `drill*` auth-required), не продуктовый режим.

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
- `AUTH_<PROVIDER>_ID` / `AUTH_<PROVIDER>_SECRET` — credentials OAuth Apps, по паре на каждый настроенный провайдер (перечень провайдеров — `convex/auth.ts`; см. `Add new OAuth provider`).
- `DEPLOY_ENV` — признак окружения деплоя для gating dev-инструментов (ADR 0023). **fail-closed**: `development` на dev-deployment снимает prod-предохранители; не задан (или `production`) на боевом = закрыто. Читается чистым helper'ом `convex/lib/env.ts` (`isProduction()`/`assertNonProd()`) — единый гейт `resetMyProfile`/`setMyOpenedSteps` **и** Password-провайдера dev-входа (ADR 0024 снял отдельный `AUTH_DEV_LOGIN_ENABLED`). **На dev-deployment обязателен** (`npx convex env set DEPLOY_ENV development`), иначе dev-двери на нём выключены.

**Viewer query:** `api.users.viewer` возвращает текущего юзера (документ из `users`) или `null`.

**Доменные инварианты backend (ADR).**
- Профиль **server-authoritative**: вся адаптивная логика и истина прогресса — на сервере (Convex); клиент тонкий (держит training machine, таймер, буфер, чистую `stream → DrillSummary`). Один писатель, одна истина (ADR 0005).
- `drillNext` **тотален**: для раскладки с серверными данными всегда возвращает непустой `drills`; на контентный сбой строит дефолт из символов открытых шагов. **Клиентского корпуса нет** — единственный корпус — таблица `drills`; контракт минимален `{ drills: [{ text }] }` (ADR 0011).
- Рост репертуара — CQRS: `drillRecord` (писатель) растит `openedSteps` монотонно; `drillNext` — чистый читатель, роста не вычисляет (ADR 0008). Модель прогрессии — `shared/` (см. `shared/CLAUDE.md`).

**Backend settings sync (Phase 5).** `convex/userSettings.ts` — `getMine` query (auth-required, `null` при unauth), `upsertMine` mutation (auth-required, `throw 'Not authenticated'` при unauth). Логика в `getMineHandler` / `upsertMineHandler` — testable отдельно от auth-обёртки (паттерн `createOrUpdateUserHandler`). `updatedAt` ставит сервер. **«Провайдер = аккаунт» enforced здесь:** `userSettings` row ссылается на `userId: v.id('users')`. Один email через GitHub vs Google = два юзера = два независимых settings row. By design. Клиентская часть sync — `src/lib/CLAUDE.md`.

**Тесты (convex project).** `convex/**/*.test.ts` → project `convex`, **`edge-runtime` environment**, `convex-test` для unit-тестов функций. Здесь `getAuthUserId`, `createOrUpdateUserHandler`, любая backend-логика, которая трогает `ctx.db`. Правило «где код, там тест» и общий 4-проектный split — корневой `CLAUDE.md`.
