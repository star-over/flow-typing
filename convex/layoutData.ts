/**
 * @file Единый источник данных раскладки для сервера: symbolLayoutId →
 * { symbolLayout }. Раскладка (json) несёт и отношение символ→клавиши, и шаг
 * открытия каждого символа (`ladderStep`, ADR 0020) — отдельного KeyLadder больше
 * нет. Здесь (а не в shared), т.к. shared/symbol-layout.ts намеренно без I/O.
 * Неизвестная раскладка → null, потребитель деградирует без throw.
 */
import type { SymbolEntry } from '../shared/symbol-layout.ts';
import symbolLayoutJcuken from '../src/data/layouts/symbol-layout-jcuken.json';

export interface LayoutData {
  symbolLayout: SymbolEntry[];
}

const LAYOUTS: Record<string, LayoutData> = {
  'йцукен': { symbolLayout: symbolLayoutJcuken },
};

export function getLayoutData(symbolLayoutId: string): LayoutData | null {
  return LAYOUTS[symbolLayoutId] ?? null;
}
