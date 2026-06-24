// src/lib/session-summarize.test.ts
import { describe, expect, test } from 'vitest';
import { summarizeSession, MAX_CONFUSIONS } from './session-summarize';
import type { StreamAttempt, StreamSymbol } from '@/interfaces/types';
import type { KeyCapId } from '@/interfaces/key-cap-id';

function press(keys: KeyCapId[], startAt?: number): StreamAttempt {
  return { pressedKeyCaps: keys, startAt };
}
function streamSymbol(targetSymbol: string, target: KeyCapId[], attempts: StreamAttempt[]): StreamSymbol {
  return { targetSymbol, targetKeyCaps: target, attempts };
}

describe('summarizeSession', () => {
  test('confusion: первый промах учитывается с направлением (target → pressed)', () => {
    const out = summarizeSession({
      stream: [streamSymbol('a', ['KeyA'], [press(['KeyS']), press(['KeyA'])])],
      durationMs: 60000,
    });
    expect(out.exposures).toBe(1);
    expect(out.clean).toBe(0);
    expect(out.confusions).toEqual([{ target: 'a', pressed: 'KeyS', count: 1 }]);
  });

  test('чистое нажатие не даёт confusion', () => {
    const out = summarizeSession({
      stream: [streamSymbol('h', ['KeyH'], [press(['KeyH'])])],
      durationMs: 60000,
    });
    expect(out.clean).toBe(1);
    expect(out.confusions).toEqual([]);
  });

  test('confusion игнорирует сочетания клавиш и пустые нажатия (V1 — только одиночные)', () => {
    const out = summarizeSession({
      stream: [
        streamSymbol('я', ['KeyZ'], [press(['KeyZ', 'ShiftLeft']), press(['KeyZ'])]), // сочетание клавиш как промах
        streamSymbol('ф', ['KeyA'], [press([]), press(['KeyA'])]), // пустое нажатие
      ],
      durationMs: 60000,
    });
    expect(out.confusions).toEqual([]);
  });

  test('cpm = exposures / минуты (durationMs из активного времени)', () => {
    const out = summarizeSession({
      stream: [streamSymbol('a', ['KeyA'], [press(['KeyA'])]), streamSymbol('b', ['KeyB'], [press(['KeyB'])])],
      durationMs: 30000, // полминуты → cpm = 2 / 0.5 = 4
    });
    expect(out.cpm).toBe(4);
    expect(out.durationMs).toBe(30000);
  });

  test('cpm = 0 при крошечной длительности (durationMs < 1000) — не делим на ~ноль', () => {
    const out = summarizeSession({
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
    const out = summarizeSession({ stream, durationMs: 60000 });
    expect(out.confusions.length).toBe(MAX_CONFUSIONS);
    expect(out.confusions[0]).toEqual({ target: 'a', pressed: 'KeyS', count: 3 }); // самый частый — первым
  });
});
