import { describe, expect, test } from 'vitest';
import { api } from './_generated/api';
import { makeConvexTest, asUser, seedUser } from './test.helpers';

describe('viewer query — текущий юзер', () => {
  test('гость (без identity) → null', async () => {
    const t = makeConvexTest();
    expect(await t.query(api.users.viewer, {})).toBeNull();
  });

  test('authenticated → документ текущего юзера', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => seedUser({ ctx, email: 'v@example.com', name: 'Viewer' }));
    const viewer = await asUser({ t, userId }).query(api.users.viewer, {});
    expect(viewer?._id).toBe(userId);
    expect(viewer?.email).toBe('v@example.com');
  });
});
