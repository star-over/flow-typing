import { describe, expect, it } from 'vitest';
import { TEXT_LANGUAGES, type TextLanguage } from '@/interfaces/types';
import {
  getSymbolLayoutDescriptor,
  getDefaultSymbolLayoutForTextLanguage,
  getCompatibleSymbolLayoutsForTextLanguage,
  getSymbolsSupportedBySymbolLayout,
  SYMBOL_LAYOUT_REGISTRY,
  SymbolLayoutDescriptorSchema,
  SymbolLayoutRegistrySchema,
} from './layouts';

describe('symbol layout registry', () => {
  it('getSymbolLayoutDescriptor возвращает descriptor для каждого SYMBOL_LAYOUT_ID', () => {
    expect(getSymbolLayoutDescriptor('qwerty').symbolLayoutId).toBe('qwerty');
    expect(getSymbolLayoutDescriptor('йцукен').symbolLayoutId).toBe('йцукен');
  });

  it('боевой SYMBOL_LAYOUT_REGISTRY проходит SymbolLayoutRegistrySchema', () => {
    expect(SymbolLayoutRegistrySchema.safeParse(SYMBOL_LAYOUT_REGISTRY).success).toBe(true);
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

// Минимальная валидная запись реестра; `over` перекрывает поля под конкретный кейс.
const descriptor = (over: Record<string, unknown> = {}) => ({
  symbolLayoutId: 'qwerty',
  textLanguage: 'en',
  isDefaultForTextLanguages: ['en'],
  symbolLayout: [{ symbol: 'a', keyCaps: ['KeyA'] }],
  ...over,
});

const messages = (issues: { message: string }[]) => issues.map((i) => i.message).join(' | ');

describe('SymbolLayoutDescriptorSchema (.refine)', () => {
  it('accepts a descriptor that is default for its own textLanguage', () => {
    expect(SymbolLayoutDescriptorSchema.safeParse(descriptor()).success).toBe(true);
  });

  it('rejects a descriptor not default for its own textLanguage', () => {
    const result = SymbolLayoutDescriptorSchema.safeParse(
      descriptor({ isDefaultForTextLanguages: [] }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(messages(result.error.issues)).toContain('default for its own textLanguage');
    }
  });

  it('rejects defaults that are neither the textLanguage nor its ancestor', () => {
    const result = SymbolLayoutDescriptorSchema.safeParse(
      descriptor({ isDefaultForTextLanguages: ['en', 'ru'] }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(messages(result.error.issues)).toContain('only textLanguage or its ancestors');
    }
  });
});

describe('SymbolLayoutRegistrySchema (.superRefine)', () => {
  it('accepts a registry with one default per language, covering all languages', () => {
    const registry = [
      descriptor(),
      descriptor({ symbolLayoutId: 'йцукен', textLanguage: 'ru', isDefaultForTextLanguages: ['ru'] }),
    ];
    expect(SymbolLayoutRegistrySchema.safeParse(registry).success).toBe(true);
  });

  it('rejects more than one default layout for the same language', () => {
    const registry = [
      descriptor({ symbolLayoutId: 'qwerty', textLanguage: 'en', isDefaultForTextLanguages: ['en'] }),
      descriptor({ symbolLayoutId: 'йцукен', textLanguage: 'en', isDefaultForTextLanguages: ['en'] }),
      descriptor({ symbolLayoutId: 'йцукен', textLanguage: 'ru', isDefaultForTextLanguages: ['ru'] }),
    ];
    const result = SymbolLayoutRegistrySchema.safeParse(registry);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(messages(result.error.issues)).toContain('Multiple default layouts');
    }
  });

  it('rejects a registry that leaves a language uncovered', () => {
    const result = SymbolLayoutRegistrySchema.safeParse([descriptor()]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(messages(result.error.issues)).toContain("No layout covers textLanguage='ru'");
    }
  });
});
