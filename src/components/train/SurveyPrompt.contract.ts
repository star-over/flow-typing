/**
 * Theme contract for SurveyPrompt.svelte — micro-survey в sessionComplete.
 * Контракт-тест (src/themes/contract.test.ts) требует токены в каждой теме.
 */
export const SURVEY_PROMPT_CONTRACT = [
  '--survey-prompt-background',
  '--survey-prompt-border',
  '--survey-prompt-question-color',
  '--survey-prompt-button-background',
  '--survey-prompt-button-border',
  '--survey-prompt-button-color',
  '--survey-prompt-button-hover-background',
  '--survey-prompt-thanks-color',
  '--survey-prompt-dismiss-color',
] as const satisfies readonly `--${string}`[];

export type SurveyPromptContractToken = (typeof SURVEY_PROMPT_CONTRACT)[number];
