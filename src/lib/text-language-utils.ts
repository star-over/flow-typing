import type { TextLanguage } from '@/interfaces/types';

/**
 * Возвращает true, если drill можно показать пользователю на этой раскладке
 * с точки зрения языка текста. Drill подходит раскладке, если язык drill
 * равен языку раскладки или является его предком в иерархии BCP 47.
 *
 * Семантика: «раскладка набирает тексты на своём собственном языке и на
 * любых более общих».
 */
export function isDrillCompatibleWithSymbolLayout({
  drillTextLanguage,
  symbolLayoutTextLanguage,
}: {
  drillTextLanguage: TextLanguage;
  symbolLayoutTextLanguage: TextLanguage;
}): boolean {
  if (drillTextLanguage === symbolLayoutTextLanguage) return true;
  if (symbolLayoutTextLanguage.startsWith(drillTextLanguage + '-')) return true;
  return false;
}
