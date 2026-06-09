/**
 * Theme contract for HandsScene.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * HandsScene — преимущественно layout-компонент. Единственный
 * визуальный декор — fill центральной точки на пальце-цели, который
 * сцена переключает через inter-component переменную `--center-point-fill`
 * (см. .hands-layer[data-center-point-visibility="VISIBLE"]).
 */
export const HANDS_SCENE_CONTRACT = [
  '--hands-center-point-fill', // fill для .finger-center-point когда сцена показывает её
] as const satisfies readonly `--${string}`[];

export type HandsSceneContractToken = (typeof HANDS_SCENE_CONTRACT)[number];
