/**
 * @file Калькулятор сложности символов.
 * @description Этот модуль отвечает за расчет "стоимости" набора каждого символа
 * на основе нескольких факторов: используемого пальца, расстояния движения и использования модификаторов.
 */

import { findOptimalPath, AdjacencyList } from './pathfinding';
import { getKeyCapIdsForChar } from './symbol-utils';
import { FingerLayout, KeyCapId, SymbolLayout } from '@/interfaces/types';
import { KeyCoordinateMap } from './layout-utils';


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
  L3: 1.2, R3: 1.2, // Средний
  L4: 1.5, R4: 1.5, // Безымянный
  L5: 2.0, R5: 2.0, // Мизинец
  LB: 99,  RB: 99,  // Основание ладони (не должно использоваться)
};

/**
 * Стоимость движения в зависимости от направления и длины.
 * Длина пути = индекс + 1
 */
export const MOVEMENT_COSTS = {
  UP:         [1.2, 2.0, 3.0], // для путей длиной 1, 2, 3
  DOWN:       [1.0, 1.8, 2.5],
  HORIZONTAL: [1.5, 3.5, 8.0], // Горизонтальные движения, как вы и просили
  DIAGONAL:   [1.4, 3.0, 7.5],
};

/**
 * Дополнительная "стоимость" за использование клавиши-модификатора.
 */
export const MODIFIER_COSTS: Record<string, number> = {
  ShiftLeft: 3.0,
  ShiftRight: 3.0,
};


// =================================================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =================================================================================

type MovementAnalysis = {
  direction: keyof typeof MOVEMENT_COSTS; // Изменено на MOVEMENT_COSTS
  length: number;
};

/**
 * Анализирует путь между двумя клавишами для определения направления и длины.
 */
function analyzePath(
  path: KeyCapId[],
  keyCoordinateMap: KeyCoordinateMap
): MovementAnalysis {
  const length = path.length - 1;
  if (length <= 0) {
    return { direction: 'DOWN', length: 0 }; // Нет движения, минимальная сложность
  }

  const startCoords = keyCoordinateMap.get(path[0]);
  const endCoords = keyCoordinateMap.get(path[path.length - 1]);

  if (!startCoords || !endCoords) {
    return { direction: 'DIAGONAL', length }; // Неожиданный случай, возврат с максимальным штрафом
  }

  const deltaRow = endCoords.r - startCoords.r;
  const deltaCol = endCoords.c - startCoords.c;

  let direction: keyof typeof MOVEMENT_COSTS = 'DIAGONAL';
  if (deltaRow < 0 && deltaCol === 0) direction = 'UP';
  else if (deltaRow > 0 && deltaCol === 0) direction = 'DOWN';
  else if (deltaRow === 0 && deltaCol !== 0) direction = 'HORIZONTAL';

  return { direction, length };
}


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
  keyboardGraph: AdjacencyList,
  keyCoordinateMap: KeyCoordinateMap
): number {
  const fingerAssignment = fingerLayout.find((f) => f.keyCapId === keyCapId);
  if (!fingerAssignment) return 99;

  const { fingerId } = fingerAssignment;
  const homeKey = getHomeKeyForFinger(fingerId, fingerLayout);

  let movementBaseCost = MOVEMENT_COSTS.DOWN[0]; // Базовая стоимость, если нет движения (DOWN_1)

  if (homeKey && homeKey !== keyCapId) {
    const path = findOptimalPath(homeKey, keyCapId, keyboardGraph);
    if (!path || path.length === 0) return 99; // Путь не найден

    const { direction, length } = analyzePath(path, keyCoordinateMap);

    // Получаем стоимость движения по направлению и длине
    // Если длина пути превышает определенные значения, используем последнее доступное значение.
    movementBaseCost = MOVEMENT_COSTS[direction][length - 1] ?? MOVEMENT_COSTS[direction].at(-1)!;
  }
  
  const fingerCost = FINGER_COSTS[fingerId] || 1.0;
  
  return fingerCost * movementBaseCost;
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
  keyboardGraph: AdjacencyList,
  keyCoordinateMap: KeyCoordinateMap
): number {
  const keyCapIds = getKeyCapIdsForChar(char, symbolLayout);

  if (!keyCapIds || keyCapIds.length === 0) {
    return 10;
  }

  let totalDifficulty = 0;

  keyCapIds.forEach((keyId) => {
    if (keyId in MODIFIER_COSTS) {
      totalDifficulty += MODIFIER_COSTS[keyId];
    } else {
      totalDifficulty += calculateKeyCost(keyId, fingerLayout, keyboardGraph, keyCoordinateMap);
    }
  });

  return totalDifficulty;
}
