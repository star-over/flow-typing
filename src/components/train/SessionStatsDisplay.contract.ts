/**
 * Theme contract for SessionStatsDisplay.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * SessionStatsDisplay — карточка статистики сессии с заголовком и сеткой
 * из 4 метрик (CPM/WPM/accuracy/duration). Каждая метрика — отдельный
 * вложенный блок со своим фоном.
 */
export const SESSION_STATS_DISPLAY_CONTRACT = [
  '--session-stats-display-background',      // background внешней карточки
  '--session-stats-display-border',          // border внешней карточки
  '--session-stats-display-item-background', // background каждого вложенного .stat-item
  '--session-stats-display-label-color',     // color подписи метрики
  '--session-stats-display-value-color',     // color числа метрики
  '--session-stats-display-unit-color',      // color единиц измерения после числа
] as const satisfies readonly `--${string}`[];

export type SessionStatsDisplayContractToken = (typeof SESSION_STATS_DISPLAY_CONTRACT)[number];
