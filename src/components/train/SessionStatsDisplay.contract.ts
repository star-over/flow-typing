/**
 * Theme contract for SessionStatsDisplay.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * SessionStatsDisplay — карточка результатов сессии: точность-герой с
 * траекторией по прошлым сессиям, ниже сеткой ровность ритма (двойной
 * высоты), объём и темп. У каждой метрики — раскрываемое пояснение.
 *
 * Вложенных плиток со своим фоном больше нет (были — против «плоско по
 * умолчанию»): ячейки разделены линиями, поэтому вместо item-background
 * контракт несёт `divider`. Насыщенности здесь нет — иерархию несут размер,
 * вес и воздух, а цвет принадлежит визуализации движения (DESIGN.md,
 * правило тихого хрома).
 */
export const SESSION_STATS_DISPLAY_CONTRACT = [
  '--session-stats-display-background',            // background карточки
  '--session-stats-display-border',                // border карточки
  '--session-stats-display-divider',               // 1px линии между ярусами и ячейками
  '--session-stats-display-label-color',           // color подписи метрики
  '--session-stats-display-value-color',           // color числа метрики
  '--session-stats-display-unit-color',            // color единиц измерения после числа
  '--session-stats-display-note-color',            // color строки вывода, дельты, подписи траектории
  '--session-stats-display-trend-color',           // color линии траектории и точки-сегодня
  '--session-stats-display-info-border',           // border кнопки (i) в покое
  '--session-stats-display-info-color',            // color кнопки (i) в покое
  '--session-stats-display-info-hover-background', // background кнопки (i) под курсором
  '--session-stats-display-info-open-background',  // background кнопки (i) в раскрытом состоянии
  '--session-stats-display-info-open-color',       // color кнопки (i) в раскрытом состоянии
  '--session-stats-display-info-body-color',       // color текста пояснения
  '--session-stats-display-info-body-border',      // border-left полосы пояснения
  '--session-stats-display-link-color',            // color ссылки на подробную статистику
  '--session-stats-display-link-border',           // border-bottom ссылки в покое
  '--session-stats-display-link-hover-border',     // border-bottom ссылки под курсором
] as const satisfies readonly `--${string}`[];

export type SessionStatsDisplayContractToken = (typeof SESSION_STATS_DISPLAY_CONTRACT)[number];
