/**
 * Theme contract for SignInScreen.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * SignInScreen — экран входа с кнопкой «Войти через GitHub» и предупреждением
 * о привязке прогресса к провайдеру.
 */
export const SIGN_IN_SCREEN_CONTRACT = [
  '--sign-in-screen-background',             // background контейнера экрана
  '--sign-in-screen-title-color',            // color заголовка
  '--sign-in-screen-disclaimer-color',       // color текста предупреждения
  '--sign-in-screen-btn-github-background',  // background кнопки GitHub
  '--sign-in-screen-btn-github-color',       // color текста кнопки GitHub
  '--sign-in-screen-btn-github-border',      // border кнопки GitHub
  '--sign-in-screen-btn-github-hover-background', // background кнопки GitHub при hover
] as const satisfies readonly `--${string}`[];

export type SignInScreenToken = (typeof SIGN_IN_SCREEN_CONTRACT)[number];
