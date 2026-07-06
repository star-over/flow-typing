import type { KeyCapId } from "@/interfaces/key-cap-id";
import type {
  FingerId,
  FingerLayout,
  PhysicalLayout,
  SymbolLayout,
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



/** Проверяет, является ли клавиша модификатором. */
export function isModifierKey({
  key,
  physicalLayout,
}: {
  key: string;
  physicalLayout: PhysicalLayout;
}): boolean {
  return physicalLayout.flat()
    .filter((k) => k.type === "MODIFIER")
    .map((k) => k.keyCapId)
    .includes(key as KeyCapId);
}

/** Проверяет, является ли клавиша символьной (текстовой). */
export function isTextKey({
  key,
  physicalLayout,
}: {
  key: string;
  physicalLayout: PhysicalLayout;
}): boolean {
  return physicalLayout.flat()
    .filter((k) => k.type === "SYMBOL")
    .map((k) => k.keyCapId)
    .includes(key as KeyCapId);
}


/**
 * Finds a symbol in the layout that exactly matches a given combination of a base key and modifiers.
 *
 * @architectural_note
 * The core of this function is a "canonicalization" step. Both the input keys
 * (keyCapId + activeModifiers) and the keys from the symbol layout are converted
 * to a standard form (e.g., 'ShiftLeft' is used for any shift key). This allows
 * for a reliable, set-based comparison and correctly handles variations like
 * ShiftLeft vs. ShiftRight. It also correctly resolves the symbol for the
 * modifier key itself (e.g., finding "Sh L" for the "ShiftLeft" key).
 */
export function getLabel({
  keyCapId,
  symbolLayout,
  physicalLayout,
}: {
  keyCapId: KeyCapId;
  symbolLayout: SymbolLayout;
  physicalLayout: PhysicalLayout;
}): string {
  const physicalKey = physicalLayout.find((key) => key.keyCapId === keyCapId);

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
    return physicalKey.label || '...'; // Fallback to physical key label
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
 * Строит `Record<KeyCapId, string>` с надписью для каждой клавиши physicalLayout,
 * чтобы потребители (KeyboardScene и т.п.) отрисовывали из готовой map'ы вместо
 * вызова `getLabel` per-клавиша в template'е. Один проход вместо N.
 */
export function createKeyLabelMap({
  physicalLayout,
  symbolLayout,
}: {
  physicalLayout: PhysicalLayout;
  symbolLayout: SymbolLayout;
}): Record<KeyCapId, string> {
  return Object.fromEntries(
    physicalLayout.map((key) => [
      key.keyCapId,
      getLabel({ keyCapId: key.keyCapId, physicalLayout, symbolLayout }),
    ])
  ) as Record<KeyCapId, string>;
}

/** Получает массив `KeyCapId`, необходимых для набора заданного символа. */
export function getKeyCapIdsForChar({
  char,
  symbolLayout,
}: {
  char: string;
  symbolLayout: SymbolLayout;
}): KeyCapId[] | undefined {
  const entry = symbolLayout.find((item) => item.symbol === char);
  return entry?.keyCaps;
}

/**
 * Проверяет, несёт ли клавиша базовый символ в данной символьной раскладке —
 * т.е. существует ли entry, где клавиша нажимается в одиночку (`keyCaps.length === 1`).
 * Клавиши, встречающиеся ТОЛЬКО как член Shift-аккорда (`['ShiftRight', 'KeyX']`) или
 * отсутствующие в раскладке (Tab, CapsLock, сами модификаторы), символ не несут.
 * Тот же предикат «есть базовый символ», что различает `baseSymbol` в {@link getLabel}.
 */
export function keyCapHasSymbol({
  keyCapId,
  symbolLayout,
}: {
  keyCapId: KeyCapId;
  symbolLayout: SymbolLayout;
}): boolean {
  return symbolLayout.some(
    (entry) => entry.keyCaps.length === 1 && entry.keyCaps[0] === keyCapId,
  );
}

/** Получает `fingerId` для заданного `KeyCapId` из пальцевого макета. */
export function getFingerByKeyCap({
  keyCapId,
  fingerLayout,
}: {
  keyCapId: KeyCapId;
  fingerLayout: FingerLayout;
}): FingerId | undefined {
  const entry = fingerLayout.find((item) => item.keyCapId === keyCapId);
  return entry ? entry.fingerId : undefined;
}

/**
 * Сравнивает два массива `KeyCapId` как неупорядоченные множества.
 * Предполагается, что в каждом массиве нет дубликатов — для аккордов это
 * безопасное предположение.
 */
export function areKeyCapIdArraysEqual({ a, b }: { a: KeyCapId[]; b: KeyCapId[] }): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((keyCap) => b.includes(keyCap));
}
