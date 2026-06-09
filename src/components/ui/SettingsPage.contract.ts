/**
 * Theme contract for SettingsPage.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * SettingsPage — экран настроек со списком полей и кнопкой возврата.
 * Кнопка-back имеет собственный набор токенов, отдельный от кнопок
 * FooterActions — у компонента свой контракт.
 *
 * Промежуточное состояние: до завершения рефакторинга экранов компонент
 * всё ещё называется `UserPreferencesPage.svelte` и потребляет токены
 * этого контракта. Файл будет переименован в `SettingsPage.svelte` при
 * переезде настроек на роут `/settings`.
 */
export const SETTINGS_PAGE_CONTRACT = [
  '--settings-page-label-color',         // color подписи поля
  '--settings-page-btn-background',      // background кнопки back
  '--settings-page-btn-color',           // color текста кнопки back
  '--settings-page-btn-border',          // border кнопки back
  '--settings-page-btn-hover-background',// background кнопки back на :hover
] as const satisfies readonly `--${string}`[];

export type SettingsPageContractToken = (typeof SETTINGS_PAGE_CONTRACT)[number];
