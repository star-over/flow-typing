# Production bootstrap — runbook (P0-2)

> Постановка: `docs/plans/2026-07-05-mvp-launch.md` §2 P0-2 + §4. Канон окружения:
> **ADR 0023** (`DEPLOY_ENV` fail-closed), **ADR 0012** (dev-вход отсутствует на prod).
> Выбор запуска: хостинг — **Cloudflare Pages**, OAuth — **GitHub + Google** (2026-07-10).

Это **owner-runbook**: команды выполняет владелец из своих аккаунтов (Convex, GitHub,
Google, Cloudflare, регистратор домена). Артефакты в репозитории уже готовы:
`.github/workflows/deploy.yml`, `static/_headers`, `static/_redirects`. Заполнители
(домен, секреты, Convex-хост) подставляются здесь — в коде их нет.

Заполни таблицу подстановок один раз и держи под рукой:

| Заполнитель | Значение (заполнить) |
|---|---|
| `<prod-domain>` | боевой домен фронта, напр. `flow-typing.app` |
| `<prod-convex>` | имя prod-развёртывания Convex, напр. `bold-otter-42` (host-часть `PUBLIC_CONVEX_URL`) |

---

## 0. Предпосылки

- Аккаунт Convex (тот же, что владеет проектом `wandering-ocelot-9`).
- Аккаунт Cloudflare (Pages включён; бесплатного тарифа хватает — план §4).
- Доступ к регистратору домена и к DNS (перенос NS/CNAME на Cloudflare).
- GitHub-репозиторий `star-over/flow-typing` (Actions включены).

---

## 1. Домен

Купить `<prod-domain>` (~$10–15/год). Нужен для трёх вещей (план §4): экраны согласия
OAuth требуют privacy-policy на том же домене (стык с **P0-4**), бренд/доверие, SEO.
DNS позже наведём на Cloudflare Pages (шаг 7).

## 2. Prod-развёртывание Convex + ключ развёртывания

1. Создать production-развёртывание (Convex Dashboard → проект → **Production** → Deploy, либо
   первый `npx convex deploy` из аккаунта владельца создаёт его).
2. Dashboard → prod-развёртывание → **Settings → Deploy Keys → Generate Production Key**.
   Формат `prod:<name>-123|eyJ2...`. Это будущий GitHub-секрет `CONVEX_DEPLOY_KEY`
   (шаг 6). Компоненты Convex (`aggregate`, `rateLimiter`) развернутся автоматически.

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

## 6. GitHub secrets для CI

Repo → Settings → Secrets and variables → **Actions → Secrets**:
- `CONVEX_DEPLOY_KEY` — prod ключ развёртывания (шаг 2).
- `CLOUDFLARE_API_TOKEN` — токен со scope **Cloudflare Pages: Edit**
  (Cloudflare → My Profile → API Tokens).
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare → Workers & Pages → Account ID.

Опционально **Variables** → `CF_PAGES_PROJECT`, если имя проекта Pages ≠ `flow-typing`.

## 7. Проект Cloudflare Pages + домен

1. Создать проект Pages (Direct Upload режим — сборку делает CI, не CF):
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

## 9. Первое развёртывание

Автоматически — push в `master` запустит `.github/workflows/deploy.yml`
(Convex prod push + сборка + publish на Pages). Либо вручную из аккаунта владельца:

```bash
CONVEX_DEPLOY_KEY='<prod key>' npx convex deploy --cmd "make build" --cmd-url-env-var-name PUBLIC_CONVEX_URL
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
> заданное `CONVEX_DEPLOYMENT`/ключом развёртывания. Убедись, что нацелен на **prod** (экспортируй
> `CONVEX_DEPLOY_KEY=<prod>` в шелле или добавь `--prod` в соответствующие вызовы Makefile).
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
| `PUBLIC_CONVEX_URL` (сборка) | из `.env.local` | подставляет `convex deploy --cmd-url-env-var-name` в CI |
| `PUBLIC_DEV_LOGIN*` (`.env.local`) | опц. | **отсутствуют** (в CI нет `.env.local`) |
| OAuth callback | `...wandering-ocelot-9.convex.site/...` | `https://<prod-convex>.convex.site/api/auth/callback/<provider>` |

## Добавить OAuth-провайдера позже (Yandex/Apple/…)

Шаги «Add new OAuth provider» — в `CLAUDE.md` (импорт из `@auth/core/providers/<name>`
в `convex/auth.ts`, регистрация callback, `convex env set --prod AUTH_<NAME>_*`, push).
