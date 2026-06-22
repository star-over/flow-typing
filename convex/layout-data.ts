/**
 * @file Единый источник данных раскладки для сервера: symbolLayoutId →
 * { symbolLayout, keyLadder }. Тянет json раскладки + KeyLadder из registry.
 * Здесь (а не в shared), т.к. shared/symbol-layout.ts намеренно без I/O.
 * Возвращает null для неизвестной раскладки — потребитель деградирует без throw.
 */
import type { KeyLadder } from '../shared/key-ladder/types.ts';
import type { SymbolEntry } from '../shared/symbol-layout.ts';
import { getKeyLadder } from '../shared/key-ladder/registry.ts';
import symbolLayoutJcuken from '../src/data/layouts/symbol-layout-jcuken.json';

const SYMBOL_LAYOUTS: Record<string, SymbolEntry[]> = {
  'йцукен': symbolLayoutJcuken as SymbolEntry[],
};

export interface LayoutData {
  symbolLayout: SymbolEntry[];
  keyLadder: KeyLadder;
}

export function getLayoutData(symbolLayoutId: string): LayoutData | null {
  const symbolLayout = SYMBOL_LAYOUTS[symbolLayoutId];
  if (!symbolLayout) return null;
  return { symbolLayout, keyLadder: getKeyLadder(symbolLayoutId) };
}
