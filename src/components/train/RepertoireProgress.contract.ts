/**
 * Theme contract for RepertoireProgress.svelte — блок прогресса ступени в
 * sessionComplete. Контракт-тест (src/themes/contract.test.ts) требует токены
 * в каждой теме.
 */
export const REPERTOIRE_PROGRESS_CONTRACT = [
  '--repertoire-progress-background',
  '--repertoire-progress-border',
  '--repertoire-progress-label-color',
  '--repertoire-progress-value-color',
  '--repertoire-progress-bar-track',
  '--repertoire-progress-bar-fill',
  '--repertoire-progress-accent-color',
] as const satisfies readonly `--${string}`[];

export type RepertoireProgressContractToken = (typeof REPERTOIRE_PROGRESS_CONTRACT)[number];
