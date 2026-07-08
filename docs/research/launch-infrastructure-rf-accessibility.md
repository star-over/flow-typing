# Инфраструктура запуска через призму доступности из РФ

> Дата: 2026-07-07. Статус: исследование к решению (кандидат в новый ADR + правку `docs/plans/2026-07-05-mvp-launch.md` §4/§10).
> Повод: план §4 рекомендовал западный стек (Cloudflare Pages + Convex cloud + Google/GitHub OAuth + Plausible cloud + Google Fonts). Целевая аудитория MVP — русскоязычная (`PRODUCT.md`, план §0). В среде 2026 этот стек **активно враждебен РФ-пользователю**. Ниже — пересборка по слоям с осями: доступность из РФ · расширяемость · переход на полноценный сервер · юр.риск · приватность/бренд · цена.

## TL;DR — рекомендация

**Стек плана §4 в текущем виде для РФ-аудитории сломан или становится нелегальным.** Разворот на РФ-устойчивый стек:

| Слой | План §4 (западный) | Проблема в РФ (2026) | Рекомендация |
|---|---|---|---|
| Хостинг статики | Cloudflare Pages | Ограничение полосы CF в РФ до 16 КБ/запрос с июня 2025 → сайт не грузится | **Yandex Cloud Object Storage** (или РФ-VPS/CDN); зеркало за рубежом — для Фазы 2 EN |
| Бэкенд | Convex cloud (AWS eu-west-1) | WebSocket на `.convex.cloud`/AWS — риск ограничения полосы/DPI; **критичнее хостинга** | **Self-host Convex** (Docker) на РФ-инфра — тот же код, без переписывания |
| Auth | GitHub (primary) + Google | Закон от 09.06.2026: foreign-OAuth при регистрации = штраф оператору до 700k ₽; GitHub деградирует | **Yandex OAuth primary + телефонный OTP**; Google/GitHub — только не-РФ / Фаза 2 |
| Аналитика | Plausible cloud | Bunny CDN (EU) — риск ограничения полосы; данные грузятся с EU | **Yandex Metrica** (гарант. доступ) ИЛИ **self-host Plausible** на РФ-инфра |
| Шрифты | Google Fonts | Утечка IP + ограничение полосы gstatic (уже P0-4) | **Self-host Geist/Geist Mono** |
| Error-tracking | Sentry cloud | Риск ограничения полосы SaaS | **Self-host GlitchTip** (Sentry-совместимый) на РФ-инфра |
| Домен | .com | — | **.ru** через РФ-регистратора (доверие + доступность) |

**Стратегический вывод:** РФ-запуск требует не «выбрать хостинг», а **сместить весь стек на РФ-инфра/РФ-нативные сервисы**, а западные звенья держать за флагом функции для Фазы 2 (EN-аудитория). Хорошая новость: архитектура проекта это **позволяет почти бесплатно** — Convex самостоятельно размещаемый, Auth уже включает Yandex + умеет Phone/OIDC, статика уже SPA-fallback (ложится на Object Storage), шрифты самостоятельно размещаемые уже в P0-4.

---

## 1. Доступность из РФ — что реально происходит в 2026

Ключевой факт, недооценённый планом: **Роскомнадзор в 2025–2026 систематически душит западную веб-инфраструктуру**, не только «сайты».

- **Cloudflare:** с **9 июня 2025** российские ISP ограничивают полосу Cloudflare-защищённых сайтов — режут выдачу до **16 КБ на запрос**, «rendering most websites nearly unusable» (Cloudflare, The Record, HRW). Плюс блок ECH с ноября 2024 и блокировки тысяч сайтов на CF. → **Cloudflare Pages (рекомендация §4) для РФ практически неработоспособен.**
- **Vercel:** множественные подтверждённые случаи блокировки Vercel-IP в РФ, prod-домены недоступны без VPN (Vercel Community, 2025–2026). У Vercel к тому же есть OFAC-firewall-шаблоны. → **ненадёжно.**
- **GitHub:** май 2026 — деградация доступа (10–16% провальных соединений), РКН отрицает блок, но по факту замедляется; власти анонсировали «государственный VPN» для разработчиков (Meduza). → **OAuth через GitHub для РФ ненадёжен и ухудшается.**
- **Google:** ограничение создания аккаунтов в РФ + **закон** (см. §3).
- **AWS (на нём Convex):** прямого блока нет, но «различные хостинги и CDN при доступе из РФ дают синтетические задержки, CAPTCHA, деградацию» (Full Steak Dev). WebSocket/TLS-DPI (ТСПУ) — дополнительный риск для realtime-Convex.

**Вывод:** доступность из РФ — не второстепенный критерий, а **фильтр №1**. Любое западное звено на критическом пути (загрузка SPA, WebSocket к бэкенду, редирект на OAuth, загрузка шрифта/скрипта аналитики) — точка отказа для целевого пользователя.

---

## 2. Хостинг статики (SvelteKit adapter-static, SPA)

Проект собирается в `build/` с `fallback: index.html` — кладётся на любое объектное хранилище/CDN с SPA-fallback.

| Вариант | Доступ из РФ | Расширяемость | Цена | Вердикт |
|---|---|---|---|---|
| **Yandex Cloud Object Storage** | ✅ РФ-нативный | статика; SPA-fallback = error page → `index.html`; DNS/SSL/serverless рядом | free-tier ≈ 0 ₽ (+домен ~800 ₽/год) | **Рекомендация РФ** |
| Selectel / Timeweb / Beget (VPS+nginx) | ✅ РФ-нативный | полный контроль (можно рядом бэкенд) | 200–900 ₽/мес | Хорошая альтернатива, если рядом self-host Convex |
| Cloudflare Pages | 🔴 ограничение полосы 16 КБ | отлично (edge, `_headers`) | free | **Отвергнут для РФ** |
| Vercel / Netlify | 🟡 IP-блок/риск | отлично | free | Только для не-РФ / Фаза 2 |

**Двухконтурная опция (Фаза 2):** РФ-хостинг как primary + западный (CF/Netlify) как зеркало для EN-аудитории, маршрутизация по гео/домену. На MVP не нужно — один РФ-контур.

---

## 3. Auth — самый крупный стратегический сдвиг (юр.риск)

**Закон:** 09.06.2026 Госдума приняла законопроект (№1069392-8) об **административной ответственности оператора** за нарушение правил идентификации. Редирект на `accounts.google.com`/`appleid.apple.com` при **создании нового аккаунта** через OAuth = нарушение; штраф до **700 000 ₽**. Целится в **сервис, не в пользователя**. Ещё не вступил (нужны Совфед + президент), но почти наверняка вступит. Сервисы для РФ обязаны давать российскую идентификацию: телефон РФ, Госуслуги (ЕСИА), ЕБС или иную российскую систему (Meduza, Lidings).

**Следствия для проекта:**
- Правило проекта **«провайдер = аккаунт»** (ADR, CLAUDE.md) остаётся, но **набор провайдеров для РФ надо переставить**:
  - **Yandex OAuth** — уже подключён (`convex/auth.ts`), РФ-нативный, доступный, совместимый. → **primary для РФ.**
  - **Телефонный OTP** — Convex Auth имеет **Phone-провайдер** (SMS OTP). Подключить российский SMS-шлюз. → закрывает требование «российская идентификация».
  - **Госуслуги/ЕСИА** — через **custom OIDC** (Convex Auth умеет любой OIDC-провайдер, отдающий ID-token + JWKS). → более тяжёлый, но «правильный» путь; кандидат в Roadmap.
  - **Google / GitHub** — вывести из РФ-контура: держать за флагом функции для Фазы 2 (EN-аудитория) или ограничивать по гео. Не удалять — они валидны вне РФ.
- Это **прямо противоречит §4-заметке** «GitHub — лучший основной провайдер». Для РФ-запуска — нет.

---

## 4. Бэкенд Convex — доступность и «полноценный сервер»

**Как устроен cloud:** durability на **AWS RDS**; стандарт — US-регионы, EU — `aws-eu-west-1` (проект тут). Enterprise — private-регион в свой AWS. Клиент ходит по WebSocket на `.convex.cloud`.

**Риск РФ:** прямого блока Convex нет, но (а) это AWS-endpoint с риском ограничения полосы/DPI, (б) realtime-WebSocket уязвим к ТСПУ, (в) US-компания под режимом санкций (публичные бесплатные веб-приложения разрешены, но комплаенс-политика Convex может измениться). **Это надо проверить эмпирически (см. §8) — от этого зависит, работает ли приложение в РФ вообще.**

**Решение и ось «переход на полноценный сервер»:** Convex **open-source и размещаемый**:
- Docker-контейнер (или бинарник), данные в SQLite **или Postgres**, размещается на любом провайдере — **в т.ч. РФ-VPS (Yandex Cloud/Selectel)**.
- **Тот же код** (queries/mutations в TS), CLI и панель — переезд це `PUBLIC_CONVEX_URL` на self-host, без переписывания бизнес-логики.
- Ограничение: образ **single-node** (не масштабируется автоматически); для MVP ≤100 юзеров — с большим запасом. Масштаб — потом, разделением сервисов.
- Это снимает **и** лок-ин (расширяемость), **и** РФ-доступность (РФ-инфра + РФ-домен), **и** санкционный риск за один шаг.

**Более радикальный «полноценный сервер»** (уход с Convex совсем, на custom Node + Postgres) — существует (гайды Encore «Migrate from Convex to AWS»), но это **дорого**: вся логика проекта завязана на модель Convex (реактивность, транзакции, компоненты aggregate/auth). Рекомендация — **не уходить с Convex, а размещать его самостоятельно**; полная миграция — только по сильному драйверу.

**Слой SvelteKit:** сейчас `adapter-static` (SPA). Если позже понадобится SSR/серверные роуты — встроенный переход на `adapter-node` (настоящий Node-сервер) дёшев. То есть «полноценный сервер» достижим на обоих слоях независимо.

---

## 5. Аналитика

| Вариант | Доступ из РФ | Приватность/бренд | Функции | Цена |
|---|---|---|---|---|
| **Yandex Metrica** | ✅ РФ-нативный | Yandex-данные, свои cookies (нужен баннер); бренд-fit слабее | heatmap, session replay, воронки — богато | free |
| **Plausible cloud** | 🟡 Bunny CDN (EU) — риск ограничения полосы скрипта | cookie-free, GDPR, «тихий» бренд-fit | скромнее (нет session replay) | ~$9/мес |
| **Plausible self-host** | ✅ если на РФ-инфра | то же + полный контроль данных | то же | хостинг |
| Umami/PostHog self-host | ✅ если на РФ-инфра | контроль | PostHog богат, но тяжёл | хостинг |

**Рекомендация:** для гарантии доступа и нулевой цены — **Yandex Metrica** (прагматично для РФ-аудитории; переживём cookie-баннер). Если приоритет — приватность и бренд «тихий/точный» (`PRODUCT.md`) — **self-host Plausible** на той же РФ-инфра, где бэкенд. Cloud-Plausible из §4 — под риском ограничения полосы CDN, брать только с проверкой (§8). Воронку до входа (план §5, слой B) любой из них закрывает.

---

## 6. Прочие звенья

- **Шрифты Geist/Geist Mono:** self-host (убрать `fonts.googleapis.com`/`gstatic.com` из `app.html`) — уже в плане (P0-4). Двойная выгода: приватность + снятие ограничения полосы gstatic. **Обязательно.**
- **Error-tracking:** Sentry cloud — риск ограничения полосы; **self-host GlitchTip** (Sentry-совместимый SDK `@sentry/svelte`, свой сервер) на РФ-инфра. Либо отложить в P1 (план допускает частичный anti-abuse/observability на закрытой бете).
- **Домен:** **.ru** через РФ-регистратора (reg.ru и т.п.) — доверие РФ-аудитории + доступность + под будущий комплаенс. .com допустим, но убедиться, что DNS/хостинг РФ-доступны. Юрлицо (ИП/самозанятость) — Фаза 3, для запуска ≤100 не обязательно, но .ru у физлица регистрируется.
- **CI/развёртывание:** если бэкенд self-hosted на РФ-VPS — CI может быть где угодно (GitHub Actions собирает и пушит артефакт), т.к. доступ при сборке ≠ доступ РФ-юзера при работе. Но если GitHub Actions станет ненадёжен — запасной РФ-CI (GitLab self-host / Yandex Cloud CI).

---

## 7. Рекомендуемый целевой стек (РФ-first) + поэтапность

**Контур РФ (MVP, день один):**
- Статика: Yandex Cloud Object Storage (SPA-fallback `index.html`).
- Бэкенд: self-host Convex (Docker) на Yandex Cloud / Selectel VPS, Postgres.
- Auth: Yandex OAuth + телефонный OTP (Convex Auth Phone + РФ-SMS-шлюз).
- Аналитика: Yandex Metrica (или self-host Plausible).
- Шрифты: self-host. Error: GlitchTip self-host (или P1).
- Домен: .ru.

**Контур «мир» (Фаза 2, EN-аудитория):** западное зеркало (CF/Netlify + Convex cloud + Google/GitHub OAuth + Plausible cloud) за флагом функции/гео-маршрутизацией. Архитектура уже это держит (провайдеры собираются в `buildProviders`, хостинг — статика).

**Почему не «просто оставить как в §4 и посмотреть»:** тогда с высокой вероятностью РФ-пользователь (а) не загрузит SPA (CF-ограничение полосы), (б) не подключится к бэкенду (AWS/WS-DPI), (в) не войдёт (Google/GitHub), а оператор попадёт под штраф за foreign-OAuth. Это не «риск», а наблюдаемое состояние сети РФ 2026.

---

## 8. Что проверить эмпирически (до фиксации решения)

> **РЕЗУЛЬТАТ (2026-07-07): пункт 1 ПОДТВЕРЖДЁН — бэкенд в РФ нежизнеспособен.**
> Дополнительно выяснено: бэкенд Convex `wandering-ocelot-9.eu-west-1.convex.cloud`/`.site`
> **сам проксирован через Cloudflare** (`cf-ray`, `AS13335`), а не «голый AWS». Тест из настоящей
> РФ-бытовой сети (МегаФон): бэкенд достижим (HTTP 200, cf-ray …-HEL), **но пропускная через CF
> убита — 24 КБ из 1024-МБ-теста, затем таймаут**; не-CF исходный уровень (ya.ru) жив. Эталон NL — ✅ 976 КБ.
> Скрипт-детектор: `scratchpad/convex-rf-check.sh`. **Вывод:** «дешёвое зеркало = общий бэкенд +
> РФ-фронт» мертва; РФ-контур обязательно = **self-host Convex вне Cloudflare** (отдельное развёртывание).

Мои источники — репутационные (HRW, The Record, Meduza, Cloudflare, Vercel Community, Convex docs), но конкретно по проекту нужна проверка **с РФ-точки** (РФ-VPN/РФ-пользователь):

1. ✅ **ПОДТВЕРЖДЕНО (см. врезку выше).** Грузится ли текущий бэкенд `wandering-ocelot-9…convex.cloud` из РФ без VPN — достижим, но замедляется до ~24 КБ → realtime нежизнеспособен.
2. Грузится ли тестовое развёртывание на Yandex Cloud Object Storage + работает ли SPA-fallback.
3. Проходит ли Yandex OAuth-поток из РФ (ожидаемо да).
4. Если склоняемся к Plausible cloud — грузится ли его скрипт (Bunny CDN) из РФ.
5. Зрелость self-host Convex под нашу нагрузку (компоненты `@convex-dev/auth`, `aggregate`, File Storage для ADR 0019 raw-capture — все ли работают в single-node образе).

---

## 9. Влияние на план MVP

- **§4 «Хостинг и архитектура»** — переписать: РФ-инфра primary, западное — Фаза 2. Cloudflare Pages из рекомендации убрать для РФ-контура.
- **§10.2 (хостинг), §10.3 (аналитика)** — решения меняются: не CF/Plausible-cloud, а Yandex Cloud / Yandex Metrica (или self-host).
- **Auth (§4-заметка, ADR)** — новый пункт P0: переставить провайдеров под закон (Yandex + телефон primary), новый ADR по auth-контуру РФ.
- **Новый P0** — self-host Convex как часть боевого развёртывания (заменяет «создать prod cloud deployment» в P0-2 для РФ-контура).
- Оформить **новый ADR** «Инфраструктура запуска: РФ-контур» с зафиксированным «почему» (эта среда 2026).

---

## Источники
- Cloudflare throttling в РФ: [Cloudflare blog](https://blog.cloudflare.com/russian-internet-users-are-unable-to-access-the-open-internet/), [The Record](https://therecord.media/cloudflare-russia-restricting-access-crackdown), [The Record — 16KB](https://therecord.media/russia-websites-dark-reported-cloudflare-block), [HRW](https://www.hrw.org/report/2025/07/30/disrupted-throttled-and-blocked/state-censorship-control-and-increasing-isolation)
- Vercel IP-блок в РФ: [Vercel Community](https://community.vercel.com/t/ip-i-was-provided-by-vercel-for-my-custom-domain-is-blocked-by-russia/32366), [next.js discussion](https://github.com/vercel/next.js/discussions/31528)
- GitHub деградация: [Meduza](https://meduza.io/en/news/2026/05/08/github-access-deteriorates-in-russia-as-internet-regulator-denies-blocking), [Interfax](https://interfax.com/newsroom/top-stories/117686/)
- Закон о foreign-OAuth: [Meduza](https://meduza.io/en/news/2026/06/09/three-years-after-banning-gmail-based-account-registration-russia-s-state-duma-finally-sets-fines-for-noncompliance), [Lidings](https://www.lidings.com/media/legalupdates/e_authorization/)
- Санкции на IT-услуги: [Arnold & Porter](https://www.arnoldporter.com/en/perspectives/advisories/2024/06/russias-access-to-it-services-and-software-restricted), [Full Steak Dev](https://fullsteak.dev/posts/sanctions-affect-developer/)
- Convex self-hosting: [Convex docs](https://docs.convex.dev/self-hosting), [get-convex/convex-backend](https://github.com/get-convex/convex-backend), [news.convex.dev](https://news.convex.dev/self-hosting/)
- Convex на AWS / EU: [news.convex.dev EU](https://news.convex.dev/we-finally-got-our-eu-visa/), [Encore migrate guide](https://encore.cloud/resources/migrate-convex-to-aws)
- Convex Auth Phone/OIDC: [Convex Auth Phone](https://labs.convex.dev/auth/api_reference/providers/Phone), [custom OIDC](https://docs.convex.dev/auth/advanced/custom-auth)
- Аналитика: [Plausible EU-hosted](https://plausible.io/eu-hosted-web-analytics), [Plausible vs Yandex Metrica](https://vibegrowthstack.io/compare/plausible-analytics-vs-yandex-metrica)
- РФ-хостинг: [Yandex Object Storage hosting](https://cloud.yandex.ru/docs/storage/concepts/hosting), [Хабр — переезд на Yandex Cloud](https://habr.com/ru/articles/1011050/)
