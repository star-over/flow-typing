import { describe, expect, test } from 'vitest';
import {
  assertValidSessionSummary,
  assertValidDrillPerSymbol,
  assertValidSettingsInput,
} from './validation';

// Форма сводки sessions.record (все поля персистятся в sessionSummaries → все
// валидируются). Базовый валидный экземпляр, вариации мутируют одно поле.
const validSummary = {
  exposures: 200,
  clean: 190,
  cpm: 200,
  durationMs: 60_000,
  latencyMedianMs: 250,
  rhythm: 82,
  confusions: [{ target: 'г', pressed: 'KeyR', count: 10 }],
};

describe('assertValidSessionSummary', () => {
  test('валидная сводка проходит без throw', () => {
    expect(() => assertValidSessionSummary(validSummary)).not.toThrow();
  });

  test('rhythm можно опустить (optional-поле)', () => {
    const { rhythm: _omit, ...withoutRhythm } = validSummary;
    expect(() => assertValidSessionSummary(withoutRhythm)).not.toThrow();
  });

  test('отрицательные exposures → throw', () => {
    expect(() => assertValidSessionSummary({ ...validSummary, exposures: -1 })).toThrow(/exposures/i);
  });

  test('clean > exposures → throw (логический инвариант)', () => {
    expect(() => assertValidSessionSummary({ ...validSummary, clean: 201 })).toThrow(/clean/i);
  });

  test('нецелые exposures → throw (счётчик)', () => {
    expect(() => assertValidSessionSummary({ ...validSummary, exposures: 5.5, clean: 5 })).toThrow(/exposures/i);
  });

  test('Infinity cpm → throw (конечность, не только «это число»)', () => {
    expect(() => assertValidSessionSummary({ ...validSummary, cpm: Infinity })).toThrow(/cpm/i);
  });

  test('гигантские exposures → throw (потолок)', () => {
    expect(() => assertValidSessionSummary({ ...validSummary, exposures: 1e12, clean: 0 })).toThrow(/exposures/i);
  });

  test('NaN durationMs → throw', () => {
    expect(() => assertValidSessionSummary({ ...validSummary, durationMs: NaN })).toThrow(/duration/i);
  });

  test('отрицательный latencyMedianMs → throw', () => {
    expect(() => assertValidSessionSummary({ ...validSummary, latencyMedianMs: -10 })).toThrow(/latency/i);
  });

  test('rhythm вне [0,100] → throw', () => {
    expect(() => assertValidSessionSummary({ ...validSummary, rhythm: 150 })).toThrow(/rhythm/i);
  });

  test('отрицательный confusion count → throw', () => {
    expect(() =>
      assertValidSessionSummary({ ...validSummary, confusions: [{ target: 'г', pressed: 'KeyR', count: -3 }] })
    ).toThrow(/confusion/i);
  });
});

// perSymbol drillRecord — единственное, что персистится (overall не хранится).
const validPerSymbol = [
  { symbol: 'а', exposures: 2, clean: 1, latencies: [100, 200] },
  { symbol: 'о', exposures: 3, clean: 3, latencies: [] },
];

describe('assertValidDrillPerSymbol', () => {
  test('валидный perSymbol проходит без throw', () => {
    expect(() => assertValidDrillPerSymbol(validPerSymbol)).not.toThrow();
  });

  test('пустой массив проходит (нет предъявлений)', () => {
    expect(() => assertValidDrillPerSymbol([])).not.toThrow();
  });

  test('отрицательные exposures → throw', () => {
    expect(() =>
      assertValidDrillPerSymbol([{ symbol: 'а', exposures: -1, clean: 0, latencies: [] }])
    ).toThrow(/exposures/i);
  });

  test('clean > exposures → throw', () => {
    expect(() =>
      assertValidDrillPerSymbol([{ symbol: 'а', exposures: 1, clean: 5, latencies: [] }])
    ).toThrow(/clean/i);
  });

  test('нецелые exposures → throw', () => {
    expect(() =>
      assertValidDrillPerSymbol([{ symbol: 'а', exposures: 2.5, clean: 1, latencies: [] }])
    ).toThrow(/exposures/i);
  });

  test('отрицательная латентность → throw', () => {
    expect(() =>
      assertValidDrillPerSymbol([{ symbol: 'а', exposures: 1, clean: 1, latencies: [-50] }])
    ).toThrow(/latency/i);
  });

  test('Infinity в латентностях → throw', () => {
    expect(() =>
      assertValidDrillPerSymbol([{ symbol: 'а', exposures: 1, clean: 1, latencies: [Infinity] }])
    ).toThrow(/latency/i);
  });

  test('гигантские exposures → throw (потолок)', () => {
    expect(() =>
      assertValidDrillPerSymbol([{ symbol: 'а', exposures: 1e12, clean: 0, latencies: [] }])
    ).toThrow(/exposures/i);
  });
});

describe('assertValidSettingsInput', () => {
  const validSettings = { displayName: 'Alice', sessionDurationSeconds: 300 };

  test('валидные настройки проходят без throw', () => {
    expect(() => assertValidSettingsInput(validSettings)).not.toThrow();
  });

  test('пустой displayName проходит (сброс к имени провайдера)', () => {
    expect(() => assertValidSettingsInput({ ...validSettings, displayName: '' })).not.toThrow();
  });

  test('displayName длиннее потолка → throw', () => {
    expect(() =>
      assertValidSettingsInput({ ...validSettings, displayName: 'x'.repeat(101) })
    ).toThrow(/displayName/i);
  });

  test('sessionDurationSeconds ниже минимума → throw', () => {
    expect(() =>
      assertValidSettingsInput({ ...validSettings, sessionDurationSeconds: 10 })
    ).toThrow(/duration/i);
  });

  test('sessionDurationSeconds выше максимума → throw', () => {
    expect(() =>
      assertValidSettingsInput({ ...validSettings, sessionDurationSeconds: 100_000 })
    ).toThrow(/duration/i);
  });

  test('NaN sessionDurationSeconds → throw', () => {
    expect(() =>
      assertValidSettingsInput({ ...validSettings, sessionDurationSeconds: NaN })
    ).toThrow(/duration/i);
  });
});
