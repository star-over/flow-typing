# Спецификация — micro-survey «Помогает печатать не глядя?»

> Дата: 2026-07-13. Приоритет по плану запуска — **P1** (не препятствие MVP;
> `docs/plans/2026-07-05-mvp-launch.md` §6 канал 2, §9 go/no-go). Проектная сессия
> с владельцем 2026-07-13.

## Контекст и мотивация

MVP существует ради проверки гипотезы «визуализация движения помогает учиться печати
вслепую» (§0 плана). Поведенческие метрики (`sessionSummaries`) отвечают на «**что**
делает пользователь» — вернулся, растёт точность/cpm. Но гипотеза субъективна по
природе («чувствую руки / печатаю не глядя») и из cpm невыводима — её можно только
**спросить**. micro-survey даёт прямой количественный сигнал от первого лица, в
масштабе всей когорты (в отличие от глубинных интервью — их 5–10). Прямой вход в
критерий §9: «заметная доля сообщает „начал печатать не глядя" → гипотеза подтверждена».

Три канала обратной связи складываются: метрики (что) + micro-survey (воспринимаемый
механизм, количественно) + интервью (почему, глубоко). micro-survey закрывает средний.

## Принятые решения (сессия 2026-07-13)

- **Вопрос:** «Помогает печатать не глядя?» (RU) / «Helping you type without looking?»
  (EN, основная когорта — ADR 0021). Прямо про гипотезу, не про метрику.
- **Ответ — три кнопки:** Да / Немного / Нет (`yes | somewhat | no`). **Свободного
  текстового поля НЕТ** — сознательное решение (ценность/риск): живой голос уже ловят
  интервью (§6 канал 3) + feedback-ссылка (P0-7, канал 1); а произвольный ввод открывает
  обезвреживание вывода, спам, хранение чужих ПДн (растит privacy-поверхность P0-4) —
  непропорционально горстке фраз от когорты ≤100. Три фиксированных значения обезвреживать
  нечего. Путь возврата: поле дёшево до-строить после запуска, если кнопок мало.
- **Триггер:** после **3-й** завершённой тренировки (совпадает с retention-порогом §9
  «вернулся ≥3 раз» — к третьей сессии мнение сформировано).
- **Частота — один раз.** Ответил, пропустил или закрыл → больше не показываем.
- **Только авторизованные** — но тренировка требует входа (ADR 0012), значит это все
  тренирующиеся; гостевого случая нет.
- **Приватность:** ответы удаляются каскадом при удалении аккаунта (право на забвение,
  P0-4). Тон — по личности бренда (`PRODUCT.md`: спокойно, тихо, можно проигнорировать).
- **На двух языках** (ADR 0022): все строки — в словаре, секция `survey`.

## Данные (Convex)

Новая таблица `surveyResponses` (паттерн `clientErrors`/`sessionSummaries`):

```
surveyResponses: defineTable({
  userId: v.id('users'),
  // 'dismissed' = закрыл/пропустил не ответив (тоже строка). «Показан» выводим из
  // НАЛИЧИЯ строки, отдельного флага нет; заодно dismissed — сигнал интереса.
  answer: v.union(
    v.literal('yes'), v.literal('somewhat'), v.literal('no'), v.literal('dismissed'),
  ),
  capturedAt: v.number(), // server-stamped
}).index('by_user', ['userId'])   // by_user — «показан?» + каскад удаления
```

Мутация `surveys.record` (auth-required, вынесенный handler — паттерн
`recordSessionSummaryHandler`): `getAuthUserId` → throw при `null` → per-user rate-limit
(`rateLimiter`, новый ключ `surveyRecord`) → insert со server-stamped `capturedAt`. Enum
закрыт `v.union` на уровне args — фабрикация значения невозможна, отдельной проверки
не нужно.

Query `surveys.hasResponded` (auth-required, `false` для гостя): есть ли у юзера хоть одна
строка `surveyResponses` (`by_user`, `.first() !== null`). Это источник «показан».

Каскад: добавить `surveyResponses` в `deleteMyAccount` (`convex/account.ts`), стирать
`by_user`-строки удаляемого юзера.

Читателя-сводки (сколько yes/somewhat/no) на MVP **не** делаем: смотрим напрямую в Convex
dashboard (как `clientErrors`, P0-7). Query-панель — P1 по драйверу.

## Триггер показа — чистая логика

«Опрос показан» **не** храним отдельным флагом (и не в `UserSettings` — там живут
настройки, что юзер меняет на `/settings`, а не внутреннее состояние). Источник — сам факт
наличия строки `surveyResponses`: при ЛЮБОМ закрытии (ответ ИЛИ крестик/пропуск) пишем
строку (`yes|somewhat|no` либо `dismissed`), и `surveys.hasResponded` становится `true`.
Cross-device работает даром — строка на сервере одна на юзера.

Число тренировок = длина `sessions.listMine` (на MVP-объёмах дёшево; count-query — позже).
Считается на экране `sessionComplete` уже **после** записи текущей сводки (`sessions.record`
идёт до `sessionComplete`), поэтому только что завершённая тренировка учтена: на 3-й
сессии `sessionCount === 3`.

Чистая функция `shouldShowMicroSurvey({ sessionCount, hasResponded })`:
`sessionCount >= 3 && !hasResponded`. Живёт в `src/lib`, юнит-тест без заглушек
(dumb UI логики не содержит — ADR 0013).

## UI-компонент (trio, docs/06 §6.7)

`SurveyPrompt.svelte` + `SurveyPrompt.contract.ts` + `SurveyPrompt.stories.svelte`.
Два внутренних состояния: (1) вопрос + три кнопки; (2) «Спасибо!» → авто-исчезает.
Никакого текстового поля. Компонент dumb: принимает `dictionary` + обратный вызов на ответ,
логику «показывать ли» решает родитель.

**Точка показа:** ветка `sessionComplete` в `MainContent.svelte` (после
`LessonStatsDisplay`/`RepertoireProgress`), под условием `shouldShowMicroSurvey`
(`sessionCount` из `sessions.listMine`, `hasResponded` из `surveys.hasResponded`).
На ответ ИЛИ крестик/пропуск → `surveys.record({ answer })` (`dismissed` при закрытии;
fire-and-forget, at-most-once — как sessionSummary, ADR 0015). Реактивная
`hasResponded` тут же становится `true` → повторно не покажется.

## i18n (ADR 0022)

Секция `survey` в `dictionaries/{en,ru}.json`: `question`, `answer_yes`,
`answer_somewhat`, `answer_no`, `thanks`. Ноль литералов в разметке.

## Темы

Контракт-токены `SurveyPrompt.contract.ts` → влить в `THEME_CONTRACT`
(`src/themes/contract.ts`) → объявить во всех 5 темах (`light/dark/sepia/nord/_template`).
contract-test обязан пройти.

## Вне scope / отложено

- **Свободный текстовый ответ** — отклонён (ценность/риск, см. выше); путь возврата открыт.
- **Повтор-опрос во времени** («растёт ли ощущение от сессии к сессии») — P2, нужен
  интервальный триггер вместо разового.
- **Query-панель сводки в UI** — P1; на MVP читаем в Convex dashboard.

## Проверка

- Юнит-тест `shouldShowMicroSurvey` (пороги, dismiss).
- convex-test `surveys.record` (гость → throw, юзер → insert, rate-limit) + каскад
  `deleteMyAccount` (0 сирот).
- Storybook два состояния `SurveyPrompt`.
- `make check-all` зелёный (contract-test включён).

## Затрагиваемые файлы

- `convex/schema.ts` — таблица `surveyResponses`.
- `convex/surveys.ts` (новый) — `record` + вынесенный handler + `hasResponded` query (валидация — enum `v.union` в args, отдельного validation.ts не нужно).
- `convex/rateLimiter.ts` — ключ `surveyRecord`.
- `convex/account.ts` — каскад `surveyResponses` в `deleteMyAccount` (+ тест 0 сирот).
- `src/lib/micro-survey.ts` (новый) — `shouldShowMicroSurvey` + тест.
- `src/components/train/SurveyPrompt.{svelte,contract.ts,stories.svelte}` (новые).
- `src/components/app/MainContent.svelte` — точка показа + вызов `surveys.record`.
- `dictionaries/{en,ru}.json` — секция `survey`.
- `src/themes/contract.ts` + 5 тем (`light/dark/sepia/nord/_template`) — токены.

Настроек/sync касаться **не нужно** — «показан» выводится из наличия строки
`surveyResponses`, отдельного флага в `UserSettings` нет.
