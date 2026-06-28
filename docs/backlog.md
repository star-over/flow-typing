# Backlog

Идеи и фазы, которые не делаем в текущем цикле — но имеет смысл вернуться, когда появится driver (запрос пользователя, бизнес-need, технический препятствие ушёл, и т.д.). Для каждой записи — почему отложено и что нужно для возобновления.

Не план и не roadmap: порядок здесь не обязательство. При выборе следующей работы — смотреть драйверы, а не индекс в списке.

---

## Auth — оставшиеся фазы umbrella plan

Контекст: `docs/plans/auth.md`. После Phase 8 (Yandex, merge `4d4cb58`) активная разработка OAuth остановлена. Phase 2–5 + 8 покрывают всё, что нужно для рабочего auth-flow с тремя провайдерами и cross-device settings sync.

### Phase 6 — Sessions tracking

**Что:** Каждая завершённая тренировочная сессия (WPM, accuracy, errorCount) сохраняется в Convex для залогиненных юзеров. Pure-агрегатор attempts → SessionSummary, mutation `record`, query `listMine`.

**Почему отложено:** Нет UI-потребителя. Без `/stats` (Phase 7) пользователь не видит этих данных, и backend-only telemetry без точки потребления — мёртвый груз в схеме.

**Driver для возобновления:** Запрос на `/stats` (визуализация прогресса) — Phase 6 становится предусловием Phase 7.

**Существующий план:** `docs/plans/auth.md` секция «Phase 6 — Sessions tracking» (scope + file changes + тест-стратегия + done criteria + merge). Готов к detailed planning через `writing-plans`.

**Размер:** одна фаза в шаблоне Phase 4/5/8 (1 день + verification).

---

### Phase 7 — `/stats` с реальными данными

**Что:** Страница `/stats` перестаёт быть placeholder'ом. Залогинен — виджеты (всего сессий, средний WPM, accuracy, последние 10); гость — CTA «войди»; пусто — empty-state.

**Почему отложено:** Зависит от Phase 6 (sessions table). Без real data на бэкенде показывать нечего.

**Driver:** То же что Phase 6 (запрос на визуализацию прогресса).

**Существующий план:** `docs/plans/auth.md` секция «Phase 7 — `/stats` с реальными данными».

**Размер:** одна фаза + 1-2 новых компонента + темизация.

---

### Phase 9 — Apple provider

**Что:** Sign in with Apple через `@auth/core/providers/apple`. Profile нормализуется в стандартный `{ id, name, email, image }` shape, поэтому `createOrUpdateUserHandler` (см. Phase 2/4/8) подойдёт без правок.

**Почему отложено:** Технические предпосылки вне нашего контроля:
- Apple Developer Program — **$99/год**, требует Apple ID.
- **Domain verification** — Apple требует `apple-developer-domain-association.txt` на верифицированном домене. Два варианта:
  - (a) production cloud Convex deployment + собственный production-домен с DNS-контролем (classical path);
  - (b) попытка верифицировать сам `*.convex.site` через Convex HTTP routes — не подтверждено, нужна отдельная research-задача перед коммитом к Phase 9.

**Driver:** Бизнес-need в iOS-аудитории ИЛИ user request ИЛИ кто-то закрывает Apple-domain-verification research как Phase 9.0.

**Шаблон:** Phase 8 (Yandex) — после `OAuthProviderId` extract'нут в shared module, добавление 4-го провайдера сводится к:
- расширить union `'github' | 'google' | 'yandex' | 'apple'` в `src/lib/auth/auth.types.ts` (одна строка);
- `import Apple from '@auth/core/providers/apple'` + добавить в `providers` array;
- кнопка + 4 theme tokens × 5 файлов.

Final reviewer Phase 8 отметил, что 4 идентичных CSS-блока в SignInScreen — natural checkpoint решать про `--sign-in-screen-btn-base-*` extract. На 4-м провайдере это становится разумнее.

**Размер:** ~Phase 8 (1 день) + Apple Developer enrollment overhead.

---

### Phase 10 — Account linking V2

**Что:** UI в `/settings` + mutation для добровольного слияния двух `users`-строк одного человека (e.g. «у меня GitHub-аккаунт и Google-аккаунт с одним email — хочу объединить»). Миграция связанных `userSettings` / `sessions`. Conflict resolution (что делать при конфликте email / settings / sessions между двумя записями).

**Почему отложено:** Текущий инвариант «провайдер = аккаунт» (явно НЕ link-by-email) защищается на handler-уровне (`convex/auth.test.ts:44-61`) и принят пользователем как by-design. Account linking — противоположная семантика; не делать без явного запроса пользователей, иначе ломаем безопасность ради функции, которую никто не просил.

**Driver:** Поступление >1 запроса от пользователей «у меня два аккаунта, можно их объединить?». До этого — не трогать.

**Размер:** большая фаза (несколько подзадач: merge mutation, settings/sessions migration, UI, edge cases). Не минимальная.

---

### Phase 11 — SberID

**Что:** Custom OAuth-провайдер для `@auth/core` (не встроенный — пишется руками; SberID отсутствует в стандартном каталоге providers).

**Почему отложено:** Юридические/орг предпосылки вне технического контроля:
- ИП или ООО (для регистрации в Сбер Developer Portal);
- Подписание договора;
- Возможно — клиентские TLS-сертификаты.

**Driver:** Подтверждённая бизнес-потребность (российская аудитория, договор с банком, и т.д.). До этого — не трогать.

**Размер:** существенно больше Phase 8 (custom provider + TLS-overhead + орг-задачи).

---

### Phase 12 — Telegram

**Что:** Sign-in через Telegram Login Widget. Технически **не OAuth 2.0**: собственный HMAC-flow Telegram'а (виджет → query-параметры `{id, first_name, last_name, username, photo_url, auth_date, hash}` → HMAC-SHA256-проверка через bot token как secret). Стандартного провайдера в `@auth/core/providers/*` нет (проверено через ctx7 на 2026-06-11).

**Почему отложено:**
- Нет user request'а и подтверждённой бизнес-потребности.
- Технически — не «ещё один OAuth-провайдер»: flow не ложится на абстракцию `@auth/core` (нет `client_id`/`client_secret`/`authorization_code`).
- Требует schema-правки: Telegram **не отдаёт email**, поэтому `users.email` должен стать `v.optional(v.string())` и `createOrUpdateUserHandler` должен корректно обрабатывать email-less аккаунты. Это первый провайдер, который ломает инвариант «email всегда есть».
- Bot token — отдельный класс секрета (не client secret OAuth-приложения, а identity самого бота). Хранение строго через `npx convex env set AUTH_TELEGRAM_BOT_TOKEN` — никогда в client-bundle.

**Driver:** Бизнес-need в Telegram-аудитории (потенциально большая в РФ/СНГ) ИЛИ user request.

**Не шаблон Phase 4/8.** Один из трёх возможных подходов (выбрать в момент планирования):
1. **`Credentials`-провайдер `@auth/core`** — `authorize(credentials)` принимает Telegram payload, делает HMAC-проверку, возвращает `{ id, name, image, email: null }`. Самый лёгкий путь, но `Credentials` в Auth.js считается «advanced» и плохо комбинируется с другими session-стратегиями.
2. **Custom OAuth-провайдер для `@auth/core`** — насилуем Telegram-flow в OAuth-абстракцию. Избыточно и плохо читается.
3. **Convex HTTP-route напрямую** — endpoint в `convex/http.ts` принимает Telegram callback, проверяет HMAC, вручную создаёт сессию через internal API Convex Auth. Самый низкоуровневый, но честный — flow не насилуется.

UI: вместо нашей кнопки `<button>Войти через ...</button>` рендерится `<script src="https://telegram.org/js/telegram-widget.js">` с data-атрибутами bot username и redirect URL. Это отдельный UX-кейс (внешний скрипт от Telegram, не наша вёрстка) — не вписывается в текущий `SignInScreen.svelte` без рефакторинга.

Готовых community-пакетов уровня `@convex-dev/auth-telegram` на 2026-06-11 не найдено (WebSearch не показал релевантных).

**Размер:** существенно больше Phase 4/Phase 8. Сопоставим с Phase 11 (SberID) по сложности custom-интеграции, плюс уникальные осложнения (schema-правка для nullable email, внешний `<script>` в UI). Перед стартом — отдельная research-задача Phase 12.0 на выбор подхода (1/2/3 выше) + проверка, появился ли community-пакет за прошедшее время.

---

## Тех-долг и архитектурные открытые вопросы

Источник большинства пунктов — секция «Что дальше (не в scope этого PR)» в `docs/superpowers/plans/2026-06-09-screen-routing-and-menu-refactor.md`. Каждый пункт пережил merge, ни один не получил отдельной фазы — лежат тут до появления драйвера.

### `MenuScreen.contract.ts` — выделить токены, когда компонент стабилизируется

**Что:** Сейчас `src/components/train/MenuScreen.svelte` намеренно без contract-файла: переиспользует токены `SettingsPage` и `FooterActions`. Когда компонент станет самостоятельной сущностью — выделить `--menu-screen-*` токены, завести `MenuScreen.contract.ts`, добавить в `THEME_CONTRACT` и пройти по всем 4 темам + `_template.css`.

**Почему отложено:** Компонент тонкий, токены чужих компонентов покрывают визуальные потребности без расхождений. Преждевременный extract = пять контракт-токенов без визуальной семантики. Tech-debt note зафиксирована inline в `MenuScreen.svelte:1-7`.

**Driver:** Появление собственного визуального языка у `MenuScreen` (например, отдельный фон, рамка, hover-логика, которой нет у `SettingsPage`) или рост числа потребителей токенов из `SettingsPage` через `MenuScreen` до точки, где coupling начинает мешать.

**Размер:** маленький (1 contract-файл + 5 CSS-файлов + 1 импорт в `contract.ts`).

---

### `docs/06` — раздел про tech-debt-исключения для контракт-системы

**Что:** В `docs/06-component-contracts-and-themes.md` нет раздела про допустимые исключения из правила «каждый компонент с темизируемыми элементами имеет рядом `*.contract.ts`». Текущее единственное исключение — `MenuScreen` — задокументировано inline в самом компоненте. По мере появления похожих случаев документ устаревает.

**Почему отложено:** Одно исключение — не паттерн. Раздел писать преждевременно: ничем не подкрепится, кроме того же `MenuScreen`.

**Driver:** Появление второго осознанного tech-debt-исключения. Тогда — обобщить в `docs/06`, дать критерии «когда можно без контракта», ссылки на оба компонента.

**Размер:** маленький (один раздел в существующем доке).

---

### Session vs drill — ✅ реализовано (2026-06-17)

**Реализовано** как `sessionMachine` — отдельный слой между `appMachine` и `trainingMachine` (**ADR 0007**, план `docs/plans/2026-06-17-session-machine.md`). Печатаемое — непрерывный `TypingStream` (drill'ы склеены через пробел, границы невидимы); завершение решает **таймер сессии** (фаза `draining` допечатывает очередь, страховочный кап не даёт зависнуть), а не длина потока; `lessonComplete` снят. `trainingMachine` стал чистым классификатором-внуком и шлёт `TYPING.ADVANCED` вверх. Сводка — на чекпоинтах (перед дозагрузкой и в конце сессии), запись профиля через `drillRecord`; mid-session дозагрузка через `drillNext`.

Прежняя формулировка (Update 2026-06-12) «завершение — на границе текущего drill'а» **отменена**: границ drill'а в потоке нет, конец — по таймеру + `draining`. Агрегат уровня сессии для Phase 6 (`/stats`) теперь имеет рамку (таймерная сессия), но сам consumer Phase 6/7 — по-прежнему отдельная работа.

---

### Прореживание неиспользуемых i18n-ключей

**Что:** В `dictionaries/{en,ru}.json` есть ключи, которые grep по `src` не находит:
- `app.loading`, `app.error_title` — оставались с MVP-1 эпохи (loading screen, error boundary), сейчас не подключены.
- `settings.*_description`, `settings.*_placeholder` — описания и заполнители полей, но UI рендерит только `*_label` (см. `SettingsPage.svelte`, `MenuScreen.svelte`).

**Почему отложено:** Не баг и не utilization: ничего не ломает, переводы аккуратные. Удаление ключей до окончательной кристаллизации UI = риск удалить то, что вот-вот понадобится при добавлении описаний/заполнителей.

**Driver:** Финализация UX `/settings` (решение «описаний не будет» или «описания будут, но иначе»). До этого момента — оставить.

**Размер:** маленький (правки в 2 JSON-файлах + проверка `make spell`/`make check-all`).

---

### Keyboard events на `/settings` и `/stats` — фильтр по pathname

**Что:** `src/routes/+layout.svelte` навешивает глобальный keyboard listener (`<svelte:window onkeydown/up/blur>`), который шлёт `KEY_DOWN`/`KEY_UP`/`PAUSE` в `appActor` независимо от текущего роута. На `/settings` и `/stats` FSM сидит в `menu`-состоянии, эти события безвредны (keyboardMachine их корректно отбрасывает). Если когда-то понадобится — например, для горячих клавиш на `/settings`, которые не должны просачиваться в `training` — добавить фильтр по `$page.url.pathname` в layout-listener.

**Почему отложено:** Нечего фильтровать. Нет горячих клавиш, конфликтующих с FSM. Защита на уровне `keyboardMachine.isTextKeyGuard` уже работает.

**Driver:** Появление любого keyboard-handling требования специфичного для `/settings` или `/stats` (например, «Esc возвращает на главную»).

**Размер:** маленький (3-5 строк в `+layout.svelte`).

---

### Удаление мёртвой `health`-таблицы из Convex

**Что:** В `convex/schema.ts:7-9` всё ещё живёт `defineTable('health', { tickedAt: v.number() })`. Это диагностика Phase 1 (`ping`/`tick` из `convex/health.ts`), снятая в Phase 3 вместе с `/dev`-страницей. Сами `query`/`mutation` уже удалены — таблица без потребителей, плюс 3 старые тестовые row'а из июня. Подтверждено через `npx convex data health`.

**Почему отложено:** Не препятствие: пустая таблица в schema ничего не ломает, place в free-tier'е не съедает. Cleanup отложил себя сам, потому что в Phase 3 убрали только UI-side и функции, до schema не дошли.

**Driver:** Любой следующий заход в `convex/schema.ts` (например, Phase 6 sessions — там всё равно править schema). Сделать одной правкой: добавить `internalMutation` `cleanupHealthTable` → выполнить → `git rm` логику → убрать `health` из `defineSchema`. Порядок важен: Convex не даст удалить `defineTable`, пока в таблице есть документы.

**Размер:** микро (~15-30 минут, ноль рисков).

---

### Параметры адаптивности в `/settings`

**Что:** `docs/04-settings-management-system.md` §4.1.4 и §4.3 явно резервируют место в `/settings` под «параметры адаптивности (стратегия выбора, длительность сессии и т.п.)» и «профиль пользователя». Сейчас `/settings` содержит только `interfaceLanguage` и `theme`; адаптивные параметры физически некуда положить.

**Почему отложено:** Адаптивная система (`docs/05`) ещё не реализована. Элементы управления без backing-логики были бы плацебо.

**Driver:** Начало работ над «Dynamic Flow» (адаптивная подача drill'ов). UI-параметры подключаются вместе с движком, не раньше.

**Первый кандидат** (зафиксирован на сессии проектирования адаптивной выдачи, 2026-06-12): предпочтение длины слов — «короче / нейтрально / длиннее» как *смещение* поверх термостата, не сырое значение (ручной выбор не должен воевать с адаптивным движком). Обоснование «длина слова = длина моторной программы между пробелами-вдохами» — см. CONTEXT.md (DrillRequest).

**Размер:** зависит от scope адаптивной системы. Чисто UI — маленький; вместе с движком — отдельный umbrella-план уровня auth.

---

## Также см.

- `docs/known-issues.md` — отложенные **проблемы** (не идеи). На сегодня там #1 «`defaultDrillTexts` не учитывает выбранную раскладку» — закроется вместе с подключением drills из БД (того же driver'а, что и адаптивная система).
- `docs/05-adaptive-learning-system.md` — спецификация-видение «Dynamic Flow». Не план реализации, не имеет milestones — описывает целевую архитектуру, к которой driver'ом является решение начать работу над адаптивной подачей drill'ов.
