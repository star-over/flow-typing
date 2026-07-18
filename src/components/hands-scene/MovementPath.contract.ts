/**
 * Theme contract for MovementPath.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая тема
 * декларирует токены из этого списка.
 *
 * MovementPath — анимация «визуализации движения»: маркер-кончик едет по пути дом→цель
 * со следом, у цели пульсирует и от него расходится кольцо («тап»). Насыщенность несёт
 * смысл (маршрут / какой палец), а не украшение — это ядро продукта.
 *
 * - `--movement-path-guide` — цвет тусклой линии-маршрута дом→цель (индиго пути).
 * - `--movement-path-<pos>-marker` — цвет движения для позиции `<pos>` (L1…R5): им
 *   красятся след, кольцо тапа, гало и ободок точки. Все темы красят движение оттенком
 *   пальца-владельца — маршрут и цель несут идентичность пальца, различает форма, а не
 *   цвет (ADR 0028, поправил «единый холодный маршрут» из ADR 0026); в sepia это пять
 *   маршрутных оттенков `--color-route-1…5` по номеру пальца.
 * - `--movement-path-marker-core` — цвет ТЕЛА сферической бусины-ядра бегущей точки.
 *   Компонент выводит из него блик и терминатор через `oklch(from …)`, давая объём
 *   (единственный вырез из «плоско» — фокусу движения, см. DESIGN §1). Материал — за темой:
 *   нейтральная бусина (бронза на светлых / жемчужина на тёмных / чернильное ядро `--ink`
 *   в sepia). Контрастно фону; тело ядра нейтрально — идентичность пальца несёт ободок
 *   (`--movement-path-<pos>-marker`), не ядро.
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
  '--movement-path-marker-core',
] as const satisfies readonly `--${string}`[];

export type MovementPathContractToken = (typeof MOVEMENT_PATH_CONTRACT)[number];
