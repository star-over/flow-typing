import { describe, expect, test } from 'vitest';
import { shouldShowMicroSurvey, MICRO_SURVEY_SESSION_THRESHOLD } from './micro-survey';

describe('shouldShowMicroSurvey', () => {
  test('порог — 3 тренировки', () => {
    expect(MICRO_SURVEY_SESSION_THRESHOLD).toBe(3);
  });
  test('не показываем до порога', () => {
    expect(shouldShowMicroSurvey({ sessionCount: 0, hasResponded: false })).toBe(false);
    expect(shouldShowMicroSurvey({ sessionCount: 2, hasResponded: false })).toBe(false);
  });
  test('показываем на 3-й, если ещё не отвечал', () => {
    expect(shouldShowMicroSurvey({ sessionCount: 3, hasResponded: false })).toBe(true);
    expect(shouldShowMicroSurvey({ sessionCount: 9, hasResponded: false })).toBe(true);
  });
  test('не показываем, если уже отвечал/закрывал', () => {
    expect(shouldShowMicroSurvey({ sessionCount: 5, hasResponded: true })).toBe(false);
  });
});
