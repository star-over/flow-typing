/**
 * Theme contract for the root layout (body element in app.css).
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * Эти токены также декларируются как fallback в `:root` (src/app.css)
 * — это нужно для тонкого окна между paint и inline-bootstrap-script
 * (см. src/app.html), который выставляет data-theme. Без fallback
 * body остался бы прозрачным/чёрным до применения темы.
 */
export const ROOT_CONTRACT = [
  '--body-background', // background-color document body
  '--body-color',      // color document body (default text color)
] as const satisfies readonly `--${string}`[];

export type RootContractToken = (typeof ROOT_CONTRACT)[number];
