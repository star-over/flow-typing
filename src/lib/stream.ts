import { TypingStream, Attempt } from '@/interfaces/types';

/**
 * Creates a TypingStream from a string, where each character is a StreamSymbol
 * with no attempts yet.
 *
 * @param text The input string to convert into a TypingStream.
 * @returns A TypingStream array.
 */
export function createTypingStream(text: string): TypingStream {
  return text.split('').map(char => ({
    targetSymbol: char,
  }));
}

/**
 * Adds a new attempt to a symbol in the TypingStream at a given position.
 * This function is immutable and returns a new stream.
 *
 * @param stream The original TypingStream.
 * @param cursorPosition The index of the symbol to add the attempt to.
 * @param typedChar The character that was typed.
 * @param startAt The start time of the attempt.
 * @param endAt The end time of the attempt.
 * @returns A new TypingStream with the added attempt.
 */
export function addAttempt({
  stream,
  cursorPosition,
  typedSymbol,
  startAt,
  endAt,
}: {
  stream: TypingStream;
  cursorPosition: number;
  typedSymbol: string;
  startAt: number;
  endAt: number;
}): TypingStream {
  // Return original stream if position is out of bounds
  if (cursorPosition < 0 || cursorPosition >= stream.length) {
    return stream;
  }

  const newStream = [...stream]; // Shallow copy of the array
  const targetSymbol = newStream[cursorPosition];

  const newAttempt: Attempt = {
    typedSymbol: typedSymbol,
    startAt,
    endAt,
  };

  // Create a new attempts array, or start a new one if it doesn't exist
  const newAttempts = targetSymbol.attempts ? [...targetSymbol.attempts, newAttempt] : [newAttempt];

  // Create a new StreamSymbol object for the modified position
  newStream[cursorPosition] = {
    ...targetSymbol,
    attempts: newAttempts,
  };

  return newStream;
}
