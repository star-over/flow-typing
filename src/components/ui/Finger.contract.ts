/**
 * Theme contract for Finger.svelte.
 *
 * Каждый токен в этом списке ОБЯЗАН быть декларирован в каждой теме
 * (`src/themes/<id>.css`) и в `_template.css`. Контракт-тест в
 * `src/themes/contract.test.ts` проверяет это.
 *
 * Принцип имён: токен соответствует ПОЛНОМУ значению CSS-свойства
 * (здесь — SVG `fill`) визуального элемента компонента.
 */
export const FINGER_CONTRACT = [
  // --- Per-position TARGET fill (12) ---
  // Цвет пальца, когда он указывает на текущую цель (navigationRole='TARGET').
  '--finger-l1-fill', '--finger-r1-fill',
  '--finger-l2-fill', '--finger-r2-fill',
  '--finger-l3-fill', '--finger-r3-fill',
  '--finger-l4-fill', '--finger-r4-fill',
  '--finger-l5-fill', '--finger-r5-fill',
  '--finger-lb-fill', '--finger-rb-fill',

  // --- States (3 общих) ---
  '--finger-inactive-fill', // соседний палец на активной руке
  '--finger-idle-fill',     // палец на неактивной руке (NONE/IDLE)
  '--finger-error-fill',    // палец, совершивший ошибочное нажатие
] as const satisfies readonly `--${string}`[];

export type FingerContractToken = (typeof FINGER_CONTRACT)[number];
