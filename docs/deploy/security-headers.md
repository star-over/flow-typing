# Security-headers wave (deferred from P0-2)

> Статус: **отложено в отдельную волну** (решение владельца, 2026-07-10). На запуске
> в `static/_headers` — только минимальный набор без lock-in (`X-Content-Type-Options`,
> `X-Frame-Options`, `Referrer-Policy`). Здесь припаркованы два «тяжёлых» заголовка —
> **CSP** и **HSTS** — с готовыми черновиками, чтобы включить их отдельным сфокусированным
> проходом (удобно вместе с **P0-4**: self-host шрифтов меняет CSP).

## Почему отложено, а не выброшено

Два разных мотива:

- **CSP** откладываем ради **фокуса**, не из-за необратимости. Это самый мощный заголовок и
  одновременно тот, что легче всего ломает легитимную загрузку (в первую очередь WebSocket к
  Convex через `connect-src`). Его нужно собрать и **проверить на preview-URL** до наведения
  домена, а не вкатывать вслепую с заполнителем. Обратимость — на следующий развёртыванием.
- **HSTS** откладываем из-за **реального lock-in**. Это единственный заголовок, который браузер
  намеренно *запоминает* на `max-age`, а `preload` вшивается в бинарники Chrome/Firefox
  (вычищается месяцами). Вводить только лесенкой (ниже).

## Модель обратимости (почему «кеш» — миф для всех, кроме HSTS)

Все эти заголовки — HTTP-заголовки **ответа**, CF накладывает их заново из `_headers` на каждый
ответ. Поменял файл → переразвернул → следующий ответ несёт новое значение.

| Заголовок | Хранится ли браузером | Как откатить |
|---|---|---|
| CSP | нет | переразвернуть |
| X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy | нет | переразвернуть |
| **HSTS** | **да, на `max-age`** | выставить `max-age=0` **и** дождаться, пока браузер снова зайдёт; `preload` — удаление из списка месяцами |

Вывод: «агрессивно кешируется, потом не исправить» относится **только к HSTS с длинным
`max-age`/`preload`**. Поэтому только он требует осторожной лесенки; CSP можно совершенствовать свободно.

---

## CSP — черновик, готовый к включению

Добавить строкой в блок `/*` файла `static/_headers`. **Перед включением** заменить
`__PROD_CONVEX__` (3 вхождения) на имя prod-деплоя Convex (host-часть `PUBLIC_CONVEX_URL`,
напр. `wandering-ocelot-9`).

```
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://avatars.githubusercontent.com https://*.googleusercontent.com; connect-src 'self' https://__PROD_CONVEX__.convex.cloud wss://__PROD_CONVEX__.convex.cloud https://__PROD_CONVEX__.convex.site
```

Пояснения по директивам (привязка к реальному коду):

- **`connect-src`** — главная директива (ограничивает исходящие соединения): `self` + Convex
  `.cloud` (https + **wss** — клиент держит WebSocket) + `.site` (HTTP-роуты auth). Если хост
  указан неверно — приложение не достучится до бэкенда (fail-loud на preview).
- **`script-src 'unsafe-inline'`** — вынужденно: статический SPA, у SvelteKit собственный inline
  bootstrap-`<script>`, чьё содержимое (хеши фрагментов, переменная `__sveltekit_*`) меняется **каждую
  сборку** → статический hash невозможен, nonce требует SSR. XSS-поверхность низкая (типизированный
  текст сравнивается, не рендерится как HTML). **Строгая альтернатива** — `kit.csp` (см. ниже).
- **`style-src`/`font-src`** — **завязаны на P0-4.** Пока `src/app.html` грузит Google Fonts,
  CSP обязан пускать `https://fonts.googleapis.com` (стиль) и `https://fonts.gstatic.com` (шрифты).
  После self-host шрифтов (P0-4: woff2 в `static/fonts/`, `@font-face` в `src/app.css`) — убрать
  оба Google-origin'а, оставить `'self'`. **Это и есть причина вести CSP-волну вместе с P0-4.**
- **`img-src`** — CDN аватаров OAuth (GitHub `avatars.githubusercontent.com`, Google
  `*.googleusercontent.com`), их рендерит `Avatar.svelte`.
- **`frame-ancestors 'none'`** — защита от clickjacking-атак заголовком (дублирует `X-Frame-Options`, который
  уже в волне 1); `frame-ancestors` работает только заголовком, не через `<meta>`.

### Включение + проверка на preview (обязательно до домена)

1. Заменить `__PROD_CONVEX__`, добавить строку CSP в `static/_headers`, переразвернуть на **preview**.
2. Открыть preview-URL, DevTools → Console: **нет** `Refused to connect/load ... CSP` ошибок.
3. WebSocket к `<prod-convex>.convex.cloud` поднялся (Network → WS).
4. Вход GitHub и Google; аватар грузится; шрифты применились; пройти сессию тренировки.
5. Только после чистого прогона — наводить домен.

### Строгий вариант `script-src` (опция, не обязательна)

Вместо `'unsafe-inline'` — включить нативный `kit.csp` в `svelte.config.js` (`mode: 'hash'`):
SvelteKit сам вычисляет хеши обоих inline-скриптов на **каждой** сборке и кладёт CSP в `<meta>` (для
статики). Минусы: трогает `svelte.config.js`, может мешать dev-HMR, и `<meta>`-CSP не умеет
`frame-ancestors`/`report-uri` (их оставить заголовком). Оценивать в ту же волну.

---

## HSTS — вводить лесенкой, не сразу

CF Pages уже перенаправляет HTTP→HTTPS на границе (плюс включить «Always Use HTTPS» в панели CF),
так что HSTS — это защита от SSL-strip на *первом* заходе, не критично для запуска.

Лесенка (каждая ступень — только после того, как убедились, что HTTPS стабилен):

1. `Strict-Transport-Security: max-age=300` — 5 минут. Если что-то ломается, откат почти мгновенный.
2. → `max-age=86400` (сутки), затем `max-age=31536000` (год).
3. Добавить `includeSubDomains` **только** когда точно все поддомены на HTTPS.
4. `preload` — **в самом конце** и осознанно (submit на hstspreload.org; удаление месяцами из списка).

Не начинать с `max-age=63072000; includeSubDomains; preload` — это как раз необратимый вариант.

---

## Permissions-Policy (опционально, с этой же волной)

Отключить неиспользуемые функции браузера (обратимо, риск ~нулевой):

```
  Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
```
