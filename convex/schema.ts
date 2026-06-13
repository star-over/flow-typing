import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,
  health: defineTable({
    tickedAt: v.number(),
  }),
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
    updatedAt: v.number(),
  }).index('by_user', ['userId']),
});
