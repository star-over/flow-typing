import { describe, expect, test } from 'vitest';
import { getLayoutData } from './layoutData';

describe('getLayoutData', () => {
  test('известная раскладка → symbolLayout с шагами (ladderStep)', () => {
    const data = getLayoutData('йцукен');
    expect(data).not.toBeNull();
    expect(data?.symbolLayout.some((e) => e.symbol === 'а')).toBe(true);
    // Шаг открытия живёт на символе (ADR 0020): у каждой записи есть ladderStep.
    expect(data?.symbolLayout.every((e) => Number.isInteger(e.ladderStep))).toBe(true);
  });
  test('неизвестная раскладка → null (без throw)', () => {
    expect(getLayoutData('unknown')).toBeNull();
  });
});
