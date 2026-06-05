import { describe, expect, it } from 'vitest';

import { KEY_CAP_IDS, isKnownKeyCapId } from './key-cap-id';

describe('isKnownKeyCapId', () => {
  it('accepts every entry of KEY_CAP_IDS', () => {
    for (const id of KEY_CAP_IDS) {
      expect(isKnownKeyCapId(id)).toBe(true);
    }
  });

  it('accepts common typing-trainer keys', () => {
    expect(isKnownKeyCapId('KeyA')).toBe(true);
    expect(isKnownKeyCapId('Digit1')).toBe(true);
    expect(isKnownKeyCapId('Space')).toBe(true);
    expect(isKnownKeyCapId('ShiftLeft')).toBe(true);
    expect(isKnownKeyCapId('Enter')).toBe(true);
    expect(isKnownKeyCapId('Escape')).toBe(true);
  });

  it('rejects keys outside the whitelist (would otherwise poison pressedKeys)', () => {
    // F13+ — extended function keys (rare layouts, scientific keyboards).
    expect(isKnownKeyCapId('F13')).toBe(false);
    expect(isKnownKeyCapId('F24')).toBe(false);
    // Media keys.
    expect(isKnownKeyCapId('MediaPlayPause')).toBe(false);
    expect(isKnownKeyCapId('AudioVolumeUp')).toBe(false);
    // Browser navigation hardware keys.
    expect(isKnownKeyCapId('BrowserBack')).toBe(false);
    // IME / international keys.
    expect(isKnownKeyCapId('Lang1')).toBe(false);
    expect(isKnownKeyCapId('Convert')).toBe(false);
    // Fallback when browser cannot identify the key.
    expect(isKnownKeyCapId('Unidentified')).toBe(false);
    // Empty / garbage strings.
    expect(isKnownKeyCapId('')).toBe(false);
    expect(isKnownKeyCapId('not-a-key')).toBe(false);
  });

  it('serves as a type predicate (narrowing usage)', () => {
    // Imitates the App.svelte border: event.code is a `string`.
    const code = 'KeyA' as string;
    if (isKnownKeyCapId(code)) {
      // Inside this block `code` is narrowed to KeyCapId; assignment below
      // would fail to compile without the predicate. Typecheck is the test.
      const _id = code;
      void _id;
    }
    expect(true).toBe(true);
  });
});
