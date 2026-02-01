/**
 * @file Калькулятор сложности символов.
 * @description Этот модуль отвечает за расчет "стоимости" набора каждого символа
 * на основе нескольких факторов: используемого пальца, расстояния движения и использования модификаторов.
 */

import { getKeyCapIdsForChar } from './symbol-utils';
import { FingerLayout, KeyCapId, SymbolLayout, KeyboardLayout } from '@/interfaces/types';
import { KeyCoordinateMap, createKeyCoordinateMap } from './layout-utils';


// =================================================================================
// 1. КОНСТАНТЫ СЛОЖНОСТИ (для простой настройки)
// =================================================================================

/**
 * Базовая стоимость использования каждого пальца.
 * Чем выше значение, тем "сложнее" палец.
 */
export const FINGER_COSTS: Record<string, number> = {
  L1: 1.0, R1: 1.0, // Большой
  L2: 1.0, R2: 1.0, // Указательный
  L3: 1.5, R3: 1.5, // Средний
  L4: 2.0, R4: 2.0, // Безымянный
  L5: 3.0, R5: 3.0, // Мизинец
  LB: 99,  RB: 99,  // Основание ладони (не должно использоваться)
};

/**
 * Стоимость движения в зависимости от направления и длины.
 * Длина пути = индекс + 1
 */
export const MOVEMENT_COSTS = {
  UP:         [1.7, 2.5, 3.0], // для путей длиной 1, 2, 3
  DOWN:       [1.3, 1.8, 2.5],
  HORIZONTAL: [2, 3.5, 5.0],
};

/**
 * Дополнительная "стоимость" за использование клавиши-модификатора.
 */
export const MODIFIER_COSTS: Record<string, number> = {
  ShiftLeft: 2.0,
  ShiftRight: 2.0,
};


// =================================================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =================================================================================

/**
 * Находит домашнюю клавишу для указанного пальца.
 */
function getHomeKeyForFinger(fingerId: string, fingerLayout: FingerLayout): KeyCapId | undefined {
  return fingerLayout.find((f) => f.fingerId === fingerId && f.isHomeKey)?.keyCapId;
}

/**
 * Рассчитывает стоимость нажатия одной клавиши.
 */
function calculateKeyCost(
  keyCapId: KeyCapId,
  fingerLayout: FingerLayout,
  keyCoordinateMap: KeyCoordinateMap
): number {
  const fingerAssignment = fingerLayout.find((f) => f.keyCapId === keyCapId);
  if (!fingerAssignment) return 99;

  const { fingerId } = fingerAssignment;
  const homeKey = getHomeKeyForFinger(fingerId, fingerLayout);

  let totalMovementCost = 1.0; // Базовая стоимость, если нет движения

  if (homeKey && homeKey !== keyCapId) {
    const startCoords = keyCoordinateMap.get(homeKey);
    const endCoords = keyCoordinateMap.get(keyCapId);

    if (!startCoords || !endCoords) return 99; // Неожиданный случай

    const deltaRow = Math.abs(endCoords.r - startCoords.r);
    const deltaCol = Math.abs(endCoords.c - startCoords.c);

    let verticalCost = 0;
    let horizontalCost = 0;

    if (deltaRow > 0) {
      const direction = (endCoords.r > startCoords.r) ? 'DOWN' : 'UP';
      verticalCost = MOVEMENT_COSTS[direction][deltaRow - 1] ?? MOVEMENT_COSTS[direction].at(-1)!;
    }

    if (deltaCol > 0) {
      horizontalCost = MOVEMENT_COSTS.HORIZONTAL[deltaCol - 1] ?? MOVEMENT_COSTS.HORIZONTAL.at(-1)!;
    }

    // Если есть и вертикальное и горизонтальное движение, складываем их стоимости,
    // как и было предложено, для получения стоимости диагонального движения.
    totalMovementCost = verticalCost + horizontalCost;
  }

  const fingerCost = FINGER_COSTS[fingerId] || 1.0;

  // Если движения не было, стоимость равна просто стоимости пальца.
  // В ином случае, умножаем на стоимость движения.
  return fingerCost * (totalMovementCost || 1.0);
}


// =================================================================================
// 3. ОСНОВНАЯ ФУНКЦИЯ
// =================================================================================

/**
 * Рассчитывает общую сложность набора одного символа, включая аккорды (модификаторы).
 */
export function calculateCharDifficulty(
  char: string,
  symbolLayout: SymbolLayout,
  fingerLayout: FingerLayout,
  keyboardLayout: KeyboardLayout
): number {
  const keyCapIds = getKeyCapIdsForChar(char, symbolLayout);

  if (!keyCapIds || keyCapIds.length === 0) {
    return 10;
  }

  const keyCoordinateMap: KeyCoordinateMap = createKeyCoordinateMap(keyboardLayout);

  let totalDifficulty = 0;

  keyCapIds.forEach((keyId) => {
    if (keyId in MODIFIER_COSTS) {
      totalDifficulty += MODIFIER_COSTS[keyId];
    } else {
      totalDifficulty += calculateKeyCost(keyId, fingerLayout, keyCoordinateMap);
    }
  });

  return totalDifficulty;
}
