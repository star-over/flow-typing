import type {
  SymbolLayout,
  SymbolLayoutDescriptor,
  SymbolLayoutId,
  TextLanguage,
} from '@/interfaces/types';
import { SymbolLayoutRegistrySchema } from '@/interfaces/types';
import { symbolLayoutQwerty } from './symbol-layout-qwerty';
import { symbolLayoutJcuken } from './symbol-layout-jcuken';

/**
 * Плоская таблица descriptor'ов раскладок. Источник истины для:
 * - какие раскладки существуют (id),
 * - на каком языке каждая печатает (textLanguage),
 * - для каких языков каждая является дефолтным выбором.
 * Инварианты схемы проверяются на старте модуля.
 */
export const SYMBOL_LAYOUT_REGISTRY: SymbolLayoutDescriptor[] =
  SymbolLayoutRegistrySchema.parse([
    {
      symbolLayoutId: 'qwerty',
      textLanguage: 'en',
      isDefaultForTextLanguages: ['en'],
      symbolLayout: symbolLayoutQwerty,
    },
    {
      symbolLayoutId: 'йцукен',
      textLanguage: 'ru',
      isDefaultForTextLanguages: ['ru'],
      symbolLayout: symbolLayoutJcuken,
    },
  ]);

export const getSymbolLayout = (id: SymbolLayoutId): SymbolLayout =>
  SYMBOL_LAYOUT_REGISTRY.find(d => d.symbolLayoutId === id)!.symbolLayout;

export const getSymbolLayoutDescriptor = (
  id: SymbolLayoutId
): SymbolLayoutDescriptor =>
  SYMBOL_LAYOUT_REGISTRY.find(d => d.symbolLayoutId === id)!;

export const getDefaultSymbolLayoutForTextLanguage = (
  textLang: TextLanguage
): SymbolLayoutDescriptor => {
  const exact = SYMBOL_LAYOUT_REGISTRY.find(
    d => d.isDefaultForTextLanguages.includes(textLang)
  );
  if (exact) return exact;
  // Фолбэк по родителю (BCP 47): 'en-CA' → 'en'
  const parent = textLang.split('-').slice(0, -1).join('-');
  if (parent.length > 0) {
    return getDefaultSymbolLayoutForTextLanguage(parent as TextLanguage);
  }
  throw new Error(`No default symbol layout for textLanguage: ${textLang}`);
};

export const getCompatibleSymbolLayoutsForTextLanguage = (
  textLang: TextLanguage
): SymbolLayoutDescriptor[] =>
  SYMBOL_LAYOUT_REGISTRY.filter(
    d => d.textLanguage === textLang || d.textLanguage.startsWith(textLang + '-')
  );

export const getSymbolsSupportedBySymbolLayout = (
  symbolLayout: SymbolLayout
): Set<string> => new Set(symbolLayout.map(e => e.symbol));
