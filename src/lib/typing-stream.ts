import type { SymbolLayout, TypingStream } from "@/interfaces/types";
import { getKeyCapIdsForChar } from "@/lib/symbol-utils";

/**
 * Builds a TypingStream from a given drill text.
 * For each character, it pre-calculates the `targetKeyCaps`.
 */
export function createTypingStream({
  drillText,
  symbolLayout,
}: {
  drillText: string;
  symbolLayout: SymbolLayout;
}): TypingStream {
  const stream: TypingStream = drillText
    .split('')
    .map((targetSymbol): TypingStream[number] | null => {
      const targetKeyCaps = getKeyCapIdsForChar({ char: targetSymbol, symbolLayout });

      if (!targetKeyCaps) {
        console.warn(`Character "${targetSymbol}" not found in symbol layout.`);
        return null; // Skip characters not in the layout
      }

      return { targetSymbol, targetKeyCaps, attempts: [], };
    })
    .filter((item): item is TypingStream[number] => item !== null);

  return stream;
}
