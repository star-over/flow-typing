import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { getMineHandler, upsertMineHandler } from './userSettings';
import schema from './schema';
import { api } from './_generated/api';

// import.meta.glob нужен convex-test для регистрации функций (паттерн из convex/auth.test.ts)
const modules = import.meta.glob('./**/*.ts');

const validSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  fingerLayoutId: 'asdf',
  cursorType: 'RECTANGLE',
  theme: 'auto',
  displayName: '',
  rhythmChannelEnabled: false,
};

describe('getMineHandler', () => {
  test('returns null when no row exists for user', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      const result = await getMineHandler({ ctx, userId });
      expect(result).toBeNull();
    });
  });

  test('returns row when one exists for user', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      await ctx.db.insert('userSettings', {
        userId,
        ...validSettings,
        theme: 'dark',
        updatedAt: 1000,
      });
      const result = await getMineHandler({ ctx, userId });
      expect(result).not.toBeNull();
      expect(result?.theme).toBe('dark');
      expect(result?.userId).toBe(userId);
    });
  });

  test('isolates rows between users (returns only own)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userA = await ctx.db.insert('users', { email: 'a@example.com' });
      const userB = await ctx.db.insert('users', { email: 'b@example.com' });
      await ctx.db.insert('userSettings', { userId: userA, ...validSettings, theme: 'light', updatedAt: 1000 });
      await ctx.db.insert('userSettings', { userId: userB, ...validSettings, theme: 'dark', updatedAt: 2000 });
      const resultA = await getMineHandler({ ctx, userId: userA });
      const resultB = await getMineHandler({ ctx, userId: userB });
      expect(resultA?.theme).toBe('light');
      expect(resultB?.theme).toBe('dark');
    });
  });
});

describe('upsertMineHandler', () => {
  test('inserts new row when none exists', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      const id = await upsertMineHandler({ ctx, userId, settings: { ...validSettings, theme: 'dark' } });
      const row = await ctx.db.get(id);
      expect(row).not.toBeNull();
      expect(row?.theme).toBe('dark');
      expect(row?.userId).toBe(userId);
      expect(typeof row?.updatedAt).toBe('number');
      expect(row?.updatedAt).toBeGreaterThan(0);
    });
  });

  test('patches existing row in place when one exists (no duplicate)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      const firstId = await upsertMineHandler({ ctx, userId, settings: { ...validSettings, theme: 'light' } });
      const secondId = await upsertMineHandler({ ctx, userId, settings: { ...validSettings, theme: 'dark' } });
      expect(secondId).toBe(firstId);
      const all = await ctx.db.query('userSettings').collect();
      expect(all).toHaveLength(1);
      expect(all[0].theme).toBe('dark');
    });
  });

  test('updates updatedAt on patch', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      await upsertMineHandler({ ctx, userId, settings: validSettings });
      const firstRow = await ctx.db.query('userSettings').withIndex('by_user', q => q.eq('userId', userId)).unique();
      const firstUpdatedAt = firstRow!.updatedAt;
      await new Promise(r => setTimeout(r, 10));
      await upsertMineHandler({ ctx, userId, settings: { ...validSettings, theme: 'dark' } });
      const secondRow = await ctx.db.query('userSettings').withIndex('by_user', q => q.eq('userId', userId)).unique();
      expect(secondRow!.updatedAt).toBeGreaterThan(firstUpdatedAt);
    });
  });

  test('persists displayName through insert and patch', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      await upsertMineHandler({ ctx, userId, settings: { ...validSettings, displayName: 'Алиса' } });
      const inserted = await ctx.db.query('userSettings').withIndex('by_user', q => q.eq('userId', userId)).unique();
      expect(inserted?.displayName).toBe('Алиса');
      await upsertMineHandler({ ctx, userId, settings: { ...validSettings, displayName: '' } });
      const patched = await ctx.db.query('userSettings').withIndex('by_user', q => q.eq('userId', userId)).unique();
      expect(patched?.displayName).toBe('');
    });
  });

  test('persists rhythmChannelEnabled through insert and patch', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      await upsertMineHandler({ ctx, userId, settings: { ...validSettings, rhythmChannelEnabled: true } });
      const inserted = await ctx.db.query('userSettings').withIndex('by_user', q => q.eq('userId', userId)).unique();
      expect(inserted?.rhythmChannelEnabled).toBe(true);
      await upsertMineHandler({ ctx, userId, settings: { ...validSettings, rhythmChannelEnabled: false } });
      const patched = await ctx.db.query('userSettings').withIndex('by_user', q => q.eq('userId', userId)).unique();
      expect(patched?.rhythmChannelEnabled).toBe(false);
    });
  });

  test('isolates rows between users (upsert on A does not touch B)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userA = await ctx.db.insert('users', { email: 'a@example.com' });
      const userB = await ctx.db.insert('users', { email: 'b@example.com' });
      await upsertMineHandler({ ctx, userId: userA, settings: { ...validSettings, theme: 'light' } });
      await upsertMineHandler({ ctx, userId: userB, settings: { ...validSettings, theme: 'dark' } });
      const all = await ctx.db.query('userSettings').collect();
      expect(all).toHaveLength(2);
      const rowA = all.find(r => r.userId === userA);
      const rowB = all.find(r => r.userId === userB);
      expect(rowA?.theme).toBe('light');
      expect(rowB?.theme).toBe('dark');
    });
  });
});

describe('getMine query — auth check', () => {
  test('returns null when no identity (unauthenticated caller)', async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.userSettings.getMine, {});
    expect(result).toBeNull();
  });
});

describe('upsertMine mutation — auth check', () => {
  test('throws when no identity (unauthenticated caller)', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.userSettings.upsertMine, validSettings),
    ).rejects.toThrow(/not authenticated/i);
  });

  test('does NOT insert row when call fails on auth check', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const before = await ctx.db.query('userSettings').collect();
      expect(before).toHaveLength(0);
    });
    await expect(
      t.mutation(api.userSettings.upsertMine, validSettings),
    ).rejects.toThrow();
    await t.run(async (ctx) => {
      const after = await ctx.db.query('userSettings').collect();
      expect(after).toHaveLength(0);
    });
  });
});
