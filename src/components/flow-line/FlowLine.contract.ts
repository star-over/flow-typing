/**
 * Theme contract for FlowLine.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * FlowLine рисует одиночный ряд символов потока ввода с курсором
 * посередине. Дорожку держит тихий рельс (border-block: только верх и
 * низ), а фон строки меняется по pressResult (CORRECT/ERROR),
 * сигнализируя результат последнего ввода.
 */
export const FLOW_LINE_CONTRACT = [
  '--flow-line-border',             // рельс дорожки (2px solid, верх/низ) — каркас потока
  '--flow-line-correct-background', // background строки при pressResult=CORRECT
  '--flow-line-error-background',   // background строки при pressResult=ERROR
] as const satisfies readonly `--${string}`[];

export type FlowLineContractToken = (typeof FLOW_LINE_CONTRACT)[number];
