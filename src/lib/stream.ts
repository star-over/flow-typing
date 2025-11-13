import { TypingStream } from '@/interfaces/types';

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
