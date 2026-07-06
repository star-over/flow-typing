/**
 * Theme contract for KeyCap.svelte.
 *
 * Каждый токен в этом списке ОБЯЗАН быть декларирован в каждой теме
 * (`src/themes/<id>.css`) и в `_template.css`. Контракт-тест в
 * `src/themes/contract.test.ts` проверяет это.
 *
 * Принцип имён: токен соответствует ПОЛНОМУ значению CSS-свойства
 * визуального элемента компонента, не "цвету чего-то". Например,
 * `--keycap-l2-border` несёт `1px solid oklch(...)` целиком — тема
 * вольна задать `2px dashed ...`, если захочет.
 *
 * Тема внутри себя может использовать произвольные `--*` переменные
 * (палитра, формулы `oklch(from ...)`, `color-mix(...)`) — это её
 * внутренняя кухня, контракт о ней не знает.
 */
export const KEYCAP_CONTRACT = [
  // --- Base ---
  '--keycap-color', // color для клавиш без data-finger-id
  '--keycap-marker-background', // background маркера .keycap-marker (home dot/bar)
  '--keycap-home-ring', // box-shadow для .home (тонкое кольцо домашних клавиш)
  '--keycap-path-ring', // box-shadow для .role-path (кольцо клавиш на пути пальца)

  // --- Per-position fill/border/color (10 × 3 = 30) ---
  // Заливка / обводка / текст клавиши по позиции пальца.
  '--keycap-l1-background', '--keycap-l1-border', '--keycap-l1-color',
  '--keycap-r1-background', '--keycap-r1-border', '--keycap-r1-color',
  '--keycap-l2-background', '--keycap-l2-border', '--keycap-l2-color',
  '--keycap-r2-background', '--keycap-r2-border', '--keycap-r2-color',
  '--keycap-l3-background', '--keycap-l3-border', '--keycap-l3-color',
  '--keycap-r3-background', '--keycap-r3-border', '--keycap-r3-color',
  '--keycap-l4-background', '--keycap-l4-border', '--keycap-l4-color',
  '--keycap-r4-background', '--keycap-r4-border', '--keycap-r4-color',
  '--keycap-l5-background', '--keycap-l5-border', '--keycap-l5-color',
  '--keycap-r5-background', '--keycap-r5-border', '--keycap-r5-color',

  // --- Per-position target (10 × 3 = 30) ---
  // Состояние "эта клавиша сейчас цель" (navigationRole='TARGET').
  // Перекрывает per-position background/color, добавляет ring (box-shadow).
  '--keycap-l1-target-background', '--keycap-l1-target-color', '--keycap-l1-target-ring',
  '--keycap-r1-target-background', '--keycap-r1-target-color', '--keycap-r1-target-ring',
  '--keycap-l2-target-background', '--keycap-l2-target-color', '--keycap-l2-target-ring',
  '--keycap-r2-target-background', '--keycap-r2-target-color', '--keycap-r2-target-ring',
  '--keycap-l3-target-background', '--keycap-l3-target-color', '--keycap-l3-target-ring',
  '--keycap-r3-target-background', '--keycap-r3-target-color', '--keycap-r3-target-ring',
  '--keycap-l4-target-background', '--keycap-l4-target-color', '--keycap-l4-target-ring',
  '--keycap-r4-target-background', '--keycap-r4-target-color', '--keycap-r4-target-ring',
  '--keycap-l5-target-background', '--keycap-l5-target-color', '--keycap-l5-target-ring',
  '--keycap-r5-target-background', '--keycap-r5-target-color', '--keycap-r5-target-ring',

  // --- Press result CORRECT (общий, перекрывает позицию) ---
  '--keycap-correct-background',
  '--keycap-correct-color',
  '--keycap-correct-border',
  '--keycap-correct-ring', // box-shadow: кольцо CORRECT-клавиши зелёное (перекрывает target-ring)

  // --- Press result ERROR (общий, перекрывает позицию) ---
  '--keycap-error-background',
  '--keycap-error-color',
  '--keycap-error-border',
] as const satisfies readonly `--${string}`[];

export type KeyCapContractToken = (typeof KEYCAP_CONTRACT)[number];
