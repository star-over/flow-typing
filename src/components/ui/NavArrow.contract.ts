/**
 * Theme contract for NavArrow.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * NavArrow — SVG-стрелка, отрисовываемая внутри KeyCap при
 * navigationRole='PATH'. Состоит из основной заливки, тонкой
 * вторичной заливки (визуально работающей как контур), и стопа
 * вертикального градиента.
 */
export const NAV_ARROW_CONTRACT = [
  '--nav-arrow-fill',           // fill основной заливки стрелки
  '--nav-arrow-outline',        // fill вторичного path (визуально — обводка)
  '--nav-arrow-gradient-start', // stop-color верхней точки linear gradient
] as const satisfies readonly `--${string}`[];

export type NavArrowContractToken = (typeof NAV_ARROW_CONTRACT)[number];
