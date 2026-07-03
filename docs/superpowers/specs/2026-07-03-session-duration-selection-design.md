# Выбор длительности таймерной сессии

**Дата:** 2026-07-03
**Статус:** Согласован (дизайн), готов к плану реализации
**Коммит контекста:** `34c1425c7ba5f4cbf58910b4616e70c388da4dff`

## 1. Контекст и проблематика

### 1.1. Текущее состояние

В проекте длительность таймерной сессии задана жёстко:

- `src/lib/session-config.ts:7` — `SESSION_DURATION_SECONDS = 60`.
- `src/machines/session.machine.ts` использует эту константу для:
  - вычисления окна таймера (`SESSION_WINDOW_MS`);
  - расчёта начального бюджета порции (`computeBudgetChars({ secondsRemaining: SESSION_DURATION_SECONDS, ... })`);
  - логики истечения (`isExpired`).
- `src/routes/+layout.svelte:112-115` считает остаток секунд таймера, вычитая `displayElapsedMs / 1000` из `SESSION_DURATION_SECONDS`.

Таким образом, пользователь не может выбрать, сколько минут длится тренировка.

### 1.2. Цель инкремента

Дать пользователю выбор длительности сессии из фиксированного набора: **1, 3, 5, 10, 15 минут**. Значение должно сохраняться в пользовательских настройках с cross-device sync через Convex.

### 1.3. Вне области

- Произвольная длительность (free-form input) — только предустановленные значения.
- Изменение длительности во время активной сессии.
- Разная длительность для разных режимов / раскладок.
- Влияние длительности на прогрессию / репертуар (пока не связываем).
- Статистика по «запланированной длительности» — экран результатов уже показывает фактическую.

## 2. Принятые решения по ключевым развилкам

### 2.1. Где выбирать длительность

**Решение:** в главном меню (`MenuScreen`) перед стартом тренировки.

**Отвергнуто:**
- Только в Settings — менее удобно: пользователь приходит в меню чтобы начать, и именно там хочет выбрать «на сколько».
- И в меню, и в Settings — избыточно для текущего масштаба; достаточно одной точки.

### 2.2. Вид контрола

**Решение:** горизонтальная плашка с кнопками из 5 вариантов: «1 min», «3 min», «5 min», «10 min», «15 min».

**Отвергнуто:**
- Обычный `<Select>` в списке настроек — для быстрого частого выбора (один клик вместо двух) и визуального обзора всех вариантов плашка с кнопками удобнее.
- Radio / toggle — не даёт такого же компактного и привычного вида.

### 2.3. Где хранить значение

**Решение:** в `UserSettings` с cloud sync через Convex.

**Отвергнуто:**
- Device-local (`localStorage`) — проще, но ломает единый опыт между устройствами; проект уже вкладывает существенные усилия в cross-device sync.
- Отдельная таблица сессий — избыточно, это пользовательская настройка, а не аналитика.

### 2.4. Дефолтное значение

**Решение:** `300` секунд (5 минут).

**Отвергнуто:**
- 1 минута — слишком коротко для большинства пользователей.
- 3 минуты — приемлемо, но 5 минут — более традиционный «один заход» в тренажёрах.
- Запоминание последнего выбора без дефолта — нужен fallback для нового пользователя / пустого cloud row.

### 2.5. Поведение при недопустимом значении

**Решение:** сбрасывать в дефолт (`300`).

Нормализация в `src/lib/settings.ts` проверяет, что значение:
- является числом;
- находится в диапазоне `[60, 900]`;
- входит в множество `{60, 180, 300, 600, 900}`.

Если любое из условий не выполняется — `300`.

**Отвергнуто:** зажимать к ближайшему допустимому — может ввести в заблуждение (например, `120` → `60` или `180` неочевидно).

### 2.6. Как длительность попадает в сессию

**Решение:** через событие `START_TRAINING` → `appMachine` → `sessionMachine.input`.

- `MenuScreen.onStart` передаёт `{ symbolLayoutId, durationSeconds }`.
- `AppEvent.START_TRAINING` получает поле `durationSeconds`.
- `appMachine` пробрасывает его в `sessionService` через `input`.
- `sessionMachine` хранит `durationSeconds` в `SessionContext` и использует для окна и бюджета.

**Отвергнуто:**
- Читать `durationSeconds` из `UserSettings` прямо в `sessionMachine` — машина должна оставаться чистой и не зависеть от стора / Convex.
- Глобальная mutable-константа — нарушает изоляцию и тестируемость.

### 2.7. Метки в UI

**Решение:** «1 min», «3 min», «5 min», «10 min», «15 min».

**Отвергнуто:**
- Полные слова с plural-формами — требует i18n-plural логики для en/ru; избыточно для 5 кнопок.
- Сокращения «m» — неоднозначно (может читаться как meter / male).

## 3. Доменная модель

```
┌─────────────────────────────────────────────┐
│  UserSettings                               │
│  ...                                        │
│  sessionDurationSeconds: number             │
│  (60 | 180 | 300 | 600 | 900)              │
└─────────────────────────────────────────────┘
              │
              │ cloud sync через Convex
              ▼
┌─────────────────────────────────────────────┐
│  convex/userSettings.sessionDurationSeconds │
│  (optional для back-compat)                 │
└─────────────────────────────────────────────┘
              │
              │ START_TRAINING { durationSeconds }
              ▼
┌─────────────────────────────────────────────┐
│  appMachine.context / sessionMachine.input  │
│  durationSeconds: number                    │
└─────────────────────────────────────────────┘
              │
              │
              ▼
┌─────────────────────────────────────────────┐
│  SessionContext                             │
│  durationSeconds: number                    │
│  SESSION_WINDOW_MS = durationSeconds * 1000 │
└─────────────────────────────────────────────┘
```

## 4. Изменения в типах и данных

### 4.1. `UserSettings`

```ts
// src/interfaces/user-settings.ts

export interface UserSettings {
  interfaceLanguage: InterfaceLanguage;
  textLanguage: TextLanguage;
  symbolLayoutId: SymbolLayoutId;
  fingerLayoutId: FingerLayoutId;
  cursorType: FlowLineCursorType;
  theme: ThemeSetting;
  displayName: string;
  rhythmChannelEnabled: boolean;
  /** Длительность таймерной сессии в секундах. */
  sessionDurationSeconds: number;
}
```

### 4.2. Дефолт

```ts
// src/user-settings/user-settings.ts

export const DEFAULT_USER_SETTINGS: UserSettings = {
  // ... existing fields
  rhythmChannelEnabled: false,
  sessionDurationSeconds: 300,
};
```

### 4.3. Нормализация

```ts
// src/lib/settings.ts

const SESSION_DURATION_OPTIONS = [60, 180, 300, 600, 900] as const;

function isSessionDurationSeconds(v: unknown): v is number {
  return typeof v === 'number'
    && v >= 60
    && v <= 900
    && SESSION_DURATION_OPTIONS.includes(v);
}

// В normalizeSettings:
const sessionDurationSeconds = isSessionDurationSeconds(stored.sessionDurationSeconds)
  ? stored.sessionDurationSeconds
  : DEFAULT_USER_SETTINGS.sessionDurationSeconds;
```

### 4.4. Cloud sync

```ts
// src/lib/settings-sync.ts

export interface CloudSettings {
  // ... existing fields
  sessionDurationSeconds?: number;
}

export function cloudRowToSettings(cloud: CloudSettings): UserSettings {
  return {
    // ... existing fields
    sessionDurationSeconds: cloud.sessionDurationSeconds,
  } as UserSettings;
}

export function settingsToCloudArgs(settings: UserSettings): {
  // ... existing fields
  sessionDurationSeconds: number;
} {
  return {
    // ... existing fields
    sessionDurationSeconds: settings.sessionDurationSeconds,
  };
}
```

### 4.5. Convex schema

```ts
// convex/schema.ts

userSettings: defineTable({
  // ... existing fields
  rhythmChannelEnabled: v.optional(v.boolean()),
  sessionDurationSeconds: v.optional(v.number()),
  updatedAt: v.number(),
}).index('by_user', ['userId']),
```

### 4.6. Convex mutation

```ts
// convex/userSettings.ts

export async function upsertMineHandler({
  // ...
  settings: {
    // ... existing fields
    rhythmChannelEnabled: boolean;
    sessionDurationSeconds: number;
  };
}) {
  // ... insert/patch with sessionDurationSeconds
}

export const upsertMine = mutation({
  args: {
    // ... existing fields
    rhythmChannelEnabled: v.boolean(),
    sessionDurationSeconds: v.number(),
  },
  // ...
});
```

## 5. Изменения в коде времени выполнения

### 5.1. `SessionDurationSelector` компонент

Новый файл `src/components/train/SessionDurationSelector.svelte`:

```svelte
<script lang="ts">
  interface Props {
    value: number;
    options: { seconds: number; label: string }[];
    onChange: (seconds: number) => void;
  }

  const { value, options, onChange }: Props = $props();
</script>

<div class="duration-selector">
  <span class="label">Session duration</span>
  <div class="segments" role="radiogroup">
    {#each options as option}
      <button
        type="button"
        role="radio"
        aria-checked={value === option.seconds}
        class:selected={value === option.seconds}
        onclick={() => onChange(option.seconds)}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>
```

Стили — в том же файле, reuse токенов темы (`--select-background`, `--landing-cta-*` для selected-state).

### 5.2. `MenuScreen`

```svelte
<!-- src/components/train/MenuScreen.svelte -->

<script lang="ts">
  import SessionDurationSelector from './SessionDurationSelector.svelte';
  // ...

  const sessionDurationOptions = $derived([
    { seconds: 60, label: dictionary.options.sessionDurations['60'] },
    { seconds: 180, label: dictionary.options.sessionDurations['180'] },
    { seconds: 300, label: dictionary.options.sessionDurations['300'] },
    { seconds: 600, label: dictionary.options.sessionDurations['600'] },
    { seconds: 900, label: dictionary.options.sessionDurations['900'] },
  ]);
</script>

<!-- после setup-list -->
<SessionDurationSelector
  value={$settings.sessionDurationSeconds}
  options={sessionDurationOptions}
  onChange={(v) => updateSettings({ sessionDurationSeconds: v })}
/>

<button
  onclick={() => onStart({ symbolLayoutId: $settings.symbolLayoutId, durationSeconds: $settings.sessionDurationSeconds })}
>
  {dictionary.app.start_training}
</button>
```

`onStart` Props обновляется:

```ts
interface Props {
  dictionary: Dictionary;
  onStart: (params: { symbolLayoutId: SymbolLayoutId; durationSeconds: number }) => void;
}
```

### 5.3. `appMachine`

```ts
// src/machines/app.machine.ts

export interface AppContext {
  lastTrainingStream: TypingStream | null;
  lastSessionSummary: SessionSummaryPayload | null;
  currentSymbolLayoutId: SymbolLayoutId;
  /** Длительность сессии, выбранная в меню перед стартом. */
  sessionDurationSeconds: number;
}

export type AppEvent =
  | { type: 'START_TRAINING'; symbolLayoutId: SymbolLayoutId; durationSeconds: number }
  // ...

// Action при START_TRAINING: запомнить и раскладку, и длительность.
setTrainingParams: assign((_, params: { symbolLayoutId: SymbolLayoutId; durationSeconds: number }) => ({
  currentSymbolLayoutId: params.symbolLayoutId,
  sessionDurationSeconds: params.durationSeconds,
})),

// training invoke: input — только от context (XState v5 не даёт access к event здесь).
input: ({ context, self }) => ({
  symbolLayoutId: context.currentSymbolLayoutId,
  cpm: DEFAULT_SESSION_CPM,
  durationSeconds: context.sessionDurationSeconds,
  parentActor: self,
}),
```

### 5.4. `sessionMachine`

```ts
// src/machines/session.machine.ts

export interface SessionInput {
  symbolLayoutId: SymbolLayoutId;
  cpm: number;
  durationSeconds: number;
  parentActor: ParentActor;
}

export interface SessionContext {
  // ...
  durationSeconds: number;
  // ...
}

function getSessionWindowMs(context: SessionContext): number {
  return context.durationSeconds * 1000;
}
```

Все использования `SESSION_DURATION_SECONDS` внутри `sessionMachine` заменяются на `context.durationSeconds`:

- `computeBudgetChars({ secondsRemaining: context.durationSeconds, cpm: context.cpm })`;
- `windowMs` в `commitSegment`/`isExpired`/`liveElapsed` — через `getSessionWindowMs(context)`.

Константа `SESSION_DURATION_SECONDS` в `src/lib/session-config.ts` удаляется; остальные константы (`TICK_INTERVAL_MS`, `DEFAULT_SESSION_CPM`, `REFILL_THRESHOLD_SYMBOLS`, `MIN_JOURNAL_EXPOSURES`) остаются без изменений. Если где-то ещё нужен дефолт — использовать `DEFAULT_USER_SETTINGS.sessionDurationSeconds`.

### 5.5. `+layout.svelte`

```ts
// src/routes/+layout.svelte

const durationSeconds = $derived(
  inState({ snapshot: appState, value: 'training' }) && sessionActor
    ? sessionActor.getSnapshot().context.durationSeconds
    : null,
);

const timerSeconds = $derived(
  durationSeconds !== null
    ? Math.max(0, durationSeconds - Math.floor(displayElapsedMs / 1000))
    : null,
);
```

Импорт `SESSION_DURATION_SECONDS` удаляется.

## 6. i18n

Новые ключи в `dictionaries/en.json` и `dictionaries/ru.json`:

```json
{
  "settings": {
    "session_duration_label": "Session duration"
  },
  "options": {
    "sessionDurations": {
      "60": "1 min",
      "180": "3 min",
      "300": "5 min",
      "600": "10 min",
      "900": "15 min"
    }
  }
}
```

Русский:

```json
{
  "settings": {
    "session_duration_label": "Длительность сессии"
  },
  "options": {
    "sessionDurations": {
      "60": "1 мин",
      "180": "3 мин",
      "300": "5 мин",
      "600": "10 мин",
      "900": "15 мин"
    }
  }
}
```

## 7. Edge cases и инварианты

| # | Инвариант | Реализация |
|---|---|---|
| 1 | Длительность всегда одна из 5 допустимых | `isSessionDurationSeconds` в `normalizeSettings` |
| 2 | Гость не ломается | `DEFAULT_USER_SETTINGS.sessionDurationSeconds = 300` |
| 3 | Cloud row без поля → дефолт | `normalizeSettings` заполняет пропуск |
| 4 | Таймер считает остаток от выбранной длительности | `+layout.svelte` берёт `durationSeconds` из актора |
| 5 | Бюджет порции соответствует выбранной длительности | `sessionMachine` передаёт `context.durationSeconds` в `computeBudgetChars` |
| 6 | Истечение сессии корректно для любой длительности | `SESSION_WINDOW_MS` вычисляется из `context.durationSeconds` |

## 8. Тесты

### 8.1. Новые и расширенные тестовые файлы

| Файл | Покрывает |
|---|---|
| `src/lib/settings.test.ts` (расширение) | нормализация `sessionDurationSeconds`: валидное, out-of-range, не-число, отсутствующее |
| `src/lib/settings-sync.test.ts` (расширение) | round-trip `sessionDurationSeconds` через `cloudRowToSettings` / `settingsToCloudArgs` |
| `src/machines/session.machine.test.ts` (расширение) | обновить `INPUT` (`durationSeconds` обязателен); параметризованный тест на 60 и 300 секунд: истечение, бюджет, финальная сводка |
| `src/machines/app.machine.test.ts` (расширение, если есть) | `START_TRAINING` записывает `sessionDurationSeconds` в контекст; пробрасывается в session input |
| `convex/userSettings.test.ts` (расширение) | `upsertMineHandler` сохраняет `sessionDurationSeconds`; `getMineHandler` возвращает |
| `src/components/train/SessionDurationSelector.svelte.test.ts` (новый, если есть компонентные тесты) | клик меняет значение, selected-state |

### 8.2. Команда проверки

`make check-all` (lint + typecheck + test + build).

## 9. Сводка по затронутым файлам

### Новые файлы

- `src/components/train/SessionDurationSelector.svelte`
- `src/components/train/SessionDurationSelector.svelte.test.ts` (при наличии компонентного тестирования)

### Изменяемые файлы

- `src/interfaces/user-settings.ts` — добавить `sessionDurationSeconds`
- `src/user-settings/user-settings.ts` — добавить в `DEFAULT_USER_SETTINGS`
- `src/lib/session-config.ts` — удалить `SESSION_DURATION_SECONDS`
- `src/lib/settings.ts` — нормализация `sessionDurationSeconds`
- `src/lib/settings-sync.ts` — cloud round-trip
- `src/components/train/MenuScreen.svelte` — встроить селектор, расширить `onStart`
- `src/machines/app.machine.ts` — `START_TRAINING` несёт `durationSeconds`, action пишет в context, input для session берёт из context
- `src/machines/session.machine.ts` — `SessionInput`/`SessionContext` с `durationSeconds`, окно из него
- `src/machines/app.machine.test.ts` (если есть) — обновить под новый event/context
- `src/machines/session.machine.test.ts` — обновить `INPUT` и добавить параметризованные кейсы
- `src/routes/+layout.svelte` — `timerSeconds` из актора, без импорта константы
- `convex/schema.ts` — `sessionDurationSeconds` в `userSettings`
- `convex/userSettings.ts` — args mutation/query
- `convex/userSettings.test.ts` — фикстуры и тесты
- `dictionaries/en.json` — метки
- `dictionaries/ru.json` — метки

### Удаляемые файлы

- Нет.

## 10. Связь с долгосрочным видением

- Этот инкремент готовит почву для персонализированных рекомендаций (например, «ваша средняя длительность — 10 мин»), не реализуя их.
- Сохранение в `UserSettings` reuse'ит существующий механизм cloud sync, не добавляя новой абстракции.
- Параметризация `sessionMachine` открывает путь к другим режимам с разным окном (например, «марафон» или «быстрый спринт») без переписывания машины.
