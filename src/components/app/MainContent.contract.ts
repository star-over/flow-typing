/**
 * Theme contract for MainContent.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * MainContent отрисовывает вариативное содержимое экрана по состоянию
 * appMachine. Часть состояний имеет приглушённые тексты —
 * для них предусмотрены отдельные токены.
 */
export const MAIN_CONTENT_CONTRACT = [
  '--main-content-pause-color',   // color заголовка состояния паузы
  '--main-content-welcome-color', // color приветственного экрана меню
] as const satisfies readonly `--${string}`[];

export type MainContentContractToken = (typeof MAIN_CONTENT_CONTRACT)[number];
