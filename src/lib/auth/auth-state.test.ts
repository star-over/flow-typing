import { describe, expect, test } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import { computeAuthState } from './auth-state';
import type { AuthState, User } from './auth.types';

// `Doc<'users'>` имеет много optional полей (name?/image?/phone?/...). Для тестов
// делаем минимальный валидный объект через `as User` cast.
function mockUser(overrides: Partial<User> = {}): User {
  return {
    _id: 'user_abc' as Id<'users'>,
    _creationTime: 0,
    email: 'foo@example.com',
    ...overrides,
  } as User;
}

describe('computeAuthState — 3-state contract', () => {
  test('isLoading=true → loading regardless of viewer', () => {
    const state: AuthState = computeAuthState({ isLoading: true, isAuthenticated: false, viewer: null });
    expect(state.status).toBe('loading');
  });

  test('isLoading=true + isAuthenticated=true → still loading', () => {
    const state: AuthState = computeAuthState({ isLoading: true, isAuthenticated: true, viewer: null });
    expect(state.status).toBe('loading');
  });

  test('isLoading=false + isAuthenticated=false → guest', () => {
    const state: AuthState = computeAuthState({ isLoading: false, isAuthenticated: false, viewer: null });
    expect(state.status).toBe('guest');
  });

  test('isLoading=false + isAuthenticated=true + viewer=null → loading (waiting for viewer)', () => {
    const state: AuthState = computeAuthState({ isLoading: false, isAuthenticated: true, viewer: null });
    expect(state.status).toBe('loading');
  });

  test('isLoading=false + isAuthenticated=true + viewer set → authenticated with user', () => {
    const user = mockUser();
    const state: AuthState = computeAuthState({ isLoading: false, isAuthenticated: true, viewer: user });
    expect(state.status).toBe('authenticated');
    if (state.status === 'authenticated') {
      expect(state.user).toEqual(user);
    }
  });

  test('isLoading=false + isAuthenticated=false but viewer set (stale) → guest, ignore viewer', () => {
    const state: AuthState = computeAuthState({ isLoading: false, isAuthenticated: false, viewer: mockUser() });
    expect(state.status).toBe('guest');
  });
});
