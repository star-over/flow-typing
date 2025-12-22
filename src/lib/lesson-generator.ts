import { TypingStream, StreamSymbol } from "@/interfaces/types";
import { getKeyCapIdsForChar } from "@/lib/symbol-utils";

const lessons = [
  "the quick brown fox jumps over the lazy dog.",
  "never underestimate the power of a good book.",
  "the early bird catches the worm.",
  "technology has changed the way we live and work.",
  "to be or not to be, that is the question.",
];

/**
 * Generates a lesson as a TypingStream.
 * It picks a random lesson, converts each character into a StreamSymbol,
 * and returns the array.
 * @returns A TypingStream for the lesson.
 */
export function generateLesson(): TypingStream {
  const randomIndex = Math.floor(Math.random() * lessons.length);
  const lessonText = lessons[randomIndex];

  const stream: TypingStream = lessonText
    .split('')
    .map((char): StreamSymbol | null => {
      const keyCapIds = getKeyCapIdsForChar(char);
      if (!keyCapIds) {
        // Handle cases where a character might not be on the keyboard layout
        // For now, we'll skip it. A more robust solution might substitute it.
        console.warn(`Character "${char}" not found in symbol layout.`);
        return null;
      }
      return {
        targetSymbol: char,
        attempts: [],
      };
    })
    .filter((symbol): symbol is StreamSymbol => symbol !== null); // Filter out nulls

  return stream;
}
