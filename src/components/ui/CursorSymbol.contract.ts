/**
 * Theme contract for CursorSymbol.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * CursorSymbol — блок-курсор на текущей позиции во FlowLine; единственный
 * символ ряда, у которого фон/текст инвертированы относительно строки.
 */
export const CURSOR_SYMBOL_CONTRACT = [
  '--cursor-symbol-background', // background .bar (блок курсора)
  '--cursor-symbol-color',      // color .char (символ внутри курсора)
] as const satisfies readonly `--${string}`[];

export type CursorSymbolContractToken = (typeof CURSOR_SYMBOL_CONTRACT)[number];
