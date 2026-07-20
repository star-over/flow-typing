import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatAriaBinding, formatBinding, getPlatform } from './platform';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPlatform', () => {
  it("mac для 'MacIntel'", () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh)' });
    expect(getPlatform()).toBe('mac');
  });

  it("other для 'Win32'", () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0)' });
    expect(getPlatform()).toBe('other');
  });

  it('other без navigator (глушим глобальный объект node)', () => {
    vi.stubGlobal('navigator', undefined);
    expect(getPlatform()).toBe('other');
  });
});

describe('formatBinding', () => {
  it('mac: mod → ⌘, глиф клавиши из code', () => {
    expect(formatBinding({ binding: { mod: true, code: 'Comma' }, platform: 'mac' })).toEqual([
      '⌘',
      ',',
    ]);
  });

  it('other: mod → Ctrl', () => {
    expect(formatBinding({ binding: { mod: true, code: 'Comma' }, platform: 'other' })).toEqual([
      'Ctrl',
      ',',
    ]);
  });

  it('mac: порядок модификаторов ⌥ ⇧ ⌘ (HIG), буква из KeyK', () => {
    expect(
      formatBinding({
        binding: { mod: true, shift: true, alt: true, code: 'KeyK' },
        platform: 'mac',
      }),
    ).toEqual(['⌥', '⇧', '⌘', 'K']);
  });

  it('other: порядок Ctrl Alt Shift', () => {
    expect(
      formatBinding({
        binding: { mod: true, alt: true, shift: true, code: 'Digit3' },
        platform: 'other',
      }),
    ).toEqual(['Ctrl', 'Alt', 'Shift', '3']);
  });
});

describe('formatAriaBinding', () => {
  it('undefined binding → undefined (атрибут не рендерится)', () => {
    expect(formatAriaBinding({ binding: undefined, platform: 'mac' })).toBeUndefined();
  });

  it('mac: mod → Meta, клавиша как event.key', () => {
    expect(formatAriaBinding({ binding: { mod: true, code: 'Comma' }, platform: 'mac' })).toBe(
      'Meta+,',
    );
  });

  it('other: mod → Control', () => {
    expect(formatAriaBinding({ binding: { mod: true, code: 'Comma' }, platform: 'other' })).toBe(
      'Control+,',
    );
  });

  it('буквы — заглавные (APG), модификаторы через +', () => {
    expect(
      formatAriaBinding({ binding: { mod: true, shift: true, code: 'KeyK' }, platform: 'mac' }),
    ).toBe('Meta+Shift+K');
  });
});

describe('glyph-таблицы', () => {
  it('Escape: визуальный глиф Esc, aria-значение Escape', () => {
    expect(formatBinding({ binding: { mod: true, code: 'Escape' }, platform: 'mac' })).toEqual([
      '⌘',
      'Esc',
    ]);
    expect(formatAriaBinding({ binding: { mod: true, code: 'Escape' }, platform: 'mac' })).toBe(
      'Meta+Escape',
    );
  });

  it('Space: визуальный глиф ␣, aria-значение Space', () => {
    expect(formatBinding({ binding: { mod: true, code: 'Space' }, platform: 'mac' })).toEqual([
      '⌘',
      '␣',
    ]);
    expect(formatAriaBinding({ binding: { mod: true, code: 'Space' }, platform: 'mac' })).toBe(
      'Meta+Space',
    );
  });

  it('код вне таблиц отдаётся как есть (fallback)', () => {
    expect(formatBinding({ binding: { mod: true, code: 'ArrowDown' }, platform: 'mac' })).toEqual([
      '⌘',
      'ArrowDown',
    ]);
    expect(formatAriaBinding({ binding: { mod: true, code: 'ArrowDown' }, platform: 'mac' })).toBe(
      'Meta+ArrowDown',
    );
  });
});
