/**
 * Theme contract for LandingScreen.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая тема
 * (`src/themes/<id>.css`) и `_template.css` декларируют эти токены.
 *
 * LandingScreen — экран на роуте `/`: long-scroll лендинг (hero с живой
 * демо-визуализацией движения, «как это работает», философия-контраст,
 * финальный CTA). Бренд-акцент CTA — фирменный янтарь, тот же
 * `--color-target-marker`, что красит «T» в Wordmark. Спектр пальцев играет
 * только внутри демо-сцены (через токены KeyCap/Finger), в макете лендинга его нет.
 */
export const LANDING_CONTRACT = [
  '--landing-cta-background',       // background primary-CTA
  '--landing-cta-color',            // color текста CTA (тёмный на янтаре)
  '--landing-cta-border',           // border CTA
  '--landing-cta-hover-background', // background CTA на :hover
  '--landing-muted-color',          // вторичный текст (tagline, body секций)
  '--landing-rule',                 // полный border тонких разделителей секций
  '--landing-demo-path',            // stroke пути движения в демо-сцене + мотивы принципов
  '--landing-demo-surface',         // фон-панель под клавиатурой демо-сцены
] as const satisfies readonly `--${string}`[];

export type LandingContractToken = (typeof LANDING_CONTRACT)[number];
