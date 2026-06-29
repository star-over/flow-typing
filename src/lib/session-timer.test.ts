import { describe, expect, it } from 'vitest';

import { commitSegment, isExpired, liveElapsed } from './session-timer';

const WINDOW = 60_000;

describe('liveElapsed', () => {
  it('складывает зафиксированный аккумулятор с текущим незакрытым сегментом', () => {
    expect(liveElapsed({ elapsedMs: 5_000, segmentStartedAt: 1_000, now: 4_000 })).toBe(8_000);
  });

  it('на свежем сегменте (elapsedMs=0) равен длине сегмента', () => {
    expect(liveElapsed({ elapsedMs: 0, segmentStartedAt: 10_000, now: 13_500 })).toBe(3_500);
  });

  it('НЕ зажимается окном (зажим — забота commitSegment)', () => {
    expect(liveElapsed({ elapsedMs: 0, segmentStartedAt: 0, now: 90_000 })).toBe(90_000);
  });
});

describe('commitSegment', () => {
  it('ниже окна — отдаёт живое прошедшее без изменений', () => {
    expect(commitSegment({ elapsedMs: 10_000, segmentStartedAt: 0, now: 20_000, windowMs: WINDOW })).toBe(30_000);
  });

  it('выше окна — зажимает ровно в окно (никаких «61 с»)', () => {
    expect(commitSegment({ elapsedMs: 0, segmentStartedAt: 0, now: 70_000, windowMs: WINDOW })).toBe(WINDOW);
  });

  it('ровно на окне — окно', () => {
    expect(commitSegment({ elapsedMs: 0, segmentStartedAt: 0, now: WINDOW, windowMs: WINDOW })).toBe(WINDOW);
  });
});

describe('isExpired', () => {
  it('ложно до окна', () => {
    expect(isExpired({ elapsedMs: 0, segmentStartedAt: 0, now: 59_999, windowMs: WINDOW })).toBe(false);
  });

  it('истинно ровно на окне (граница включительно)', () => {
    expect(isExpired({ elapsedMs: 0, segmentStartedAt: 0, now: WINDOW, windowMs: WINDOW })).toBe(true);
  });

  it('истинно за окном — ловит истечение и в незакрытом сегменте', () => {
    expect(isExpired({ elapsedMs: 30_000, segmentStartedAt: 0, now: 31_000, windowMs: WINDOW })).toBe(true);
  });
});
