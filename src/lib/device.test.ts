import { afterEach, describe, expect, it, vi } from 'vitest';
import { TOUCH_ONLY_QUERY, isTouchOnlyDevice } from './device';

/**
 * Подменяет глобальный `matchMedia` так, что запрос-аргумент `matches` === true
 * только когда он совпадает с одним из переданных «истинных» запросов.
 */
function stubMatchMedia(matchingQueries: string[]) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matchingQueries.includes(query),
    media: query,
  }));
}

describe('isTouchOnlyDevice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('true для тач-первичного устройства без наведения', () => {
    stubMatchMedia([TOUCH_ONLY_QUERY]);
    expect(isTouchOnlyDevice()).toBe(true);
  });

  it('false, когда запрос не совпадает (десктоп с мышью)', () => {
    stubMatchMedia([]);
    expect(isTouchOnlyDevice()).toBe(false);
  });

  it('false в окружении без matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(isTouchOnlyDevice()).toBe(false);
  });
});
