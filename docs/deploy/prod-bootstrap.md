# Production bootstrap — runbook (P0-2)

> Постановка: `docs/plans/2026-07-05-mvp-launch.md` §2 P0-2 + §4. Канон окружения:
> **ADR 0023** (`DEPLOY_ENV` fail-closed), **ADR 0012** (dev-вход отсутствует на prod).
> Выбор запуска: хостинг — **Cloudflare Pages**, OAuth — **GitHub + Google** (2026-07-10).

Это **owner-runbook**: команды выполняет владелец из своих аккаунтов (Convex, GitHub,
Google, Cloudflare, регистратор домена). **Развёртывание — ручное с ноутбука** (CI отложен,
см. `docs/backlog.md`). Артефакты в репозитории готовы: `static/_headers`, `static/_redirects`. Заполнители
(домен, секреты, Convex-хост) подставляются здесь — в коде их нет.

Заполни таблицу подстановок один раз и держи под рукой:

| Заполнитель | Значение (заполнить) |
|---|---|
| `<prod-domain>` | **`flowtyping.app`** — ✅ куплен (2026-07-10) |
| `<prod-convex>` | имя prod-развёртывания Convex, напр. `bold-otter-42` (host-часть `PUBLIC_CONVEX_URL`) |

---

## 0. Предпосылки

- Аккаунт Convex (тот же, что владеет проектом `wandering-ocelot-9`).
- Аккаунт Cloudflare (Pages включён; бесплатного тарифа хватает — план §4).
- Доступ к регистратору домена и к DNS (перенос NS/CNAME на Cloudflare).
- CLI на ноутбуке: `npx convex login` (вход в аккаунт Convex) + `npx wrangler login` (вход в Cloudflare).

---

## 1. Домен

> ✅ **Сделано (2026-07-10):** `flowtyping.app` куплен.

Купить `<prod-domain>` (~$10–15/год). Нужен для трёх вещей (план §4): экраны согласия
OAuth требуют privacy-policy на том же домене (стык с **P0-4**), бренд/доверие, SEO.
DNS позже наведём на Cloudflare Pages (шаг 7).

## 2. Prod-развёртывание Convex

Создать production-развёртывание: `npx convex login` (если ещё не вошёл), затем первый
`npx convex deploy` из аккаунта владельца создаёт prod (или Dashboard → проект →
**Production** → Deploy). Ручное развёртывание идёт через активную CLI-сессию — **ключ
развёртывания не нужен** (он только для CI, отложен в backlog). Компоненты Convex
(`aggregate`, `rateLimiter`) развернутся автоматически.

## 3. Свежие JWT-ключи для self-issued auth (из dev НЕ переносить)

Convex Auth подписывает свои JWT (issuer = `CONVEX_SITE_URL`, авто; см.
`convex/auth.config.ts`). Нужна **новая** RS256-пара на prod.

Сгенерировать (`jose` уже в зависимостях) — создать `generateKeys.mjs`:

```js
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';
const keys = await generateKeyPair('RS256', { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: 'sig', ...publicKey }] });
process.stdout.write(`JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, ' ')}"\n`);
process.stdout.write(`JWKS=${jwks}\n`);
```

```bash
node generateKeys.mjs
```

Значения задаём на prod в шаге 5. (Альтернатива — интерактивный
`npx @convex-dev/auth`, но он конфигурирует выбранное развёртывание; ручной путь с
`--prod` ниже надёжнее для явного нацеливания на боевой.)

## 4. Prod OAuth-приложения (GitHub + Google)

Callback URL — это **backend**-адрес Convex (`.convex.site`), не фронт:

- **GitHub** → Settings → Developer settings → **New OAuth App**:
  - Homepage URL: `https://<prod-domain>`
  - Authorization callback URL: `https://<prod-convex>.convex.site/api/auth/callback/github`
  - Получить Client ID + Client Secret.
- **Google Cloud Console** → APIs & Services → Credentials → **OAuth client ID** (Web):
  - Authorized redirect URI: `https://<prod-convex>.convex.site/api/auth/callback/google`
  - OAuth consent screen: scopes только `email`/`profile` (non-sensitive).
  - ⚠️ Непроверенное приложение = экран «unverified» + **лимит 100 юзеров за всё время**
    (для ≤100-когорты ок, план §4). Brand-verification убирает экран и требует
    privacy-policy на `<prod-domain>` → стык с **P0-4**.

## 5. Prod-env Convex (⚠️ fail-closed инверсии — ADR 0023)

Все команды с флагом `--prod` (бьёт по production-развёртыванию; подтверждено `convex env --help`):

```bash
npx convex env set --prod SITE_URL https://<prod-domain>
npx convex env set --prod AUTH_GITHUB_ID '<github-client-id>'
npx convex env set --prod AUTH_GITHUB_SECRET '<github-client-secret>'
npx convex env set --prod AUTH_GOOGLE_ID '<google-client-id>'
npx convex env set --prod AUTH_GOOGLE_SECRET '<google-client-secret>'
npx convex env set --prod JWT_PRIVATE_KEY '<из шага 3>'
npx convex env set --prod JWKS '<из шага 3>'
```

**НЕ ставить на prod (иначе откроешь dev-двери):**
- ❌ `DEPLOY_ENV` — не задавать (fail-closed → трактуется как prod; ADR 0023).
  Для читаемости допустимо явно `npx convex env set --prod DEPLOY_ENV production`,
  но **никогда** `development`.
- ❌ `AUTH_DEV_LOGIN_ENABLED` — не ставить (Password-провайдер не поднимется; ADR 0012).
- ❌ `CONVEX_SITE_URL` — не трогать руками (Convex выставляет сам).

Проверить: `npx convex env list --prod --names-only` — убедиться, что нет `DEPLOY_ENV=development`
и нет `AUTH_DEV_LOGIN_ENABLED`.

## 6. CI (авто-развёртывание на push) — ОТЛОЖЕН

Автоматизация «git push → развёртывание» (GitHub Actions + секреты `CONVEX_DEPLOY_KEY` /
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`) отложена — см. `docs/backlog.md`.
Для MVP развёртывание ручное (шаг 9). Здесь ничего делать не нужно.

## 7. Проект Cloudflare Pages + домен

1. Создать проект Pages (Direct Upload — сборку делаешь локально, publish через wrangler):
   ```bash
   npx wrangler pages project create flow-typing --production-branch=master
   ```
   (или Dashboard → Workers & Pages → Create → Pages → Direct Upload).
2. Custom domain: Dashboard → проект → **Custom domains** → добавить `<prod-domain>`;
   перенести DNS домена на Cloudflare (NS у регистратора) либо CNAME на `*.pages.dev`.

## 8. Security-заголовки (CSP / HSTS) — отложены в отдельную волну

На запуске `static/_headers` несёт только минимальный набор без lock-in (X-Content-Type-Options,
`X-Frame-Options`, `Referrer-Policy`) — на этом шаге делать ничего не нужно. **CSP** и
**HSTS** припаркованы с готовыми черновиками в **`docs/deploy/security-headers.md`**
(включаются отдельным сфокусированным проходом, удобно вместе с P0-4: self-host шрифтов
меняет CSP). Причина отсрочки: CSP легко ломает загрузку и требует проверки на preview,
а HSTS с длинным `max-age`/`preload` необратим — вводится лесенкой.

## 9. Первое развёртывание (вручную с ноутбука)

После `npx convex login` (аккаунт-владелец) и `npx wrangler login`:

```bash
# 1) push функций/схемы в prod + сборка фронта с prod-URL (интерактивная сессия — deploy key НЕ нужен)
npx convex deploy --cmd "make build" --cmd-url-env-var-name PUBLIC_CONVEX_URL
# 2) publish собранной статики на Pages
npx wrangler pages deploy build --project-name=flow-typing --branch=master
```

## 10. Проверка (smoke, до наведения домена — на `*.pages.dev` preview)

- Открыть preview-URL Pages. В DevTools → Network: WebSocket к `<prod-convex>.convex.cloud`
  поднялся. (CSP на запуске нет — она в отложенной волне, шаг 8; когда включишь — тут же
  проверять отсутствие CSP-violation в консоли.)
- Вход через **GitHub** и через **Google** (каждый OAuth = отдельный аккаунт, правило
  «провайдер = аккаунт»).
- Аватар грузится (`img-src` покрывает CDN провайдеров).
- Пройти сессию тренировки (нужен корпус — шаг 11), открыть `/stats`.
- Кнопки dev-входа на `/signin` **нет** (проверка, что `PUBLIC_DEV_LOGIN*` не запеклись).

## 11. Залить корпус в prod

Против prod-развёртывания (`--prod` для import/run; тяжёлый по Database I/O — у prod своя квота):

```bash
# ru (йцукен) и en (qwerty) — обе раскладки в общей таблице drills (билингва)
make import-corpus LAYOUT=йцукен OUTPUT=auto-flow/corpus/drills.jsonl
make import-corpus LAYOUT=qwerty  OUTPUT=auto-flow/corpus/en-corpus.jsonl
make ladder-report LAYOUT=йцукен   # контентный радар: нет дыр на шагах 0–5
make ladder-report LAYOUT=qwerty
```

> ⚠️ `make import-corpus` / `rebuild-selection-index` / `ladder-report` ходят в развёртывание,
> заданное `CONVEX_DEPLOYMENT`. При ручном развёртывании нацеливай prod флагом `--prod` на
> `npx convex import`/`run` напрямую (Makefile-цели его не пробрасывают).
> `import-corpus` — **append**: повторная заливка ТОЙ ЖЕ раскладки дублирует drill'ы.

---

## Env-матрица (сводка — полная в плане §4)

| Переменная | dev (`wandering-ocelot-9`) | prod |
|---|---|---|
| `DEPLOY_ENV` (Convex) | `development` | **не ставить** (или `production`) |
| `AUTH_DEV_LOGIN_ENABLED` (Convex) | `true` | **не ставить** |
| `JWT_PRIVATE_KEY`+`JWKS` (Convex) | dev-ключи | **свежие** (шаг 3) |
| `AUTH_{GITHUB,GOOGLE}_ID/SECRET` (Convex) | dev OAuth-app | prod OAuth-app (шаг 4) |
| `SITE_URL` (Convex) | `http://localhost:5173` | `https://<prod-domain>` |
| `PUBLIC_CONVEX_URL` (сборка) | из `.env.local` | подставляет `convex deploy --cmd-url-env-var-name` при ручном развёртывании |
| `PUBLIC_DEV_LOGIN*` (`.env.local`) | опц. | **отсутствуют** (prod-сборка `.env.local` без dev-флагов) |
| OAuth callback | `...wandering-ocelot-9.convex.site/...` | `https://<prod-convex>.convex.site/api/auth/callback/<provider>` |

## Добавить OAuth-провайдера позже (Yandex/Apple/…)

Шаги «Add new OAuth provider» — в `CLAUDE.md` (импорт из `@auth/core/providers/<name>`
в `convex/auth.ts`, регистрация callback, `convex env set --prod AUTH_<NAME>_*`, push).
