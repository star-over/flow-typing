// shared/drill-selection/random-pick.test.ts
import { describe, expect, test } from 'vitest';
import { makeSeededRandom, nextDistinctOffset } from './random-pick.ts';

describe('makeSeededRandom', () => {
  test('один seed → идентичная последовательность', () => {
    const a = makeSeededRandom(42);
    const b = makeSeededRandom(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
  test('значения в [0, 1)', () => {
    const r = makeSeededRandom(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  test('разные seed → разный первый бросок', () => {
    expect(makeSeededRandom(1)()).not.toBe(makeSeededRandom(2)());
  });
});

describe('nextDistinctOffset', () => {
  test('возвращает offset в [0, count) и не повторяет', () => {
    const rng = makeSeededRandom(99);
    const used = new Set<number>();
    const offsets: number[] = [];
    for (let i = 0; i < 5; i++) {
      const o = nextDistinctOffset({ rng, count: 5, used });
      expect(o).not.toBeNull();
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThan(5);
      offsets.push(o!);
    }
    expect(new Set(offsets).size).toBe(5); // перестановка без повторов
  });
  test('исчерпание пула → null', () => {
    const rng = makeSeededRandom(3);
    const used = new Set<number>([0, 1, 2]);
    expect(nextDistinctOffset({ rng, count: 3, used })).toBeNull();
  });
  test('детерминизм: один seed → один порядок offsets', () => {
    const draw = (seed: number) => {
      const rng = makeSeededRandom(seed);
      const used = new Set<number>();
      return [0, 1, 2, 3].map(() => nextDistinctOffset({ rng, count: 4, used }));
    };
    expect(draw(123)).toEqual(draw(123));
  });
});
