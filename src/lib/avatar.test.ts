import { describe, it, expect } from 'vitest';
import { getAvatarInitials } from './avatar';

describe('getAvatarInitials', () => {
  it('takes first letters of first and last words of a name', () => {
    expect(getAvatarInitials({ name: 'Demo User' })).toBe('DU');
    expect(getAvatarInitials({ name: 'Ada Byron Lovelace' })).toBe('AL');
  });

  it('takes the first two letters of a single-word name', () => {
    expect(getAvatarInitials({ name: 'Alice' })).toBe('AL');
  });

  it('handles Cyrillic names', () => {
    expect(getAvatarInitials({ name: 'Иван Петров' })).toBe('ИП');
  });

  it('falls back to the email local-part when name is absent', () => {
    expect(getAvatarInitials({ email: 'john.doe@example.com' })).toBe('JD');
    expect(getAvatarInitials({ email: 'starover@example.com' })).toBe('ST');
  });

  it('splits the local-part on dots, underscores and hyphens', () => {
    expect(getAvatarInitials({ email: 'maria_kovalenko@x.io' })).toBe('MK');
    expect(getAvatarInitials({ email: 'a-b@x.io' })).toBe('AB');
  });

  it('prefers name over email', () => {
    expect(getAvatarInitials({ name: 'Demo User', email: 'zzz@x.io' })).toBe('DU');
  });

  it('ignores surrounding whitespace', () => {
    expect(getAvatarInitials({ name: '  Demo   User  ' })).toBe('DU');
    expect(getAvatarInitials({ name: '   ', email: 'john.doe@x.io' })).toBe('JD');
  });

  it('returns ? when there is nothing to derive from', () => {
    expect(getAvatarInitials({})).toBe('?');
    expect(getAvatarInitials({ name: null, email: null })).toBe('?');
    expect(getAvatarInitials({ name: '', email: '' })).toBe('?');
  });
});
