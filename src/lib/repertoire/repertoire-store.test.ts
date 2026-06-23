import { describe, expect, test } from 'vitest';
import { didStepGrow } from './repertoire-store.svelte';

describe('didStepGrow', () => {
  test('текущая ступень выше отметки старта → рост', () => {
    expect(didStepGrow({ startStep: 1, currentStep: 2 })).toBe(true);
  });
  test('равна или ниже → нет роста', () => {
    expect(didStepGrow({ startStep: 2, currentStep: 2 })).toBe(false);
    expect(didStepGrow({ startStep: null, currentStep: 2 })).toBe(false);
    expect(didStepGrow({ startStep: 2, currentStep: null })).toBe(false);
  });
});
