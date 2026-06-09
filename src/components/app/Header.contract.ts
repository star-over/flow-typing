/**
 * Theme contract for Header.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * Header — заголовок страницы и debug-строка с подсветкой текущего
 * состояния машины.
 */
export const HEADER_CONTRACT = [
  '--header-title-color',      // color заголовка приложения
  '--header-debug-color',      // color debug-строки (подпись + значение)
  '--header-debug-background', // background <code class="value"> в debug-строке
] as const satisfies readonly `--${string}`[];

export type HeaderContractToken = (typeof HEADER_CONTRACT)[number];
