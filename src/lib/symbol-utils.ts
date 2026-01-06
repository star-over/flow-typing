/**
 * @file Утилиты для работы с символами и типами клавиш.
 * @description Содержит функции для определения типа клавиши, получения
 * информации о символах и их связи с физическими клавишами.
 */
import { keyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { KeyCapId } from "@/interfaces/key-cap-id";
import {
  FingerId,
  FingerLayout,
  ModifierKey,
} from "@/interfaces/types";

/**
 * Символ неразрывного пробела (non-breaking space).
 * @type {string}
 */
export const nbsp = '\u00A0';

/**
 * Символ обычного пробела (space).
 * @type {string}
 */
export const sp = '\u0020';


// --- Key Type Definitions ---

const allKeys = keyboardLayoutANSI.flat();

/**
 * `Set` всех `KeyCapId` для клавиш-модификаторов.
 */
export const modifierKeyCapIdSet = new Set<KeyCapId>(
  allKeys
    .filter((key) => key.type === "MODIFIER")
    .map((key) => key.keyCapId)
);

/**
 * `Set` всех `KeyCapId` для символьных клавиш.
 */
export const symbolKeyCapIdSet = new Set<KeyCapId>(
  allKeys
    .filter((key) => key.type === "SYMBOL")
    .map((key) => key.keyCapId)
);

/**
 * `Set` всех `KeyCapId` для системных (функциональных) клавиш.
 */
export const functionalKeyCapIdSet = new Set<KeyCapId>(
  allKeys
    .filter((key) => key.type === "SYSTEM")
    .map((key) => key.keyCapId)
);

/**
 * Проверяет, является ли клавиша модификатором.
 * @param key Код клавиши (`KeyboardEvent.code`).
 * @returns `true`, если клавиша является модификатором.
 */
export function isModifierKey(key: string): key is KeyCapId {
  return modifierKeyCapIdSet.has(key as KeyCapId);
}

/**
 * Проверяет, является ли клавиша символьной (текстовой).
 * @param key Код клавиши (`KeyboardEvent.code`).
 * @returns `true`, если клавиша является символьной.
 */
export function isTextKey(key: string): key is KeyCapId {
  return symbolKeyCapIdSet.has(key as KeyCapId);
}

// --- End of Key Type Definitions ---

const modifierKeyToKeyCapId: Record<ModifierKey, KeyCapId[]> = {
  shift: ['ShiftLeft', 'ShiftRight'],
  alt: ['AltLeft', 'AltRight'],
  ctrl: ['ControlLeft', 'ControlRight'],
  meta: ['MetaLeft', 'MetaRight'],
};

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
function findSymbolForCombination(keyCapId: KeyCapId, activeModifiers: ModifierKey[]): string | null {
  // 1. Create the canonical set of keys we are looking for.
  const lookupKeys = new Set<KeyCapId>();
  
  // Add canonical modifiers from the activeModifiers array.
  if (activeModifiers.includes('shift')) lookupKeys.add('ShiftLeft');
  if (activeModifiers.includes('ctrl')) lookupKeys.add('ControlLeft');
  if (activeModifiers.includes('alt')) lookupKeys.add('AltLeft');
  if (activeModifiers.includes('meta')) lookupKeys.add('MetaLeft');

  // Add the canonical version of the base keyCapId itself.
  let canonicalKeyCap = keyCapId;
  if (modifierKeyToKeyCapId.shift.includes(keyCapId)) canonicalKeyCap = 'ShiftLeft';
  else if (modifierKeyToKeyCapId.ctrl.includes(keyCapId)) canonicalKeyCap = 'ControlLeft';
  else if (modifierKeyToKeyCapId.alt.includes(keyCapId)) canonicalKeyCap = 'AltLeft';
  else if (modifierKeyToKeyCapId.meta.includes(keyCapId)) canonicalKeyCap = 'MetaLeft';
  
  lookupKeys.add(canonicalKeyCap);

  // 2. Iterate through the symbol layout and compare.
  for (const [symbol, requiredKeys] of Object.entries(symbolLayoutEnQwerty)) {
    // Create a canonical set for the current symbol's required keys.
    const canonicalLayoutKeys = new Set<KeyCapId>();
    requiredKeys.forEach(key => {
      if (modifierKeyToKeyCapId.shift.includes(key)) canonicalLayoutKeys.add('ShiftLeft');
      else if (modifierKeyToKeyCapId.ctrl.includes(key)) canonicalLayoutKeys.add('ControlLeft');
      else if (modifierKeyToKeyCapId.alt.includes(key)) canonicalLayoutKeys.add('AltLeft');
      else if (modifierKeyToKeyCapId.meta.includes(key)) canonicalLayoutKeys.add('MetaLeft');
      else canonicalLayoutKeys.add(key);
    });

    // 3. Compare the canonical sets.
    if (
      lookupKeys.size === canonicalLayoutKeys.size &&
      [...lookupKeys].every(key => canonicalLayoutKeys.has(key))
    ) {
      return symbol; // Exact match found.
    }
  }

  return null; // No exact match found.
}

/**
 * Gets the display symbol for a given key and modifier combination with multi-level fallback.
 * This function is critical for the correct visual representation of keys on the virtual keyboard,
 * especially when dealing with complex key combinations and modifiers.
 *
 * Level 1: Tries to find an exact match for the keyCapId with all active modifiers.
 * Level 2: If Level 1 fails and modifiers were present, it falls back to finding the symbol for the base keyCapId alone (no modifiers).
 * Level 3: If no symbol is found even after the fallback, it returns a '...' placeholder.
 *
 * @param keyCapId The base physical key ID (e.g., 'KeyA').
 * @param activeModifiers An array of active modifiers (e.g., ['shift', 'ctrl']).
 * @returns The display symbol (e.g., 'A', 'a', '?') or '...' if no symbol is found.
 */
export function getSymbol(keyCapId: KeyCapId, activeModifiers: ModifierKey[]): string {
  // Level 1: Try exact match with all modifiers.
  const exactMatch = findSymbolForCombination(keyCapId, activeModifiers);
  if (exactMatch) {
    return exactMatch;
  }

  // Level 2: If modifiers were present but no match was found, try with no modifiers.
  if (activeModifiers.length > 0) {
    const baseMatch = findSymbolForCombination(keyCapId, []);
    if (baseMatch) {
      return baseMatch;
    }
  }

  // Level 3: If still no match, return the placeholder.
  return '...';
}



/**
 * Получает массив `KeyCapId`, необходимых для набора заданного символа.
 * @param char Символ для поиска.
 * @returns Массив `KeyCapId` или `undefined`, если символ не найден.
 */
export function getKeyCapIdsForChar(char: string): KeyCapId[] | undefined {
  return symbolLayoutEnQwerty[char];
}

/**
 * Проверяет, требуется ли нажатие клавиши Shift для набора заданного символа.
 * @param char Символ для проверки.
 * @returns `true`, если требуется Shift.
 */
export function isShiftRequired(char: string): boolean {
  const keyCapIds = getKeyCapIdsForChar(char);
  return keyCapIds?.some(id => id.includes('Shift')) ?? false;
}


/**
 * Получает `fingerId` для заданного `KeyCapId` из пальцевого макета.
 * @param keyCapId `KeyCapId` для поиска.
 * @param fingerLayout Схема расположения пальцев.
 * @returns `FingerId` или `undefined`, если не найден.
 */
export function getFingerByKeyCap(
  keyCapId: KeyCapId,
  fingerLayout: FingerLayout,
): FingerId | undefined {
  const entry = fingerLayout[keyCapId];
  return entry ? entry.fingerId : undefined;
}
