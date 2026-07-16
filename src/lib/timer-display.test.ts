import { describe, expect, test } from 'vitest';
import { computeTimerSeconds, formatDurationShort } from './timer-display';

describe('computeTimerSeconds', () => {
  test('вне тренировки — null (Header счётчик не рисует)', () => {
    expect(
      computeTimerSeconds({ displayElapsedMs: 5000, isTraining: false, hasSession: true, durationSeconds: 60 }),
    ).toBeNull();
  });

  test('без активной сессии — null даже в состоянии training', () => {
    expect(
      computeTimerSeconds({ displayElapsedMs: 5000, isTraining: true, hasSession: false, durationSeconds: 60 }),
    ).toBeNull();
  });

  test('на старте показывает полную длительность', () => {
    expect(
      computeTimerSeconds({ displayElapsedMs: 0, isTraining: true, hasSession: true, durationSeconds: 60 }),
    ).toBe(60);
  });

  test('обратный отсчёт: длительность минус floor(elapsed/1000)', () => {
    expect(
      computeTimerSeconds({ displayElapsedMs: 12_400, isTraining: true, hasSession: true, durationSeconds: 60 }),
    ).toBe(48);
  });

  test('floor до целой секунды (доли секунды не тикают вниз раньше времени)', () => {
    expect(
      computeTimerSeconds({ displayElapsedMs: 999, isTraining: true, hasSession: true, durationSeconds: 60 }),
    ).toBe(60);
    expect(
      computeTimerSeconds({ displayElapsedMs: 1000, isTraining: true, hasSession: true, durationSeconds: 60 }),
    ).toBe(59);
  });

  test('зажим max(0): перешаг за длительность не уходит в минус', () => {
    expect(
      computeTimerSeconds({ displayElapsedMs: 61_200, isTraining: true, hasSession: true, durationSeconds: 60 }),
    ).toBe(0);
  });
});

describe('formatDurationShort', () => {
  test('минута — 1:00, а не «60 с»', () => {
    expect(formatDurationShort(60)).toBe('1:00');
  });

  test('предельная сессия 900 с читается как 15:00', () => {
    // Ради этого формат и заводился: «900 с» никто не читает как 15 минут.
    expect(formatDurationShort(900)).toBe('15:00');
  });

  test('секунды всегда в двух знаках', () => {
    expect(formatDurationShort(65)).toBe('1:05');
    expect(formatDurationShort(5)).toBe('0:05');
  });

  test('дробные секунды округляются', () => {
    expect(formatDurationShort(59.6)).toBe('1:00');
    expect(formatDurationShort(1.234)).toBe('0:01');
  });

  test('ноль и отрицательное — 0:00, без минуса', () => {
    expect(formatDurationShort(0)).toBe('0:00');
    expect(formatDurationShort(-3)).toBe('0:00');
  });
});
