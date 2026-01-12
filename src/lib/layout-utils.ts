/**
 * @file Utilities for working with keyboard layouts and key coordinates.
 */
import { KeyboardLayout,KeyCapId } from "@/interfaces/types";


export type KeyCoordinateMap = Map<KeyCapId, { r: number; c: number }>;

/**
 * Creates a map of KeyCapId to its coordinates {r, c} from a KeyboardLayout.
 * @param keyboardLayout The 2D array representing the physical keyboard layout.
 * @returns A Map where keys are KeyCapIds and values are their coordinates.
 */
export function createKeyCoordinateMap(keyboardLayout: KeyboardLayout): KeyCoordinateMap {
  const map: KeyCoordinateMap = new Map();
  keyboardLayout.forEach((row, r) => {
    row.forEach((key, c) => {
      if (key) {
        map.set(key.keyCapId, { r, c });
      }
    });
  });
  return map;
}
