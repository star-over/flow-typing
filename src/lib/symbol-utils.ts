import { KeyCapId } from "@/interfaces/key-cap-id";
import {
  FingerId,
  FingerLayout,
  KeyboardLayout,
  ModifierKey,
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

export const nnbsp = '\u202F'

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
function findSymbolForCombination(keyCapId: KeyCapId, activeModifiers: ModifierKey[], symbolLayout: SymbolLayout): string | null {
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
  for (const { symbol, keyCaps: requiredKeys } of symbolLayout) {
    // Create a canonical set for the current symbol's required keys.
    const canonicalLayoutKeys = new Set<KeyCapId>();
    requiredKeys.forEach((key) => {
      if (modifierKeyToKeyCapId.shift.includes(key)) canonicalLayoutKeys.add('ShiftLeft');
      else if (modifierKeyToKeyCapId.ctrl.includes(key)) canonicalLayoutKeys.add('ControlLeft');
      else if (modifierKeyToKeyCapId.alt.includes(key)) canonicalLayoutKeys.add('AltLeft');
      else if (modifierKeyToKeyCapId.meta.includes(key)) canonicalLayoutKeys.add('MetaLeft');
      else canonicalLayoutKeys.add(key);
    });

    // 3. Compare the canonical sets.
    if (
      lookupKeys.size === canonicalLayoutKeys.size &&
      [...lookupKeys].every((key) => canonicalLayoutKeys.has(key))
    ) {
      return symbol; // Exact match found.
    }
  }

  return null; // No exact match found.
}

export function getSymbol(keyCapId: KeyCapId, activeModifiers: ModifierKey[], symbolLayout: SymbolLayout, keyboardLayout: KeyboardLayout): string {
  const physicalKey = keyboardLayout.flat().find((key) => key.keyCapId === keyCapId);

  // 1. Handle non-symbol keys (MODIFIER, SYSTEM)
  if (physicalKey?.type !== 'SYMBOL') {
    return physicalKey?.label || '...';
  }

  // 2. If SHIFT is active, find the specific symbol to be typed.
  if (activeModifiers.includes('shift')) {
    const shiftedSymbol = findSymbolForCombination(keyCapId, ['shift'], symbolLayout);
    if (shiftedSymbol) {
      return shiftedSymbol;
    }
  }

  // 3. If no active shift (or no specific shifted symbol found), generate the combined label.
  const baseSymbolEntry = symbolLayout.find((s) => s.keyCaps.length === 1 && s.keyCaps[0] === keyCapId);
  const shiftedSymbolEntry = symbolLayout.find((s) =>
    s.keyCaps.length === 2 &&
    s.keyCaps.includes(keyCapId) &&
    s.keyCaps.some((k) => k.startsWith('Shift'))
  );

  // Fallback to physical key label if no base symbol is found
  if (!baseSymbolEntry) {
    return physicalKey?.label || '...';
  }

  // If there's no shifted symbol, just return the base symbol
  if (!shiftedSymbolEntry) {
    return baseSymbolEntry.symbol;
  }

  const baseSym = baseSymbolEntry.symbol;
  const shiftedSym = shiftedSymbolEntry.symbol;

  // If they are the same letter, return the uppercase version
  if (baseSym.toUpperCase() === shiftedSym.toUpperCase() && baseSym !== shiftedSym) {
    return shiftedSym;
  }

  // If for some reason they are identical (e.g., Space key might be defined twice)
  if (baseSym === shiftedSym) {
    return baseSym;
  }

  // Otherwise, combine them
  return `${baseSym}\u202F${shiftedSym}`;
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
 * Проверяет, требуется ли нажатие клавиши Shift для набора заданного символа.
 * @param char Символ для проверки.
 * @returns `true`, если требуется Shift.
 */
export function isShiftRequired(char: string, symbolLayout: SymbolLayout): boolean {
  const keyCapIds = getKeyCapIdsForChar(char, symbolLayout);
  return keyCapIds?.some((id) => id.includes('Shift')) ?? false;
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
