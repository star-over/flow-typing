/**
 * Theme contract for Header.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * Header — лого-бренд и навигация (ссылки на Settings / Stats).
 */
export const HEADER_CONTRACT = [
  '--header-title-color',                 // color навигационных ссылок
  '--header-nav-link-hover-background',   // background nav-link при hover
] as const satisfies readonly `--${string}`[];

export type HeaderContractToken = (typeof HEADER_CONTRACT)[number];
