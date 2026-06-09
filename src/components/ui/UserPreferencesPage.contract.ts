/**
 * Theme contract for UserPreferencesPage.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * UserPreferencesPage — экран настроек со списком полей и кнопкой
 * возврата. Кнопка-back имеет собственный набор токенов, отдельный от
 * кнопок FooterActions — у компонента свой контракт.
 */
export const USER_PREFERENCES_PAGE_CONTRACT = [
  '--user-preferences-page-label-color',         // color подписи поля
  '--user-preferences-page-btn-background',      // background кнопки back
  '--user-preferences-page-btn-color',           // color текста кнопки back
  '--user-preferences-page-btn-border',          // border кнопки back
  '--user-preferences-page-btn-hover-background',// background кнопки back на :hover
] as const satisfies readonly `--${string}`[];

export type UserPreferencesPageContractToken = (typeof USER_PREFERENCES_PAGE_CONTRACT)[number];
