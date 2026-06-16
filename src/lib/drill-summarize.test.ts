import { describe, expect, test } from 'vitest';
import { drillSummarize, PAUSE_CAP_MS } from './drill-summarize';
import type { StreamAttempt, StreamSymbol } from '@/interfaces/types';
import type { KeyCapId } from '@/interfaces/key-cap-id';

function press(keys: KeyCapId[], startAt?: number): StreamAttempt {
  return { pressedKeyCaps: keys, startAt };
}
function streamSymbol(targetSymbol: string, target: KeyCapId[], attempts: StreamAttempt[]): StreamSymbol {
  return { targetSymbol, targetKeyCaps: target, attempts };
}

describe('drillSummarize', () => {
  test('чистое предъявление — первое нажатие верное', () => {
    const summary = drillSummarize([streamSymbol('h', ['KeyH'], [press(['KeyH'])])]);
    expect(summary.perSymbol).toEqual([{ symbol: 'h', exposures: 1, clean: 1, latencies: [] }]);
    expect(summary.overall.exposures).toBe(1);
    expect(summary.overall.clean).toBe(1);
    expect(summary.overall.accuracy).toBe(1);
  });

  test('проскок не множит ошибку — символ судим по первому нажатию', () => {
    const summary = drillSummarize([
      streamSymbol('a', ['KeyA'], [
        press(['KeyS']), // первый промах — настоящая ошибка
        press(['KeyD']), // проскок: цель следующей позиции
        press(['KeyF']), // проскок
        press(['KeyA']), // наконец верно
      ]),
    ]);
    // 1 предъявление, 0 чистых — три промаха не превращаются в три ошибки.
    expect(summary.overall.exposures).toBe(1);
    expect(summary.overall.clean).toBe(0);
    expect(summary.overall.accuracy).toBe(0);
  });

  test('смешанная точность: одно чистое, одно нет → accuracy 0.5', () => {
    const summary = drillSummarize([
      streamSymbol('h', ['KeyH'], [press(['KeyH'])]),
      streamSymbol('i', ['KeyI'], [press(['KeyO']), press(['KeyI'])]),
    ]);
    expect(summary.overall.exposures).toBe(2);
    expect(summary.overall.clean).toBe(1);
    expect(summary.overall.accuracy).toBe(0.5);
  });

  test('латентность: первый символ исключён, межсимвольные интервалы и медиана/разброс', () => {
    const summary = drillSummarize([
      streamSymbol('h', ['KeyH'], [press(['KeyH'], 100)]),
      streamSymbol('i', ['KeyI'], [press(['KeyI'], 300)]), // 300 − 100 = 200
      streamSymbol('j', ['KeyJ'], [press(['KeyJ'], 450)]), // 450 − 300 = 150
    ]);
    const h = summary.perSymbol.find((s) => s.symbol === 'h');
    const i = summary.perSymbol.find((s) => s.symbol === 'i');
    const j = summary.perSymbol.find((s) => s.symbol === 'j');
    expect(h?.latencies).toEqual([]); // первый символ — без латентности
    expect(i?.latencies).toEqual([200]);
    expect(j?.latencies).toEqual([150]);
    expect(summary.overall.latencyMedian).toBe(175); // (150 + 200) / 2
    expect(summary.overall.latencySpread).toBe(25); // MAD: |200−175|=|150−175|=25
  });

  test('паузы отбрасываются: интервал больше PAUSE_CAP_MS не идёт в латентность', () => {
    const summary = drillSummarize([
      streamSymbol('h', ['KeyH'], [press(['KeyH'], 0)]),
      streamSymbol('i', ['KeyI'], [press(['KeyI'], 100)]), // 100 — норма
      streamSymbol('j', ['KeyJ'], [press(['KeyJ'], 100 + PAUSE_CAP_MS + 1)]), // пауза — отброшено
    ]);
    expect(summary.perSymbol.find((s) => s.symbol === 'i')?.latencies).toEqual([100]);
    expect(summary.perSymbol.find((s) => s.symbol === 'j')?.latencies).toEqual([]);
    expect(summary.overall.latencyMedian).toBe(100);
  });

  test('неположительный интервал отбрасывается (расхождение часов / наложение)', () => {
    const summary = drillSummarize([
      streamSymbol('h', ['KeyH'], [press(['KeyH'], 500)]),
      streamSymbol('i', ['KeyI'], [press(['KeyI'], 500)]), // delta 0 → отброшено
    ]);
    expect(summary.perSymbol.find((s) => s.symbol === 'i')?.latencies).toEqual([]);
  });

  test('агрегация по символу: повтор символа — одна ячейка', () => {
    const summary = drillSummarize([
      streamSymbol('a', ['KeyA'], [press(['KeyA'], 0)]),
      streamSymbol('a', ['KeyA'], [press(['KeyA'], 200)]), // латентность 200
    ]);
    expect(summary.perSymbol).toHaveLength(1);
    const a = summary.perSymbol[0];
    expect(a?.exposures).toBe(2);
    expect(a?.clean).toBe(2);
    expect(a?.latencies).toEqual([200]);
  });

  test('пустой поток → нулевая сводка', () => {
    const summary = drillSummarize([]);
    expect(summary.perSymbol).toEqual([]);
    expect(summary.overall).toEqual({
      exposures: 0,
      clean: 0,
      accuracy: 0,
      latencyMedian: 0,
      latencySpread: 0,
    });
  });

  test('незавершённый символ (нет нажатий) не считается предъявлением и рвёт цепь латентности', () => {
    const summary = drillSummarize([
      streamSymbol('h', ['KeyH'], [press(['KeyH'], 0)]),
      streamSymbol('i', ['KeyI'], []), // не набран
      streamSymbol('j', ['KeyJ'], [press(['KeyJ'], 200)]), // цепь разорвана → без латентности
    ]);
    expect(summary.overall.exposures).toBe(2); // h и j, не i
    expect(summary.perSymbol.find((s) => s.symbol === 'j')?.latencies).toEqual([]);
  });
});
