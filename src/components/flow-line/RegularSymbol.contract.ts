/**
 * Theme contract for RegularSymbol.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * RegularSymbol — отдельный символ в ряду FlowLine, цвет зависит от
 * статуса в потоке (FlowLineSymbolType): PENDING → CORRECT | CORRECTED |
 * ONE_ERROR | MANY_ERRORS.
 */
export const REGULAR_SYMBOL_CONTRACT = [
  '--regular-symbol-pending-color',        // ещё не введён
  '--regular-symbol-correct-color',        // введён правильно с первой попытки
  '--regular-symbol-corrected-color',      // введён после исправления ошибки
  '--regular-symbol-one-error-color',      // текущая ошибка (одна попытка)
  '--regular-symbol-many-errors-color',    // повторные ошибки на одном символе
] as const satisfies readonly `--${string}`[];

export type RegularSymbolContractToken = (typeof REGULAR_SYMBOL_CONTRACT)[number];
