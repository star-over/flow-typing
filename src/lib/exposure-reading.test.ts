import { describe, expect, test } from 'vitest';
import { readExposures, PAUSE_CAP_MS } from './exposure-reading';
import { press, streamSymbol } from '@/fixtures/stream';

describe('readExposures', () => {
  test('чистое предъявление: первое нажатие верное → clean', () => {
    const [reading] = readExposures([streamSymbol('h', ['KeyH'], [press(['KeyH'])])]);
    expect(reading?.targetSymbol).toBe('h');
    expect(reading?.clean).toBe(true);
    expect(reading?.latency).toBeUndefined(); // первый символ — нет предыдущего
  });

  test('проскок: символ судим по первому нажатию — одно предъявление, clean=false', () => {
    const readings = readExposures([
      streamSymbol('a', ['KeyA'], [
        press(['KeyS']), // первый промах — настоящая ошибка
        press(['KeyD']), // проскок: цель следующей позиции
        press(['KeyF']), // проскок
        press(['KeyA']), // наконец верно
      ]),
    ]);
    expect(readings).toHaveLength(1); // три промаха не плодят предъявления
    expect(readings[0]?.clean).toBe(false);
    expect(readings[0]?.firstAttempt.pressedKeyCaps).toEqual(['KeyS']);
  });

  test('латентность: межсимвольный интервал, первый символ исключён', () => {
    const readings = readExposures([
      streamSymbol('h', ['KeyH'], [press(['KeyH'], 100)]),
      streamSymbol('i', ['KeyI'], [press(['KeyI'], 300)]), // 300 − 100
      streamSymbol('j', ['KeyJ'], [press(['KeyJ'], 450)]), // 450 − 300
    ]);
    expect(readings.map((r) => r.latency)).toEqual([undefined, 200, 150]);
  });

  test('база латентности — верное нажатие предыдущего, не первое', () => {
    const readings = readExposures([
      streamSymbol('a', ['KeyA'], [press(['KeyS'], 100), press(['KeyA'], 150)]), // верно в 150
      streamSymbol('b', ['KeyB'], [press(['KeyB'], 250)]), // 250 − 150 = 100, не 250 − 100
    ]);
    expect(readings[1]?.latency).toBe(100);
  });

  test('пауза больше PAUSE_CAP_MS не идёт в латентность', () => {
    const readings = readExposures([
      streamSymbol('h', ['KeyH'], [press(['KeyH'], 0)]),
      streamSymbol('i', ['KeyI'], [press(['KeyI'], 100)]), // норма
      streamSymbol('j', ['KeyJ'], [press(['KeyJ'], 100 + PAUSE_CAP_MS + 1)]), // пауза
    ]);
    expect(readings.map((r) => r.latency)).toEqual([undefined, 100, undefined]);
  });

  test('неположительный интервал отбрасывается', () => {
    const readings = readExposures([
      streamSymbol('h', ['KeyH'], [press(['KeyH'], 500)]),
      streamSymbol('i', ['KeyI'], [press(['KeyI'], 500)]), // delta 0
    ]);
    expect(readings[1]?.latency).toBeUndefined();
  });

  test('незавершённый символ — не предъявление и рвёт цепь латентности', () => {
    const readings = readExposures([
      streamSymbol('h', ['KeyH'], [press(['KeyH'], 0)]),
      streamSymbol('i', ['KeyI'], []), // не набран → пропущен
      streamSymbol('j', ['KeyJ'], [press(['KeyJ'], 200)]), // цепь разорвана
    ]);
    expect(readings.map((r) => r.targetSymbol)).toEqual(['h', 'j']);
    expect(readings[1]?.latency).toBeUndefined();
  });

  test('пустой поток → нет предъявлений', () => {
    expect(readExposures([])).toEqual([]);
  });
});
