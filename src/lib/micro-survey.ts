/**
 * Чистая логика показа micro-survey (ADR 0013 — dumb UI логики не содержит).
 * «Показан» выводится из hasResponded (наличие строки surveyResponses), не из
 * отдельного флага. Спек: docs/superpowers/specs/2026-07-13-micro-survey-design.md.
 */
export const MICRO_SURVEY_SESSION_THRESHOLD = 3;

export function shouldShowMicroSurvey({
  sessionCount,
  hasResponded,
}: {
  sessionCount: number;
  hasResponded: boolean;
}): boolean {
  return sessionCount >= MICRO_SURVEY_SESSION_THRESHOLD && !hasResponded;
}
