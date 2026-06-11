# Backlog

Идеи и фазы, которые не делаем в текущем цикле — но имеет смысл вернуться, когда появится driver (запрос пользователя, бизнес-need, технический блокер ушёл, и т.д.). Для каждой записи — почему отложено и что нужно для возобновления.

Не план и не roadmap: порядок здесь не обязательство. При выборе следующей работы — смотреть драйверы, а не индекс в списке.

---

## Auth — оставшиеся фазы umbrella plan

Контекст: `docs/plans/auth.md`. После Phase 8 (Yandex, merge `4d4cb58`) активная разработка OAuth остановлена. Phase 2–5 + 8 покрывают всё, что нужно для рабочего auth-flow с тремя провайдерами и cross-device settings sync.

### Phase 6 — Sessions tracking

**Что:** Каждая завершённая тренировочная сессия (WPM, accuracy, errorCount) сохраняется в Convex для залогиненых юзеров. Pure-агрегатор attempts → SessionSummary, mutation `record`, query `listMine`.

**Почему отложено:** Нет UI-потребителя. Без `/stats` (Phase 7) пользователь не видит этих данных, и backend-only telemetry без точки потребления — мёртвый груз в схеме.

**Driver для возобновления:** Запрос на `/stats` (визуализация прогресса) — Phase 6 становится предусловием Phase 7.

**Существующий план:** `docs/plans/auth.md` секция «Phase 6 — Sessions tracking» (scope + file changes + тест-стратегия + done criteria + merge). Готов к detailed planning через `writing-plans`.

**Размер:** одна фаза в шаблоне Phase 4/5/8 (1 день + verification).

---

### Phase 7 — `/stats` с реальными данными

**Что:** Страница `/stats` перестаёт быть placeholder'ом. Залогинен — виджеты (всего сессий, средний WPM, accuracy, последние 10); гость — CTA «войди»; пусто — empty-state.

**Почему отложено:** Зависит от Phase 6 (sessions table). Без real data на бекенде показывать нечего.

**Driver:** То же что Phase 6 (запрос на визуализацию прогресса).

**Существующий план:** `docs/plans/auth.md` секция «Phase 7 — `/stats` с реальными данными».

**Размер:** одна фаза + 1-2 новых компонента + темизация.

---

### Phase 9 — Apple provider

**Что:** Sign in with Apple через `@auth/core/providers/apple`. Profile нормализуется в стандартный `{ id, name, email, image }` shape, поэтому `createOrUpdateUserHandler` (см. Phase 2/4/8) подойдёт без правок.

**Почему отложено:** Технические пререкизиты вне нашего контроля:
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

**Почему отложено:** Текущий инвариант «провайдер = аккаунт» (явно НЕ link-by-email) защищается на handler-уровне (`convex/auth.test.ts:44-61`) и принят пользователем как by-design. Account linking — противоположная семантика; не делать без явного запроса пользователей, иначе ломаем безопасность ради фичи, которую никто не просил.

**Driver:** Поступление >1 запроса от пользователей «у меня два аккаунта, можно их объединить?». До этого — не трогать.

**Размер:** большая фаза (несколько подзадач: merge mutation, settings/sessions migration, UI, edge cases). Не минимальная.

---

### Phase 11 — SberID

**Что:** Custom OAuth-провайдер для `@auth/core` (не встроенный — пишется руками; SberID отсутствует в стандартном каталоге providers).

**Почему отложено:** Юридические/орг пререкизиты вне технического контроля:
- ИП или ООО (для регистрации в Сбер Developer Portal);
- Подписание договора;
- Возможно — клиентские TLS-сертификаты.

**Driver:** Подтверждённая бизнес-потребность (российская аудитория, договор с банком, и т.д.). До этого — не трогать.

**Размер:** существенно больше Phase 8 (custom provider + TLS-overhead + орг-задачи).
