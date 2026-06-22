import { describe, expect, test } from 'vitest';
import { getLayoutData } from './layout-data';

describe('getLayoutData', () => {
  test('известная раскладка → symbolLayout + keyLadder', () => {
    const data = getLayoutData('йцукен');
    expect(data).not.toBeNull();
    expect(data?.keyLadder.symbolLayoutId).toBe('йцукен');
    expect(data?.symbolLayout.some((e) => e.symbol === 'а')).toBe(true);
  });
  test('неизвестная раскладка → null (без throw)', () => {
    expect(getLayoutData('unknown')).toBeNull();
  });
});
