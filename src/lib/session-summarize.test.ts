// src/lib/session-summarize.test.ts
import { describe, expect, test } from 'vitest';
import {
  sessionSummarize,
  shouldJournalSession,
  MAX_CONFUSIONS,
  MIN_RHYTHM_INTERVALS,
  rhythmConsistency,
  type SessionSummaryPayload,
} from './session-summarize';
import { MIN_JOURNAL_EXPOSURES } from './session-config';
import type { StreamSymbol } from '@/interfaces/types';
import { press, streamSymbol } from '@/fixtures/stream';

describe('sessionSummarize', () => {
  test('confusion: первый промах учитывается с направлением (target → pressed)', () => {
    const out = sessionSummarize({
      stream: [streamSymbol('a', ['KeyA'], [press(['KeyS']), press(['KeyA'])])],
      durationMs: 60000,
    });
    expect(out.exposures).toBe(1);
    expect(out.clean).toBe(0);
    expect(out.confusions).toEqual([{ target: 'a', pressed: 'KeyS', count: 1 }]);
  });

  test('чистое нажатие не даёт confusion', () => {
    const out = sessionSummarize({
      stream: [streamSymbol('h', ['KeyH'], [press(['KeyH'])])],
      durationMs: 60000,
    });
    expect(out.clean).toBe(1);
    expect(out.confusions).toEqual([]);
  });

  test('confusion игнорирует сочетания клавиш и пустые нажатия (V1 — только одиночные)', () => {
    const out = sessionSummarize({
      stream: [
        streamSymbol('я', ['KeyZ'], [press(['KeyZ', 'ShiftLeft']), press(['KeyZ'])]), // сочетание клавиш как промах
        streamSymbol('ф', ['KeyA'], [press([]), press(['KeyA'])]), // пустое нажатие
      ],
      durationMs: 60000,
    });
    expect(out.confusions).toEqual([]);
  });

  test('cpm = exposures / минуты (durationMs из активного времени)', () => {
    const out = sessionSummarize({
      stream: [streamSymbol('a', ['KeyA'], [press(['KeyA'])]), streamSymbol('b', ['KeyB'], [press(['KeyB'])])],
      durationMs: 30000, // полминуты → cpm = 2 / 0.5 = 4
    });
    expect(out.cpm).toBe(4);
    expect(out.durationMs).toBe(30000);
  });

  test('cpm = 0 при крошечной длительности (durationMs < 1000) — не делим на ~ноль', () => {
    const out = sessionSummarize({
      stream: [streamSymbol('a', ['KeyA'], [press(['KeyA'])])],
      durationMs: 500,
    });
    expect(out.cpm).toBe(0);
  });

  test('confusions отсортированы по убыванию count и обрезаны до MAX_CONFUSIONS', () => {
    const stream: StreamSymbol[] = [];
    // 'a' не попадёт трижды в 'KeyS' (один пул), плюс 21 разных целей по разу.
    for (let i = 0; i < 3; i += 1) stream.push(streamSymbol('a', ['KeyA'], [press(['KeyS']), press(['KeyA'])]));
    for (let i = 0; i < 21; i += 1) {
      const sym = String.fromCharCode(0x430 + i); // кириллица а,б,в… как уникальные цели
      stream.push(streamSymbol(sym, ['KeyZ'], [press(['KeyX']), press(['KeyZ'])]));
    }
    const out = sessionSummarize({ stream, durationMs: 60000 });
    expect(out.confusions.length).toBe(MAX_CONFUSIONS);
    expect(out.confusions[0]).toEqual({ target: 'a', pressed: 'KeyS', count: 3 }); // самый частый — первым
  });
});

describe('rhythmConsistency', () => {
  test('ровный ритм → 100%', () => {
    expect(rhythmConsistency([200, 200, 200, 200, 200])).toBe(100);
  });

  test('CV = 0.5 (интервалы 100/300) → 50%', () => {
    expect(rhythmConsistency([100, 300, 100, 300, 100, 300])).toBe(50);
  });

  test('меньше MIN_RHYTHM_INTERVALS → undefined (недостоверно)', () => {
    expect(rhythmConsistency(new Array(MIN_RHYTHM_INTERVALS - 1).fill(200))).toBeUndefined();
  });
});

describe('sessionSummarize — ровность ритма', () => {
  // Чистые символы с равномерными startAt → равные межсимвольные интервалы → 100%.
  function evenStream(count: number, stepMs: number): StreamSymbol[] {
    return Array.from({ length: count }, (_, i) =>
      streamSymbol('a', ['KeyA'], [press(['KeyA'], i * stepMs)]),
    );
  }

  test('равномерный набор → rhythm = 100', () => {
    const out = sessionSummarize({ stream: evenStream(8, 200), durationMs: 60000 });
    expect(out.rhythm).toBe(100);
  });

  test('нет времени нажатий (startAt отсутствует) → поле rhythm опущено', () => {
    const out = sessionSummarize({
      stream: [streamSymbol('a', ['KeyA'], [press(['KeyA'])])],
      durationMs: 60000,
    });
    expect('rhythm' in out).toBe(false);
  });
});

describe('shouldJournalSession', () => {
  const summary = (exposures: number): SessionSummaryPayload => ({
    exposures,
    clean: exposures,
    cpm: 0,
    durationMs: 60000,
    latencyMedianMs: 0,
    confusions: [],
  });

  test('ниже порога — шум, не журналируем', () => {
    expect(shouldJournalSession(summary(MIN_JOURNAL_EXPOSURES - 1))).toBe(false);
  });

  test('ровно на пороге — журналируем (граница включительно)', () => {
    expect(shouldJournalSession(summary(MIN_JOURNAL_EXPOSURES))).toBe(true);
  });

  test('выше порога — журналируем', () => {
    expect(shouldJournalSession(summary(MIN_JOURNAL_EXPOSURES + 10))).toBe(true);
  });
});
