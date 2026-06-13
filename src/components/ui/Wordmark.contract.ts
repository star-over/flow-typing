// cSpell:ignore yping
/**
 * Theme contract for Wordmark.svelte (логотип FlowTyping).
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * Wordmark — «буква в блочном курсоре»: F с засечкой home-ряда, Flow набрано,
 * T в инвертированном блочном курсоре, yping затухает.
 */
export const WORDMARK_CONTRACT = [
  '--wordmark-ink',              // color набранной части (Flow / F)
  '--wordmark-caret-background', // background блочного курсора (.caret)
  '--wordmark-caret-color',      // color символа внутри курсора
  '--wordmark-bar-background',   // background засечки home-ряда под F
  '--wordmark-pending-opacity',  // opacity предстоящей части (yping)
] as const satisfies readonly `--${string}`[];

export type WordmarkContractToken = (typeof WORDMARK_CONTRACT)[number];
