import {
  FingerId,
  FingerLayout,
  SymbolKey,
  SymbolLayout,
} from "@/interfaces/types";
import { KeyCapId } from "@/interfaces/key-cap-id";
import { keyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";

/**
 * Non-breaking space unicode symbol
 *
 * @type {string}
 */
export const nbsp = '\u00A0';

/**
 * Space unicode symbol
 *
 * @type {string}
 */
export const sp = '\u0020';

/**
 * Creates a map from a character to its SymbolKey object for efficient lookups.
 * @param layout The SymbolLayout to create the map from.
 * @returns A Map where the key is the character and the value is the SymbolKey.
 */
function createSymbolKeyMap(layout: SymbolLayout): Map<string, SymbolKey> {
  // Assuming SymbolLayout is an array of SymbolKey.
  // Each SymbolKey has a 'symbol' property which is the character.
  return new Map(layout.map((key) => [key.symbol, key]));
}

// Create a memoized map for the default QWERTY layout.
const symbolKeyMapEnQwerty = createSymbolKeyMap(symbolLayoutEnQwerty);

/**
 * Gets the SymbolKey for a given character from the default QWERTY layout.
 * @param char The character to look up.
 * @returns The corresponding SymbolKey, or undefined if not found.
 */
export function getSymbolKeyForChar(char: string): SymbolKey | undefined {
  return symbolKeyMapEnQwerty.get(char);
}

/**
 * Finds the KeyCapId for a given symbol from a symbol layout.
 * @param symbol The symbol to find.
 * @param layout The symbol layout to search in.
 * @returns The corresponding KeyCapId or undefined if not found.
 */
export function findKeyCapBySymbol(
  symbol: string,
  layout: SymbolLayout,
): KeyCapId | undefined {
  // Try to find exact match first (unshifted)
  let found = layout.find(
    (symbolKey) => symbolKey.symbol === symbol && !symbolKey.shift,
  );
  if (found) {
    return found.keyCapId;
  }

  // If not found, try to find with shift
  found = layout.find(
    (symbolKey) => symbolKey.symbol === symbol && symbolKey.shift,
  );
  if (found) {
    return found.keyCapId;
  }

  return undefined;
}

/**
 * Retrieves the fingerId for a given KeyCapId from a finger layout.
 * @param keyCapId The KeyCapId to look up.
 * @param fingerLayout The finger layout to use.
 * @returns The fingerId or undefined if not found.
 */
export function getFingerByKeyCap(
  keyCapId: KeyCapId,
  fingerLayout: FingerLayout,
): FingerId | undefined {
  const entry = fingerLayout.find((fingerKey) => fingerKey.keyCapId === keyCapId);
  return entry ? entry.fingerId : undefined;
}


export const symbolKeyCapIdSet = new Set<KeyCapId>(
  keyboardLayoutANSI.flat()
    .filter((key) => key.type === "SYMBOL")
    .map((key) => key.keyCapId),
);

export const isKeyCapIdSymbol = (code: string): code is KeyCapId => {
  return symbolKeyCapIdSet.has(code as KeyCapId);
};
