import { describe, expect, test, vi } from 'vitest';
import { runAuthGate } from './gated-query';

function harness() {
  const setValues: number[] = [];
  let unsubscribed = 0;
  let captured: ((result: number) => void) | null = null;
  const subscribe = vi.fn((onResult: (result: number) => void) => {
    captured = onResult;
    return () => {
      unsubscribed += 1;
    };
  });
  return {
    subscribe,
    setValue: (value: number) => setValues.push(value),
    setValues,
    emit: (value: number) => captured?.(value),
    get unsubscribed() {
      return unsubscribed;
    },
  };
}

describe('runAuthGate', () => {
  test('гость: сброс на unauthValue, без подписки, без cleanup', () => {
    const h = harness();
    const cleanup = runAuthGate({ status: 'guest', unauthValue: 0, subscribe: h.subscribe, setValue: h.setValue });
    expect(h.setValues).toEqual([0]);
    expect(h.subscribe).not.toHaveBeenCalled();
    expect(cleanup).toBeUndefined();
  });

  test('loading: тоже сброс, не подписка (пропускаем только authenticated)', () => {
    const h = harness();
    const cleanup = runAuthGate({ status: 'loading', unauthValue: 0, subscribe: h.subscribe, setValue: h.setValue });
    expect(h.setValues).toEqual([0]);
    expect(h.subscribe).not.toHaveBeenCalled();
    expect(cleanup).toBeUndefined();
  });

  test('authenticated: одна подписка, значение приходит только через подписку (шов сам не пишет)', () => {
    const h = harness();
    const cleanup = runAuthGate({ status: 'authenticated', unauthValue: 0, subscribe: h.subscribe, setValue: h.setValue });
    expect(h.subscribe).toHaveBeenCalledTimes(1);
    expect(h.setValues).toEqual([]);
    h.emit(42);
    expect(h.setValues).toEqual([42]);
    expect(typeof cleanup).toBe('function');
  });

  test('authenticated: cleanup шва = отписка источника', () => {
    const h = harness();
    const cleanup = runAuthGate({ status: 'authenticated', unauthValue: 0, subscribe: h.subscribe, setValue: h.setValue });
    expect(h.unsubscribed).toBe(0);
    cleanup?.();
    expect(h.unsubscribed).toBe(1);
  });
});
