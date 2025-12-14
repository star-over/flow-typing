import { TypingStream, StreamSymbol } from "@/interfaces/types";
import { getSymbolKeyForChar } from "@/lib/symbol-utils";

const lessons = [
  "The quick brown fox jumps over the lazy dog.",
  "Never underestimate the power of a good book.",
  "The early bird catches the worm.",
  "Technology has changed the way we live and work.",
  "To be or not to be, that is the question.",
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
      const symbolKey = getSymbolKeyForChar(char);
      if (!symbolKey) {
        // Handle cases where a character might not be on the keyboard layout
        // For now, we'll skip it. A more robust solution might substitute it.
        console.warn(`Character "${char}" not found in symbol layout.`);
        return null;
      }
      return {
        targetSymbol: symbolKey,
        attempts: [],
      };
    })
    .filter((symbol): symbol is StreamSymbol => symbol !== null); // Filter out nulls

  return stream;
}
