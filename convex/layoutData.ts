/**
 * @file Единый источник данных раскладки для сервера: symbolLayoutId →
 * { symbolLayout, keyLadder }. symbolLayout (json) и keyLadder регистрируются
 * атомарно в одном map — нет рассинхрона и нет рантайм-throw. Здесь (а не в
 * shared), т.к. shared/symbol-layout.ts намеренно без I/O. Неизвестная раскладка
 * → null, потребитель деградирует без throw.
 */
import type { KeyLadder } from '../shared/key-ladder/types.ts';
import type { SymbolEntry } from '../shared/symbol-layout.ts';
import { jcukenKeyLadder } from '../shared/key-ladder/jcuken.ts';
import symbolLayoutJcuken from '../src/data/layouts/symbol-layout-jcuken.json';

export interface LayoutData {
  symbolLayout: SymbolEntry[];
  keyLadder: KeyLadder;
}

const LAYOUTS: Record<string, LayoutData> = {
  'йцукен': { symbolLayout: symbolLayoutJcuken, keyLadder: jcukenKeyLadder },
};

export function getLayoutData(symbolLayoutId: string): LayoutData | null {
  return LAYOUTS[symbolLayoutId] ?? null;
}
