import { describe, expect, test } from 'vitest';
import { computeTimerSeconds } from './timer-display';

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
