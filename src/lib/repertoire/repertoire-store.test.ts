import { describe, expect, test } from 'vitest';
import { didOpenedStepsGrow } from './repertoire-store.svelte';

describe('didOpenedStepsGrow', () => {
  test('текущие openedSteps выше отметки старта → рост', () => {
    expect(didOpenedStepsGrow({ startOpenedSteps: 1, currentOpenedSteps: 2 })).toBe(true);
  });
  test('равны или ниже → нет роста', () => {
    expect(didOpenedStepsGrow({ startOpenedSteps: 2, currentOpenedSteps: 2 })).toBe(false);
    expect(didOpenedStepsGrow({ startOpenedSteps: null, currentOpenedSteps: 2 })).toBe(false);
    expect(didOpenedStepsGrow({ startOpenedSteps: 2, currentOpenedSteps: null })).toBe(false);
  });
});
