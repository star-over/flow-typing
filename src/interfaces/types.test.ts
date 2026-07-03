import { describe, expect, it } from 'vitest';

import { SymbolLayoutDescriptorSchema, SymbolLayoutRegistrySchema } from './types';

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
