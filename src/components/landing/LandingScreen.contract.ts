/**
 * Theme contract for LandingScreen.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая тема
 * (`src/themes/<id>.css`) и `_template.css` декларируют эти токены.
 *
 * LandingScreen — экран на роуте `/`: hero + tagline + primary-CTA «Начать
 * тренировку». Тематизируется только CTA (hero/tagline берут наследуемый цвет
 * текста). Бренд-акцент CTA — фирменный янтарь, тот же `--color-target-marker`,
 * что красит «T» в Wordmark.
 */
export const LANDING_CONTRACT = [
  '--landing-cta-background',       // background primary-CTA
  '--landing-cta-color',            // color текста CTA (тёмный на янтаре)
  '--landing-cta-border',           // border CTA
  '--landing-cta-hover-background', // background CTA на :hover
] as const satisfies readonly `--${string}`[];

export type LandingContractToken = (typeof LANDING_CONTRACT)[number];
