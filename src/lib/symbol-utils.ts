import { KeyCapId } from "@/interfaces/key-cap-id";
import {
  FingerId,
  FingerLayout,
  KeyboardLayout,
  SymbolLayout,
} from "@/interfaces/types";

/**
 * Символ неразрывного пробеса (non-breaking space).
 * @type {string}
 */
export const nbsp = '\u00A0';

/**
 * Символ обычного пробела (space).
 * @type {string}
 */
export const sp = '\u0020';



/**
 * Проверяет, является ли клавиша модификатором.
 * @param key Код клавиши (`KeyboardEvent.code`).
 * @param keyboardLayout Макет клавиатуры, используемый для определения модификаторов.
 * @returns `true`, если клавиша является модификатором.
 */
export function isModifierKey(key: string, keyboardLayout: KeyboardLayout): boolean {
  return keyboardLayout.flat()
    .filter((k) => k.type === "MODIFIER")
    .map((k) => k.keyCapId)
    .includes(key as KeyCapId);
}

/**
 * Проверяет, является ли клавиша символьной (текстовой).
 * Зависит от глобальной переменной `symbolKeyCapIdSet`, которая инициализируется с `keyboardLayoutANSI`.
 * Для обеспечения полной чистоты и тестируемости, эта функция также должна быть рефакторизована
 * для принятия `KeyboardLayout` в качестве аргумента.
 * @param key Код клавиши (`KeyboardEvent.code`).
 * @returns `true`, если клавиша является символьной.
 */
export function isTextKey(key: string, keyboardLayout: KeyboardLayout): boolean {
  return keyboardLayout.flat()
    .filter((k) => k.type === "SYMBOL")
    .map((k) => k.keyCapId)
    .includes(key as KeyCapId);
}


/**
 * Finds a symbol in the layout that exactly matches a given combination of a base key and modifiers.
 * @param keyCapId The base physical key ID.
 * @param activeModifiers An array of active modifiers.
 * @returns The matching symbol character or null if no exact match is found.
 *
 * @architectural_note
 * The core of this function is a "canonicalization" step. Both the input keys
 * (keyCapId + activeModifiers) and the keys from the symbol layout are converted
 * to a standard form (e.g., 'ShiftLeft' is used for any shift key). This allows
 * for a reliable, set-based comparison and correctly handles variations like
 * ShiftLeft vs. ShiftRight. It also correctly resolves the symbol for the
 * modifier key itself (e.g., finding "Sh L" for the "ShiftLeft" key).
 */
export function getLabel(keyCapId: KeyCapId, symbolLayout: SymbolLayout, keyboardLayout: KeyboardLayout): string {
  const physicalKey = keyboardLayout.flat().find((key) => key.keyCapId === keyCapId);

  // 1. Handle non-symbol keys (MODIFIER, SYSTEM)
  if (physicalKey?.type !== 'SYMBOL') {
    return physicalKey?.label || '...';
  }

  // 2. Find symbols in a single pass
  let baseSymbol: string | undefined;
  let shiftedSymbol: string | undefined;

  for (const entry of symbolLayout) {
    if (entry.keyCaps.length === 1 && entry.keyCaps[0] === keyCapId) {
      baseSymbol = entry.symbol;
    } else if (entry.keyCaps.length === 2 && entry.keyCaps.includes(keyCapId) && entry.keyCaps.some((k) => k.startsWith('Shift'))) {
      shiftedSymbol = entry.symbol;
    }
    // Optimization: stop early if both are found
    if (baseSymbol && shiftedSymbol) {
      break;
    }
  }

  // 3. Determine the final label based on the found symbols
  if (!baseSymbol) {
    return physicalKey?.label || '...'; // Fallback to physical key label
  }
  if (!shiftedSymbol || baseSymbol === shiftedSymbol) {
    return baseSymbol; // No shifted symbol or it's the same (e.g., Space)
  }
  // For letters like 'a'/'A', show only the uppercase version
  if (baseSymbol.toUpperCase() === shiftedSymbol) {
    return shiftedSymbol;
  }

  // Otherwise, combine them (e.g., '1' and '!')
  return `${baseSymbol}\u202F${shiftedSymbol}`;
}



/**
 * Получает массив `KeyCapId`, необходимых для набора заданного символа.
 * @param char Символ для поиска.
 * @returns Массив `KeyCapId` или `undefined`, если символ не найден.
 */
export function getKeyCapIdsForChar(char: string, symbolLayout: SymbolLayout): KeyCapId[] | undefined {
  const entry = symbolLayout.find((item) => item.symbol === char);
  return entry?.keyCaps;
}

/**
 * Получает `fingerId` для заданного `KeyCapId` из пальцевого макета.
 * @param keyCapId `KeyCapId` для поиска.
 * @param fingerLayout Схема расположения пальцев.
 * @returns `FingerId` или `undefined`, если не найден.
 */
export function getFingerByKeyCap( keyCapId: KeyCapId, fingerLayout: FingerLayout ): FingerId | undefined {
  const entry = fingerLayout.find((item) => item.keyCapId === keyCapId);
  return entry ? entry.fingerId : undefined;
}

export function areKeyCapIdArraysEqual(arr1: KeyCapId[], arr2: KeyCapId[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  // This works correctly under the assumption that neither arr1 nor arr2 contains duplicate entries.
  // For keyboard chords, this is a safe assumption.
  return arr1.every((keyCap) => arr2.includes(keyCap));
}
