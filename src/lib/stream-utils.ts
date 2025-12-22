import { TypingStream, StreamAttempt, StreamSymbol, FlowLineSymbolType, TypedKey } from '@/interfaces/types';
import { getKeyCapIdsForChar, nbsp, sp } from './symbol-utils';

/**
 * Creates a TypingStream from a string, where each character is a StreamSymbol
 * with no attempts yet. It skips characters that don't have a corresponding SymbolKey.
 *
 * @param text The input string to convert into a TypingStream.
 * @returns A TypingStream array.
 */
export function createTypingStream(text: string): TypingStream {
  const stream: TypingStream = [];
  for (const char of text.split('')) {
    // Check if the character is supported by the layout
    const keyCapIds = getKeyCapIdsForChar(char);
    if (keyCapIds) {
      stream.push({
        targetSymbol: char,
        attempts: [],
      });
    }
  }
  return stream;
}

/**
 * Adds a new attempt to a symbol in the TypingStream at a given position.
 * This function is immutable and returns a new stream.
 *
 * @param stream The original TypingStream.
 * @param cursorPosition The index of the symbol to add the attempt to.
 * @param typedKey The TypedKey that was typed.
 * @param startAt The start time of the attempt.
 * @param endAt The end time of the attempt.
 * @returns A new TypingStream with the added attempt.
 */
export function addAttempt({
  stream,
  cursorPosition,
  typedKey,
  startAt,
  endAt,
}: {
  stream: TypingStream;
  cursorPosition: number;
  typedKey: TypedKey;
  startAt: number;
  endAt: number;
}): TypingStream {
  // Return original stream if position is out of bounds
  if (cursorPosition < 0 || cursorPosition >= stream.length) {
    return stream;
  }

  const newStream = [...stream]; // Shallow copy of the array
  const targetSymbol = newStream[cursorPosition];

  const newAttempt: StreamAttempt = {
    typedKey: typedKey,
    startAt,
    endAt,
  };

  // Create a new attempts array by adding the new attempt
  const newAttempts = [...targetSymbol.attempts, newAttempt];

  // Create a new StreamSymbol object for the modified position
  newStream[cursorPosition] = {
    ...targetSymbol,
    attempts: newAttempts,
  };

  return newStream;
}

/**
 * Determines the visual state (symbolType) of a stream symbol based on its attempts.
 */
export function getSymbolType(symbol?: StreamSymbol): FlowLineSymbolType {
  const { attempts } = symbol ?? {};

  if (!attempts || attempts.length === 0) {
    return "PENDING";
  }

  const lastAttempt = attempts.at(-1)!;
  const isCorrect = lastAttempt.typedKey.isCorrect;

  if (isCorrect) {
    // If the last attempt is correct, it's either CORRECT (1st try) or FIXED (after errors).
    return attempts.length > 1 ? "CORRECTED" : "CORRECT";
  } else {
    // If the last attempt is incorrect, it's either an ERROR (1st try) or ERRORS (multiple).
    return attempts.length > 1 ? "INCORRECTS" : "INCORRECT";
  }
}

/**
 * Returns the character to be displayed, converting space to a non-breaking space.
 */
export const getSymbolChar = (symbol?: StreamSymbol): string => {
  const char = symbol?.targetSymbol;
  if (!char) {
    // Returning a non-breaking space for empty chars to maintain layout
    return nbsp;
  }
  return char === sp ? nbsp : char;
};
