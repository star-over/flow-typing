import { describe, expect, it } from 'vitest';
import { TEXT_LANGUAGES, type TextLanguage } from '@/interfaces/types';
import {
  getSymbolLayoutDescriptor,
  getDefaultSymbolLayoutForTextLanguage,
  getCompatibleSymbolLayoutsForTextLanguage,
  getSymbolsSupportedBySymbolLayout,
} from './layouts';

describe('symbol layout registry', () => {
  it('getSymbolLayoutDescriptor возвращает descriptor для каждого SYMBOL_LAYOUT_ID', () => {
    expect(getSymbolLayoutDescriptor('qwerty').symbolLayoutId).toBe('qwerty');
    expect(getSymbolLayoutDescriptor('йцукен').symbolLayoutId).toBe('йцукен');
  });

  it('getDefaultSymbolLayoutForTextLanguage не падает для каждого TEXT_LANGUAGES', () => {
    for (const lang of TEXT_LANGUAGES) {
      expect(() => getDefaultSymbolLayoutForTextLanguage(lang)).not.toThrow();
    }
  });

  it('getDefault: en → qwerty, ru → йцукен', () => {
    expect(getDefaultSymbolLayoutForTextLanguage('en').symbolLayoutId).toBe('qwerty');
    expect(getDefaultSymbolLayoutForTextLanguage('ru').symbolLayoutId).toBe('йцукен');
  });

  it('getDefault для неизвестного диалекта откатывается к родителю', () => {
    // 'en-CA' нет в реестре — фолбэк к 'en' → qwerty
    expect(getDefaultSymbolLayoutForTextLanguage('en-CA' as TextLanguage).symbolLayoutId)
      .toBe('qwerty');
  });

  it('getCompatibleSymbolLayoutsForTextLanguage(en) включает qwerty', () => {
    const compatible = getCompatibleSymbolLayoutsForTextLanguage('en');
    expect(compatible.map(d => d.symbolLayoutId)).toContain('qwerty');
    expect(compatible.map(d => d.symbolLayoutId)).not.toContain('йцукен');
  });

  it('getSymbolsSupportedBySymbolLayout возвращает Set строк', () => {
    const qwerty = getSymbolLayoutDescriptor('qwerty').symbolLayout;
    const supported = getSymbolsSupportedBySymbolLayout(qwerty);
    expect(supported.has('a')).toBe(true);
    expect(supported.has('z')).toBe(true);
    expect(supported.has(' ')).toBe(true);
    expect(supported.has('я')).toBe(false);
  });
});
