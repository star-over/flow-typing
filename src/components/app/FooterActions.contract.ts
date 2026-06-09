/**
 * Theme contract for FooterActions.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * FooterActions содержит группу кнопок-действий с пятью визуальными
 * вариантами: default + primary | success | warning | danger.
 * Каждый вариант имеет полный набор background/color/border.
 */
export const FOOTER_ACTIONS_CONTRACT = [
  // --- Default btn ---
  '--footer-actions-btn-background',
  '--footer-actions-btn-color',
  '--footer-actions-btn-border',
  '--footer-actions-btn-hover-background',

  // --- Variant: primary ---
  '--footer-actions-btn-primary-background',
  '--footer-actions-btn-primary-color',
  '--footer-actions-btn-primary-border',

  // --- Variant: success ---
  '--footer-actions-btn-success-background',
  '--footer-actions-btn-success-color',
  '--footer-actions-btn-success-border',

  // --- Variant: warning ---
  '--footer-actions-btn-warning-background',
  '--footer-actions-btn-warning-color',
  '--footer-actions-btn-warning-border',

  // --- Variant: danger ---
  '--footer-actions-btn-danger-background',
  '--footer-actions-btn-danger-color',
  '--footer-actions-btn-danger-border',
] as const satisfies readonly `--${string}`[];

export type FooterActionsContractToken = (typeof FOOTER_ACTIONS_CONTRACT)[number];
