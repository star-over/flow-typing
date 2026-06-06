import type { Drill } from '@/interfaces/drill-data.types';
import type { SymbolLayoutDescriptor } from '@/interfaces/types';
import { getSymbolsSupportedBySymbolLayout } from '@/lib/layouts';
import { isDrillCompatibleWithSymbolLayout } from '@/lib/text-language-utils';

/**
 * Возвращает подмножество drill'ов, совместимых с раскладкой:
 * - язык drill совместим с языком раскладки (правило префикса BCP 47);
 * - все символы текста физически набираются (страховка против битых тегов).
 */
export function filterDrillsBySymbolLayout({
  allDrills,
  symbolLayoutDescriptor,
}: {
  allDrills: Drill[];
  symbolLayoutDescriptor: SymbolLayoutDescriptor;
}): Drill[] {
  const supportedSymbols = getSymbolsSupportedBySymbolLayout(
    symbolLayoutDescriptor.symbolLayout
  );
  return allDrills.filter((drill) => {
    if (!isDrillCompatibleWithSymbolLayout({
      drillTextLanguage: drill.textLanguage,
      symbolLayoutTextLanguage: symbolLayoutDescriptor.textLanguage,
    })) return false;
    return drill.unique_symbols.every((sym) => supportedSymbols.has(sym));
  });
}

/** Возвращает случайный drill из массива или null, если массив пуст. */
export function selectRandomDrill({ drills }: { drills: Drill[] }): Drill | null {
  if (drills.length === 0) return null;
  return drills[Math.floor(Math.random() * drills.length)]!;
}
