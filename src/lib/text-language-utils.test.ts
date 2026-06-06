import { describe, expect, it } from 'vitest';
import { isDrillCompatibleWithSymbolLayout } from './text-language-utils';

describe('isDrillCompatibleWithSymbolLayout', () => {
  it('равенство языков → совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en',
      symbolLayoutTextLanguage: 'en',
    })).toBe(true);
  });

  it('drill общее раскладки (drill=en, layout=en-US) → совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en' as never,
      symbolLayoutTextLanguage: 'en-US' as never,
    })).toBe(true);
  });

  it('drill специфичнее раскладки (drill=en-GB, layout=en) → НЕ совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en-GB' as never,
      symbolLayoutTextLanguage: 'en' as never,
    })).toBe(false);
  });

  it('разные ветки иерархии (drill=en-GB, layout=en-US) → НЕ совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en-GB' as never,
      symbolLayoutTextLanguage: 'en-US' as never,
    })).toBe(false);
  });

  it('разные языки (drill=en, layout=ru) → НЕ совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en',
      symbolLayoutTextLanguage: 'ru',
    })).toBe(false);
  });

  it('подстрока не считается префиксом (drill=en, layout=eng) → НЕ совместим', () => {
    expect(isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: 'en' as never,
      symbolLayoutTextLanguage: 'eng' as never,
    })).toBe(false);
  });
});
