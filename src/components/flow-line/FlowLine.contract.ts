/**
 * Theme contract for FlowLine.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * FlowLine рисует одиночный ряд символов потока ввода с курсором
 * посередине. Сама строка имеет постоянную внешнюю рамку, а её фон
 * меняется по pressResult (CORRECT/ERROR), сигнализируя результат
 * последнего ввода.
 */
export const FLOW_LINE_CONTRACT = [
  '--flow-line-border',             // border всей строки (2px solid …) — каркас input focus
  '--flow-line-correct-background', // background строки при pressResult=CORRECT
  '--flow-line-error-background',   // background строки при pressResult=ERROR
] as const satisfies readonly `--${string}`[];

export type FlowLineContractToken = (typeof FLOW_LINE_CONTRACT)[number];
