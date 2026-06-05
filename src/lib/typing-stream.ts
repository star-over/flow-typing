import type { SymbolLayout, TypingStream } from "@/interfaces/types";
import { getKeyCapIdsForChar } from "@/lib/symbol-utils";

export const defaultDrillTexts = [
  // "The Quick Brown Fox Jumps Over The Lazy Dog.",
  // "-_=+[{]}\\\|'",
  // "To Be Or Not To Be, That Is The Question.",
  "Привет, как дела?",
];

/**
 * Builds a TypingStream from a given drill text.
 * For each character, it pre-calculates the `targetKeyCaps`.
 * @param drillText The drill text to convert.
 * @param symbolLayout The symbol layout to use for character-to-key mapping.
 */
export function createTypingStream(drillText: string, symbolLayout: SymbolLayout): TypingStream {
  const stream: TypingStream = drillText
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
