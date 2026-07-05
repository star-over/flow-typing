/**
 * Theme contract for MovementPath.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая тема
 * декларирует токены из этого списка.
 *
 * MovementPath — анимация «визуализации движения»: маркер-кончик пальца едет по
 * пути дом→цель со следом, у цели пульсирует и от него расходится кольцо («тап»).
 * Насыщенность здесь несёт смысл (путь / какой палец), а не украшение — это ядро
 * продукта, ему цвет и отдан (правило «тихого хрома» не нарушается, как у пальцев).
 *
 * - `--movement-path-guide` — цвет тусклой линии-маршрута дом→цель (индиго пути).
 * - `--movement-path-<pos>-marker` — цвет движения для пальца `<pos>` (L1…R5): им
 *   красятся след, точка-кончик и кольцо тапа. Спектр пальцев (DESIGN).
 * - `--movement-path-marker-edge` — контур точки (highlight), тема-зависимый: держит
 *   край точки поверх заливки клавиши на любой теме.
 */
export const MOVEMENT_PATH_CONTRACT = [
  '--movement-path-guide',
  '--movement-path-l1-marker',
  '--movement-path-r1-marker',
  '--movement-path-l2-marker',
  '--movement-path-r2-marker',
  '--movement-path-l3-marker',
  '--movement-path-r3-marker',
  '--movement-path-l4-marker',
  '--movement-path-r4-marker',
  '--movement-path-l5-marker',
  '--movement-path-r5-marker',
  '--movement-path-marker-edge',
] as const satisfies readonly `--${string}`[];

export type MovementPathContractToken = (typeof MOVEMENT_PATH_CONTRACT)[number];
