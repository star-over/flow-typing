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
`convex/auth.config.ts`). Нужна **новая** RS256-пара на prod (генерировать после шага 2 —
prod-развёртывание должно существовать).

**Рекомендуемый путь (план §2 P0-2) — официальный инструмент с явным нацеливанием на prod:**

```bash
npx @convex-dev/auth --prod
```

Флаг `--prod` бьёт по production-развёртыванию проекта (подтверждено доками Convex Auth);
команда интерактивно генерирует свежую RS256-пару и **сразу ставит на prod** минимальный
набор auth-переменных: `JWT_PRIVATE_KEY`, `JWKS` и `SITE_URL`. Тогда в шаге 5 останутся
только OAuth-секреты (JWT и `SITE_URL` уже стоят — там их только проверяем).

**Ручная альтернатива** (сгенерировать значения и задать их самому в шаге 5) — создать
`generateKeys.mjs`:

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

`jose` — **не прямая зависимость проекта**; доступна транзитивно через `@convex-dev/auth`
(поднята в top-level `node_modules`). Если `node` не найдёт модуль — `npm i -D jose`.
Значения из вывода задаём на prod в шаге 5.

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

Все команды с флагом `--prod` (бьёт по production-развёртыванию; подтверждено `convex env --help`).

**OAuth-секреты (всегда ставим здесь — из шага 4):**

```bash
npx convex env set --prod AUTH_GITHUB_ID '<github-client-id>'
npx convex env set --prod AUTH_GITHUB_SECRET '<github-client-secret>'
npx convex env set --prod AUTH_GOOGLE_ID '<google-client-id>'
npx convex env set --prod AUTH_GOOGLE_SECRET '<google-client-secret>'
```

**`SITE_URL` + JWT-ключи:** если в шаге 3 запускал `npx @convex-dev/auth --prod` — они уже
стоят, только проверь (`env list` ниже). Если шёл ручной альтернативой — задай их здесь:

```bash
npx convex env set --prod SITE_URL https://<prod-domain>
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

## 11. Залить корпус в prod (обе раскладки: EN + RU)

Приложение **мультиязычное** (сейчас языков два — RU+EN в общей таблице `drills`). Запуск
EN-first (ADR 0021) — про когорту замера, **не** про содержимое сервера: на prod заливаем
**оба** корпуса, иначе RU-юзер (напр. из-под VPN) получит пустую сессию.

Makefile-цели (`import-corpus`/`ladder-report`) ходят в развёртывание из `CONVEX_DEPLOYMENT`
(= dev) и `--prod` **не пробрасывают** — поэтому против prod бьём `convex import`/`run`
напрямую с `--prod` (тяжело по Database I/O — у prod своя квота):

```bash
# EN (qwerty) — воспроизводимый jsonl на диске
npx convex import --prod --table drills --append --format jsonLines --yes auto-flow/corpus/en/jsonl/en-corpus.jsonl
# RU (йцукен) — путь задаёт P0-9 (воспроизводимый RU-jsonl готовится отдельным шагом, см. ниже)
npx convex import --prod --table drills --append --format jsonLines --yes <ru-jsonl>
# пересчёт таблицы отбора + контентный радар — по ОБЕИМ раскладкам (нет дыр на шагах 0–5)
npx convex run --prod selectionIndex:rebuild '{"symbolLayoutId":"qwerty"}'
npx convex run --prod selectionIndex:rebuild '{"symbolLayoutId":"йцукен"}'
npx convex run --prod selectionIndex:ladderReport '{"symbolLayoutId":"qwerty"}'
npx convex run --prod selectionIndex:ladderReport '{"symbolLayoutId":"йцукен"}'
```

> ⚠️ **Предпосылка RU:** воспроизводимого RU-jsonl (`<ru-jsonl>`) на диске нет — источник
> корпуса йцукен утерян, 9715 drill'ов живут только в dev Convex. Подготовить его —
> **отдельный шаг P0-9** (регенерация конвейером либо `convex export` из dev → извлечь
> `drills/documents.jsonl` → фильтр по йцукен). Без него RU не залить; EN лить можно независимо.
> `import` — **append**: повторная заливка ТОЙ ЖЕ раскладки дублирует drill'ы. Лить один раз.

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
