import { describe, test, expect } from 'vitest';
import {
  BASELINE_ALPHA,
  MIN_BASELINE_SAMPLES,
  deltaToBaseline,
  historyWithoutCurrent,
  rollingBaseline,
  type JournalIdentity,
} from './session-baseline';

const row = (over: Partial<JournalIdentity> = {}): JournalIdentity => ({
  exposures: 72,
  clean: 64,
  durationMs: 60_000,
  latencyMedianMs: 340,
  ...over,
});

describe('rollingBaseline', () => {
  test('пустой вход — undefined (а не выдуманный 0)', () => {
    expect(rollingBaseline([])).toBeUndefined();
  });

  test('один замер — он и есть база: α(1) = 1, прошлого веса нет', () => {
    expect(rollingBaseline([82])).toBe(82);
  });

  test('пока α(t)=1/t, это обычное среднее — не EWMA с холодным нулём', () => {
    // Три равных замера: любое честное среднее даёт то же число. Проверка,
    // что старт не тянет базу к нулю (классическая ошибка EWMA без разогрева).
    expect(rollingBaseline([80, 80, 80])).toBeCloseTo(80, 10);
    // Разные значения: 1/t-разогрев обязан дать ровно арифметическое среднее.
    expect(rollingBaseline([60, 80])).toBeCloseTo(70, 10);
    expect(rollingBaseline([60, 80, 100])).toBeCloseTo(80, 10);
  });

  test('с четвёртого замера вес садится на BASELINE_ALPHA', () => {
    // α(4) = max(0.25, 1/4) = 0.25 — граница разогрева.
    const beforeFourth = rollingBaseline([60, 80, 100]);
    if (beforeFourth === undefined) throw new Error('база должна быть определена');
    const withFourth = rollingBaseline([60, 80, 100, 200]);
    if (withFourth === undefined) throw new Error('база должна быть определена');
    expect(withFourth).toBeCloseTo(BASELINE_ALPHA * 200 + (1 - BASELINE_ALPHA) * beforeFourth, 10);
  });

  test('свежие замеры весят больше старых', () => {
    // Одинаковый набор, обратный порядок: EWMA обязана дать разный ответ,
    // иначе это не скользящее среднее, а обычное.
    const rising = rollingBaseline([50, 60, 70, 80, 90]);
    const falling = rollingBaseline([90, 80, 70, 60, 50]);
    if (rising === undefined || falling === undefined) throw new Error('база должна быть определена');
    expect(rising).toBeGreaterThan(falling);
  });

  test('устойчива к длинной истории: старое не тянет базу назад', () => {
    // 50 сессий по 60, затем 5 по 90 — база обязана быть заметно ближе к 90.
    const history = [...Array<number>(50).fill(60), ...Array<number>(5).fill(90)];
    const base = rollingBaseline(history);
    if (base === undefined) throw new Error('база должна быть определена');
    expect(base).toBeGreaterThan(80);
  });
});

describe('deltaToBaseline', () => {
  test('истории меньше MIN_BASELINE_SAMPLES — дельты нет', () => {
    expect(deltaToBaseline({ current: 90, history: [] })).toBeUndefined();
    expect(deltaToBaseline({ current: 90, history: [80] })).toBeUndefined();
    expect(deltaToBaseline({ current: 90, history: [80, 82] })).toBeUndefined();
  });

  test('на пороге MIN_BASELINE_SAMPLES дельта появляется', () => {
    expect(MIN_BASELINE_SAMPLES).toBe(3);
    const delta = deltaToBaseline({ current: 90, history: [80, 80, 80] });
    expect(delta).toBeCloseTo(10, 10);
  });

  test('знак: ниже нормы — отрицательная', () => {
    const delta = deltaToBaseline({ current: 70, history: [80, 80, 80] });
    expect(delta).toBeCloseTo(-10, 10);
  });

  test('текущий замер в history не входит — иначе дельта занижена', () => {
    // Если бы current случайно попал в базу, он подтянул бы её к себе и
    // дельта вышла бы меньше. Считаем ровно по прошлым.
    const history = [80, 80, 80];
    const delta = deltaToBaseline({ current: 100, history });
    expect(delta).toBeCloseTo(20, 10);
    expect(history).toEqual([80, 80, 80]); // вход не мутируем
  });
});

describe('historyWithoutCurrent', () => {
  test('строка текущей сессии ещё не долетела — журнал отдаём как есть', () => {
    const journal = [row({ exposures: 50 }), row({ exposures: 60 })];
    expect(historyWithoutCurrent({ journal, current: row() })).toHaveLength(2);
  });

  test('строка текущей долетела — снимаем, иначе точка-сегодня раздвоится', () => {
    // Ровно тот сценарий: подписка живая, запись fire-and-forget, строка
    // приходит через сотни мс после показа экрана.
    const current = row();
    const journal = [row({ exposures: 50 }), row({ exposures: 60 }), { ...current }];
    const history = historyWithoutCurrent({ journal, current });
    expect(history).toHaveLength(2);
    expect(history.at(-1)?.exposures).toBe(60);
  });

  test('снимаем только новейшую: похожая старая строка остаётся', () => {
    const current = row();
    const journal = [{ ...current }, row({ exposures: 60 })];
    expect(historyWithoutCurrent({ journal, current })).toHaveLength(2);
  });

  test('различаем по всем четырём числам, не по одному', () => {
    const current = row();
    for (const diff of [
      { exposures: 71 },
      { clean: 63 },
      { durationMs: 59_000 },
      { latencyMedianMs: 341 },
    ]) {
      const journal = [row({ ...diff })];
      expect(historyWithoutCurrent({ journal, current })).toHaveLength(1);
    }
  });

  test('пустой журнал — пусто, без падения', () => {
    expect(historyWithoutCurrent({ journal: [], current: row() })).toEqual([]);
  });

  test('вход не мутируем', () => {
    const current = row();
    const journal = [row({ exposures: 60 }), { ...current }];
    historyWithoutCurrent({ journal, current });
    expect(journal).toHaveLength(2);
  });
});
