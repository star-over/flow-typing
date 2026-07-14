/**
 * @file Дом фикстур сева для backend-тестов (проект `convex`). Единая точка:
 *  - `makeConvexTest()` — `convexTest(schema, modules)` с зашитыми `import.meta.glob`
 *    и регистрацией aggregate-компонента `drillIndex` (снимает 6 копий glob +
 *    per-test boilerplate `registerDrillIndex`).
 *  - `asUser({ t, userId })` — identity-обёртка: подаёт subject в форме convex-auth
 *    (`userId|session`), которую читает `getAuthUserId` (`subject.split('|')[0]`).
 *    Так authenticated-ветка обёрток становится тестовой поверхностью — без identity
 *    `getAuthUserId` всегда `null`, гоняется только гостевой путь.
 *  - `seedUser` / `seedDrillDoc` / `seedDrill` / `seedProfile` — билдеры строк БД.
 *    `seedDrill` инкапсулирует инвариант «таблица ↔ агрегат»: зеркалит строку
 *    `drillSelectionIndex` в `drillIndex`, как это делает прод-путь `insertBatch`
 *    (прямой `insert` его обходит, а `count()`/`at()` читают агрегат).
 *
 * ВАЖНО (deploy). Файл исключён из деплоя Convex — импортирует `convex-test` и
 * `@convex-dev/aggregate/test` (devDeps, недоступны в рантайме функций), а `_generated`
 * его не содержит. Потому `import.meta.glob` (Vite-трансформ, неизвестен esbuild-
 * бандлеру Convex) селится ЗДЕСЬ безопасно — новый deploy-visible файл его бы не
 * пережил. Верификация — `npx convex dev --once`.
 */
import { convexTest, type TestConvex } from 'convex-test';
import { register } from '@convex-dev/aggregate/test';
import { register as registerRateLimiter } from '@convex-dev/rate-limiter/test';
import schema from './schema';
import { drillIndex } from './drillIndex';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { ProfileCell } from '../shared/repertoire/readiness.ts';

// import.meta.glob резолвится относительно этого файла (convex/); './**/*.ts' глобит
// те же convex-модули, что из тест-файлов — один дом регистрации на весь проект.
const modules = import.meta.glob('./**/*.ts');

/** `convexTest(schema, modules)` + регистрация aggregate-компонента `drillIndex`. */
export function makeConvexTest(): TestConvex<typeof schema> {
  const t = convexTest(schema, modules);
  register(t, 'drillIndex');
  registerRateLimiter(t, 'rateLimiter'); // мутации зовут rateLimiter.limit — компонент нужен и в тестах
  return t;
}

// Форма subject — из исходника @convex-dev/auth: getAuthUserId делает
// subject.split('|')[0]; реальный convex-auth кодирует subject как
// `${userId}|${sessionId}`. Session-часть тесту не важна — важно, чтобы split дал
// userId; фикс-строка session делает identity детерминированной.
const TEST_SESSION = 'test-session';

/** Клиент под identity юзера — открывает authenticated-ветку getAuthUserId-обёрток. */
export function asUser({ t, userId }: { t: TestConvex<typeof schema>; userId: Id<'users'> }) {
  return t.withIdentity({ subject: `${userId}|${TEST_SESSION}` });
}

/** Вставляет юзера (поля authTables опциональны). Возвращает id. */
export async function seedUser({
  ctx,
  email,
  name,
}: {
  ctx: MutationCtx;
  email?: string;
  name?: string;
}): Promise<Id<'users'>> {
  const fields: { email?: string; name?: string } = {};
  if (email !== undefined) fields.email = email;
  if (name !== undefined) fields.name = name;
  return await ctx.db.insert('users', fields);
}

/** Вставляет строку `drills` (8-полевая мета из текста); без строки отбора и агрегата. */
export async function seedDrillDoc({ ctx, text }: { ctx: MutationCtx; text: string }): Promise<Id<'drills'>> {
  const length = text.length;
  return await ctx.db.insert('drills', {
    text,
    length,
    uniqueSymbols: [...new Set(text.split(''))],
    wordCount: 1,
    avgWordLength: length,
    maxWordLength: length,
    bigrams: [],
    symbolFrequency: [],
  });
}

/**
 * Полный сев drill'а: строка `drills` + строка отбора `drillSelectionIndex` +
 * зеркалирование в агрегат `drillIndex`. Зеркало обязательно — прямой insert
 * обходит прод-путь `insertBatch`, а случайный доступ (`count()`/`at()`) читает
 * агрегат. Инвариант «таблица ↔ агрегат» живёт здесь, а не у вызывающего.
 */
export async function seedDrill({
  ctx,
  text,
  step,
  layout,
}: {
  ctx: MutationCtx;
  text: string;
  step: number;
  layout: string;
}): Promise<Id<'drills'>> {
  const drillId = await seedDrillDoc({ ctx, text });
  const rowId = await ctx.db.insert('drillSelectionIndex', { drillId, symbolLayoutId: layout, stepLevel: step });
  const row = await ctx.db.get(rowId);
  if (row === null) throw new Error('seedDrill: строка drillSelectionIndex не найдена сразу после вставки');
  await drillIndex.insertIfDoesNotExist(ctx, row);
  return drillId;
}

/** Вставляет `skillProfiles` (ключ user × раскладка); symbolCells/updatedAt — дефолты. */
export async function seedProfile({
  ctx,
  userId,
  symbolLayoutId,
  openedSteps,
  symbolCells = [],
  updatedAt = 1,
}: {
  ctx: MutationCtx;
  userId: Id<'users'>;
  symbolLayoutId: string;
  openedSteps: number;
  symbolCells?: ProfileCell[];
  updatedAt?: number;
}): Promise<Id<'skillProfiles'>> {
  return await ctx.db.insert('skillProfiles', { userId, symbolLayoutId, openedSteps, symbolCells, updatedAt });
}
