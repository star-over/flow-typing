import {
  FingerId,
  FingerLayout,
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
 * Gets the array of KeyCapIds required to type a given character.
 * @param char The character to look up.
 * @returns The corresponding array of KeyCapIds, or undefined if not found.
 */
export function getKeyCapIdsForChar(char: string): KeyCapId[] | undefined {
  if (char === ' ') return ['Space']; // Handle space separately if needed
  return symbolLayoutEnQwerty[char];
}

/**
 * Checks if the Shift key is required to type a given character.
 * @param char The character to check.
 * @returns True if Shift is required, false otherwise.
 */
export function isShiftRequired(char: string): boolean {
  const keyCapIds = getKeyCapIdsForChar(char);
  return keyCapIds?.some(id => id.includes('Shift')) ?? false;
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
  const entry = fingerLayout[keyCapId];
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
