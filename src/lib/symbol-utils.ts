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
