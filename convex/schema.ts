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
    cursorMode: v.optional(v.string()),
    theme: v.string(),
    // Optional: строки, записанные до появления поля, его не имеют (back-compat).
    displayName: v.optional(v.string()),
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
    symbolFrequency: v.record(v.string(), v.number()), // частотность символов — плотность для фокус-ранжирования
  }),
});
