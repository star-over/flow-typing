/**
 * Theme contract for Select.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * Select — переопределённый <select>: своя стрелка через mask-image
 * (цвет тянется из background-color псевдоэлемента) и outline на :focus.
 */
export const SELECT_CONTRACT = [
  '--select-background',       // background самого <select>
  '--select-border',           // border <select> (1px solid …)
  '--select-color',            // color текста выбранной опции
  '--select-focus-outline',    // outline на :focus (2px solid …)
  '--select-arrow-background', // background-color для mask-based стрелки
] as const satisfies readonly `--${string}`[];

export type SelectContractToken = (typeof SELECT_CONTRACT)[number];
