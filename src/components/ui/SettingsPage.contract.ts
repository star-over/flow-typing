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
 * Компонент `SettingsPage.svelte` рендерится на роуте `/settings`.
 */
export const SETTINGS_PAGE_CONTRACT = [
  '--settings-page-label-color',         // color подписи поля
  '--settings-page-input-background',    // background текстового поля (display name)
  '--settings-page-input-color',         // color текста в текстовом поле
  '--settings-page-input-border',        // border текстового поля
  '--settings-page-btn-background',      // background кнопки back
  '--settings-page-btn-color',           // color текста кнопки back
  '--settings-page-btn-border',          // border кнопки back
  '--settings-page-btn-hover-background',// background кнопки back на :hover
  // Danger-зона: удаление аккаунта (P0-4). Destructive-кнопка + предупреждение.
  '--settings-page-danger-btn-background',      // background кнопки удаления/подтверждения
  '--settings-page-danger-btn-color',           // color текста destructive-кнопки
  '--settings-page-danger-btn-border',          // border destructive-кнопки
  '--settings-page-danger-btn-hover-background', // background destructive-кнопки на :hover
  '--settings-page-danger-text-color',          // color текста-предупреждения
] as const satisfies readonly `--${string}`[];

export type SettingsPageContractToken = (typeof SETTINGS_PAGE_CONTRACT)[number];
