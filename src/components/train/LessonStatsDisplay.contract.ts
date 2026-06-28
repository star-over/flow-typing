/**
 * Theme contract for LessonStatsDisplay.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * LessonStatsDisplay — карточка статистики урока с заголовком и сеткой
 * из 4 метрик (CPM/WPM/accuracy/duration). Каждая метрика — отдельный
 * вложенный блок со своим фоном.
 */
export const LESSON_STATS_DISPLAY_CONTRACT = [
  '--lesson-stats-display-background',      // background внешней карточки
  '--lesson-stats-display-border',          // border внешней карточки
  '--lesson-stats-display-item-background', // background каждого вложенного .stat-item
  '--lesson-stats-display-label-color',     // color подписи метрики
  '--lesson-stats-display-value-color',     // color числа метрики
  '--lesson-stats-display-unit-color',      // color единиц измерения после числа
] as const satisfies readonly `--${string}`[];

export type LessonStatsDisplayContractToken = (typeof LESSON_STATS_DISPLAY_CONTRACT)[number];
