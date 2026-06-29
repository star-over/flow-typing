import { describe, expect, it } from 'vitest';

import type { KeyCapId, StreamSymbol, TypingStream } from '@/interfaces/types';
import { drillSummarize } from './drill-summarize';
import { needsRefill, planCheckpoint } from './session-queue';

const sym = (targetSymbol: string, key: KeyCapId): StreamSymbol => ({
  targetSymbol,
  targetKeyCaps: [key],
  attempts: [],
});

const THRESHOLD = 40;

describe('needsRefill', () => {
  it('хвост заметно выше порога → дозагрузка не нужна', () => {
    expect(needsRefill({ totalAppended: 100, completedCount: 0, threshold: THRESHOLD })).toBe(false);
  });

  it('хвост короче порога → пора дозагружать', () => {
    expect(needsRefill({ totalAppended: 5, completedCount: 0, threshold: THRESHOLD })).toBe(true);
  });

  it('+1-поправка курсора: на пороге+2 первое продвижение НЕ дозагружает (остаётся 41 > 40)', () => {
    // totalAppended − (completedCount + 1) = 42 − 1 = 41 > 40
    expect(needsRefill({ totalAppended: THRESHOLD + 2, completedCount: 0, threshold: THRESHOLD })).toBe(false);
  });

  it('+1-поправка курсора: следующее продвижение дозагружает (остаток упал бы до 40)', () => {
    // totalAppended − (completedCount + 1) = 42 − 2 = 40 ≤ 40
    expect(needsRefill({ totalAppended: THRESHOLD + 2, completedCount: 1, threshold: THRESHOLD })).toBe(true);
  });

  it('ровно на пороге (≤, не <) → дозагрузка нужна', () => {
    expect(needsRefill({ totalAppended: THRESHOLD + 1, completedCount: 0, threshold: THRESHOLD })).toBe(true);
  });
});

describe('planCheckpoint', () => {
  const completed: TypingStream = [sym('a', 'KeyA'), sym('b', 'KeyB'), sym('c', 'KeyC')];

  it('пустой отрезок (граница на хвосте) → null, сводить нечего', () => {
    expect(planCheckpoint({ completed, previousCheckpoint: completed.length })).toBeNull();
    expect(planCheckpoint({ completed: [], previousCheckpoint: 0 })).toBeNull();
  });

  it('весь поток от нуля → сводка всего среза, граница на длину', () => {
    const plan = planCheckpoint({ completed, previousCheckpoint: 0 });
    expect(plan).not.toBeNull();
    expect(plan!.nextCheckpoint).toBe(3);
    expect(plan!.summary).toEqual(drillSummarize(completed.slice(0)));
  });

  it('частичный отрезок [previousCheckpoint .. длина) → сводка только хвоста', () => {
    const plan = planCheckpoint({ completed, previousCheckpoint: 1 });
    expect(plan).not.toBeNull();
    expect(plan!.nextCheckpoint).toBe(3);
    expect(plan!.summary).toEqual(drillSummarize(completed.slice(1)));
  });
});
