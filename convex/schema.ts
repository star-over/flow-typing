import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,
  // Per-user UI settings. Source of truth для cross-device sync.
  // Connected to users via userId; одна row на юзера (enforced upsertMine).
  // updatedAt — server-gen, ставится сервером при каждом upsert.
  userSettings: defineTable({
    userId: v.id('users'),
    interfaceLanguage: v.string(),
    textLanguage: v.string(),
    symbolLayoutId: v.string(),
    // Optional для обратной совместимости с row'ами, созданными до добавления
    // полей. Новые upsert'ы всегда пишут значение; на чтении отсутствие
    // догоняется дефолтом через normalizeSettings (клиент).
    fingerLayoutId: v.optional(v.string()),
    cursorType: v.optional(v.string()),
    theme: v.string(),
    // Optional: строки, записанные до появления поля, его не имеют (back-compat).
    displayName: v.optional(v.string()),
    rhythmChannelEnabled: v.optional(v.boolean()),
    sessionDurationSeconds: v.optional(v.number()),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),
  // Корпус упражнений. Вся мета — чистая функция текста и нейтральна к
  // раскладке; считается конвейером корпуса при наполнении. Совместимость с
  // конкретной раскладкой и доступность по размеру набора букв — в
  // drillSelectionIndex, не здесь. Индексов нет: фильтрация идёт через
  // drillSelectionIndex, тождество строки даёт _id.
  drills: defineTable({
    text: v.string(), // что печатает пользователь
    length: v.number(), // число символов для печати — бюджет порции (символы ÷ скорость)
    uniqueSymbols: v.array(v.string()), // уникальные символы — членство «символы ⊆ раскладка» + индекс доступности
    wordCount: v.number(), // число слов — ручка «целевая длина слова»
    avgWordLength: v.number(), // средняя длина слова — та же ручка
    maxWordLength: v.number(), // максимальная длина слова — потолок ручки
    bigrams: v.array(v.string()), // уникальные пары букв — ранжирование по слабым парам (этап «Фокус»)
    // частотность символов — массивом: ключи-символы не-ASCII, Convex запрещает их в именах полей
    symbolFrequency: v.array(v.object({ symbol: v.string(), count: v.number() })),
  }),
  // Таблица отбора (производная, per Layout Context): на каждый (drill × раскладка)
  // — stepLevel = макс. ladderStep среди символов drill'а (шаг живёт на символе,
  // ADR 0020). drill доступен ⟺ stepLevel < openedSteps (ADR 0001). Пересчитывается
  // при правке нарезки (ladderStep); заполняется серверным selectionIndex:rebuild.
  drillSelectionIndex: defineTable({
    drillId: v.id('drills'),
    symbolLayoutId: v.string(),
    stepLevel: v.number(),
  }).index('by_layout_and_step', ['symbolLayoutId', 'stepLevel']),
  // Skill Profile: всё знание системы о пользователе в одном Layout Context
  // (пара user × раскладка). Server-authoritative (ADR 0005). Наполняется
  // drillRecord (apply сводки с затуханием); на этапе 1 ещё ничего не выбирает.
  // openedSteps — Repertoire (число открытых шагов лестницы, ADR 0001).
  // symbolCells — ячейки per-символ массивом: ключи-символы не-ASCII, Convex
  // запрещает их в именах полей (как symbolFrequency в drills). per-биграмма —
  // на этапе «Фокус». updatedAt ставит сервер.
  skillProfiles: defineTable({
    userId: v.id('users'),
    symbolLayoutId: v.string(),
    openedSteps: v.number(),
    symbolCells: v.array(
      v.object({
        symbol: v.string(),
        exposures: v.number(), // всего предъявлений символа
        clean: v.number(), // из них чистых (первое нажатие верное)
        latencyEwma: v.number(), // EWMA латентности, мс (0 пока нет сэмплов)
        latencySamples: v.number(), // сколько латентностей сложено
      })
    ),
    updatedAt: v.number(),
  }).index('by_user_and_layout', ['userId', 'symbolLayoutId']),
  // Журнал сессий: append-only, по строке на завершённую сессию. Отдельно от
  // skillProfiles (проекция для алгоритма) — это аналитика/коучинг: тренд
  // cpm/accuracy, хронология ступеней (openedSteps во времени), пары-путаницы
  // (направление промаха). Сырьё attempts сюда НЕ кладём. capturedAt и
  // openedSteps штампует сервер (см. convex/sessions.ts), как updatedAt в userSettings.
  sessionSummaries: defineTable({
    userId: v.id('users'),
    symbolLayoutId: v.string(),
    capturedAt: v.number(), // server-stamped
    openedSteps: v.number(), // server-stamped из skillProfiles на момент записи
    durationMs: v.number(),
    exposures: v.number(),
    clean: v.number(),
    cpm: v.number(),
    latencyMedianMs: v.number(),
    // Ровность ритма за сессию, % (100·(1−CV)). Optional: строки до появления поля
    // и сессии с нехваткой интервалов его не имеют → в /stats «—».
    rhythm: v.optional(v.number()),
    confusions: v.array(
      v.object({ target: v.string(), pressed: v.string(), count: v.number() }),
    ),
  }).index('by_user_and_layout', ['userId', 'symbolLayoutId']),
  // Канал наблюдаемости (P0-7): непойманные клиентские ошибки из hooks.client.ts
  // `handleError`. Замена внешнему error-tracking'у (Sentry недоступен владельцу в
  // РФ + приватность-бренд) — ошибки лежат там же, где метрики, видны в Convex
  // dashboard. userId optional: ошибка возможна и у гостя (лендинг, /signin,
  // train-gate до входа) — тогда его нет. capturedAt штампует сервер. Индекса нет:
  // читатель на MVP — сам dashboard; query-читателя (панель) заведём с ним (P1).
  clientErrors: defineTable({
    message: v.string(),
    stack: v.optional(v.string()),
    url: v.optional(v.string()), // pathname, где случилось
    userAgent: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    capturedAt: v.number(), // server-stamped
  }),
});
