import { useState, useEffect } from 'react';

/**
 * Custom hook to manage the blinking state of a caret.
 * It provides an `isBlinking` state that becomes `false` when the `dependency` changes,
 * and turns back to `true` after a specified `delay`.
 *
 * @param dependency - The value that triggers the blink reset (e.g., the current symbol).
 * @param blinkDelay - The delay in milliseconds before the caret starts blinking again.
 * @returns `isTyping` - A boolean indicating if the user is considered to be "typing" (i.e., caret should be solid).
 */
export function useCaretBlink(dependency: unknown, blinkDelay: number): boolean {
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setIsTyping(true); // Reset to solid caret whenever the dependency changes
    const timer = setTimeout(() => {
      setIsTyping(false); // Start blinking after delay
    }, blinkDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [dependency, blinkDelay]);

  return isTyping;
}
