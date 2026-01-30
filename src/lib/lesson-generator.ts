import { SymbolLayout, TypingStream } from "@/interfaces/types";
import { getKeyCapIdsForChar } from "@/lib/symbol-utils";

export const lessons = [
  // "The Quick Brown Fox Jumps Over The Lazy Dog.",
  // "-_=+[{]}\\\|'",
  // "To Be Or Not To Be, That Is The Question.",
  "Привет, как дела?",
];

/**
 * Generates a TypingStream from a given text.
 * For each character, it pre-calculates the `targetKeyCaps`.
 * @param lessonText The string to convert into a lesson.
 * @param symbolLayout The symbol layout to use for character-to-key mapping.
 * @returns A TypingStream for the lesson.
 */
export function generateTypingStream(lessonText: string, symbolLayout: SymbolLayout): TypingStream {
  const stream: TypingStream = lessonText
    .split('')
    .map((targetSymbol): TypingStream[number] | null => {
      const targetKeyCaps = getKeyCapIdsForChar(targetSymbol, symbolLayout);

      if (!targetKeyCaps) {
        console.warn(`Character "${targetSymbol}" not found in symbol layout.`);
        return null; // Skip characters not in the layout
      }

      return { targetSymbol, targetKeyCaps, attempts: [], };
    })
    .filter((item): item is TypingStream[number] => item !== null);

  return stream;
}
