import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import { useCaretBlink } from './use-caret-blink';

describe('useCaretBlink', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true initially', () => {
    const { result } = renderHook(() => useCaretBlink('a', 500));
    expect(result.current).toBe(true);
  });

  it('should become false after the delay', () => {
    const { result } = renderHook(() => useCaretBlink('a', 500));
    
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(false);
  });

  it('should reset to true when the dependency changes', () => {
    const { result, rerender } = renderHook(({ dependency, delay }) => useCaretBlink(dependency, delay), {
      initialProps: { dependency: 'a', delay: 500 },
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(false);

    rerender({ dependency: 'b', delay: 500 });

    expect(result.current).toBe(true);
  });

  it('should clear the timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useCaretBlink('a', 500));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledOnce();
  });
});
