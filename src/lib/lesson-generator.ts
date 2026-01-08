import { TypingStream } from "@/interfaces/types";
import { getKeyCapIdsForChar } from "@/lib/symbol-utils";

export const lessons = [
  "the quick brown fox jumps over the lazy dog.",
  "never underestimate the power of a good book.",
  "the early bird catches the worm.",
  "technology has changed the way we live and work.",
  "to be or not to be, that is the question.",
];

/**
 * Generates a lesson as an "enriched" TypingStream.
 * It picks a random lesson, then for each character, it pre-calculates the
 * `requiredKeyCapIds`, including special logic for the spacebar.
 * @returns A TypingStream for the lesson.
 */
export function generateLesson(): TypingStream {
  const randomIndex = Math.floor(Math.random() * lessons.length);
  const lessonText = lessons[randomIndex];

  const stream: TypingStream = lessonText
    .split('')
    .map((char): TypingStream[number] | null => {
      const requiredKeyCapIds = getKeyCapIdsForChar(char);

      if (!requiredKeyCapIds) {
        console.warn(`Character "${char}" not found in symbol layout.`);
        return null; // Skip characters not in the layout
      }

      return {
        targetSymbol: char,
        targetKeyCaps: requiredKeyCapIds,
        attempts: [],
      };
    })
    .filter((item): item is TypingStream[number] => item !== null);

  return stream;
}
