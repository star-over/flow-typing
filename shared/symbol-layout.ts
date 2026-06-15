/**
 * @file Чистые помощники символьной раскладки (без I/O): тип записи и карты.
 * Часть рантайм-модели: импортируется сервером (Convex) и инструментами
 * (auto-flow). Загрузка с диска — в `auto-flow/symbol-layout.ts` (tooling).
 */

export interface SymbolEntry {
  symbol: string;
  keyCaps: string[]; // полный аккорд: базовая клавиша + Shift у шифтовых символов
}

/** Множество всех клавиш раскладки (объединение аккордов). */
export function layoutKeyCaps(entries: SymbolEntry[]): Set<string> {
  return new Set(entries.flatMap((entry) => entry.keyCaps));
}

/** Карта символ → клавиши (аккорд). */
export function symbolToKeyCaps(entries: SymbolEntry[]): Map<string, string[]> {
  return new Map(entries.map((entry) => [entry.symbol, entry.keyCaps]));
}
