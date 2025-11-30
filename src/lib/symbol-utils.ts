import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { SymbolKey, SymbolLayout } from "@/interfaces/types";
import { KeyCapId } from "@/interfaces/key-cap-id";
import { KeyboardLayoutANSI } from "@/data/keyboard-layout-ansi";

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

export const symbolKeyCapIdSet = new Set<KeyCapId>(
  KeyboardLayoutANSI.flat()
    .filter((key) => key.type === "SYMBOL")
    .map((key) => key.keyCapId),
);

export const isKeyCapIdSymbol = (code: string): code is KeyCapId => {
  return symbolKeyCapIdSet.has(code as KeyCapId);
};