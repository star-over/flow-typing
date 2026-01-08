/**
 * @file Утилиты для работы с руками и пальцами.
 * @description Содержит функции для определения состояний рук и пальцев,
 * их принадлежности, и для получения связанных с ними данных.
 */
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { KeyCapId } from "@/interfaces/key-cap-id";
import {
  FingerId,
  FingerLayout,
  HandFingerId,
  HandStates,
  LEFT_HAND_BASE,
  LEFT_HAND_FINGERS,
  RIGHT_HAND_BASE,
  RIGHT_HAND_FINGERS,
  SymbolLayout,
} from "@/interfaces/types";

import { getFingerByKeyCap, getKeyCapIdsForChar, isShiftRequired } from "./symbol-utils";

/**
 * Определяет, принадлежит ли палец левой руке.
 * @param fingerId Идентификатор пальца для проверки.
 * @returns `true`, если палец принадлежит левой руке.
 */
export function isLeftHandFinger(fingerId: FingerId): fingerId is typeof LEFT_HAND_FINGERS[number] | typeof LEFT_HAND_BASE {
  return LEFT_HAND_FINGERS.includes(fingerId as typeof LEFT_HAND_FINGERS[number]) || fingerId === LEFT_HAND_BASE;
}

/**
 * Определяет, принадлежит ли палец правой руке.
 * @param fingerId Идентификатор пальца для проверки.
 * @returns `true`, если палец принадлежит правой руке.
 */
export function isRightHandFinger(fingerId: FingerId): fingerId is typeof RIGHT_HAND_FINGERS[number] | typeof RIGHT_HAND_BASE {
  return RIGHT_HAND_FINGERS.includes(fingerId as typeof RIGHT_HAND_FINGERS[number]) || fingerId === RIGHT_HAND_BASE;
}

/**
 * Инициализирует состояния рук, устанавливая всем пальцам состояние 'IDLE'.
 * @returns Объект `HandStates` со всеми пальцами в состоянии 'IDLE'.
 */
function initializeHandStates(): HandStates {
  const states = {} as HandStates;
  LEFT_HAND_FINGERS.forEach(id => states[id] = "IDLE");
  RIGHT_HAND_FINGERS.forEach(id => states[id] = "IDLE");
  states[LEFT_HAND_BASE] = "IDLE";
  states[RIGHT_HAND_BASE] = "IDLE";
  return states;
}

/**
 * Определяет целевой палец для заданного символа.
 * @param targetSymbol Символ для поиска.
 * @param fingerLayout Схема расположения пальцев.
 * @returns Идентификатор пальца (`FingerId`) или `undefined`, если не найден.
 */
function getTargetFinger(
  targetSymbol: string,
  fingerLayout: FingerLayout,
  symbolLayout: SymbolLayout
): FingerId | undefined {
  const keyCapIds = getKeyCapIdsForChar(targetSymbol, symbolLayout);
  if (!keyCapIds) return undefined;

  const primaryKey = keyCapIds.find(id => !id.includes('Shift')) || keyCapIds[0];
  if (!primaryKey) return undefined;

  return getFingerByKeyCap(primaryKey, fingerLayout);
}

/**
 * Обновляет состояние рук на основе логики индикации ошибок.
 * @param handStates Текущие состояния рук для обновления.
 * @param targetFinger Целевой палец, который должен быть активен.
 * @param typedKey Клавиша, которая была фактически нажата.
 * @param fingerLayout Схема расположения пальцев.
 */
function updateHandStatesForError(
  handStates: HandStates,
  targetFinger: FingerId,
  pressedKeyCups: KeyCapId[],
  fingerLayout: FingerLayout
): void {
  const typedFinger = getFingerByKeyCap(pressedKeyCups[0], fingerLayout);

  if (typedFinger) {
    if (typedFinger === targetFinger) {
      return;
    } else if (
      (isLeftHandFinger(targetFinger) && isLeftHandFinger(typedFinger)) ||
      (isRightHandFinger(targetFinger) && isRightHandFinger(typedFinger))
    ) {
      handStates[typedFinger] = "INCORRECT";
    } else {
      const handFingerIds: readonly HandFingerId[] = isLeftHandFinger(typedFinger)
        ? [...LEFT_HAND_FINGERS, LEFT_HAND_BASE]
        : [...RIGHT_HAND_FINGERS, RIGHT_HAND_BASE];
      handFingerIds.forEach((fingerId) => {
        handStates[fingerId] = "INCORRECT";
      });
      handStates[targetFinger] = "ACTIVE";
    }
  }
}

/**
 * Устанавливает состояние 'INACTIVE' для остальных пальцев на той же руке.
 * @param handStates Состояния рук для обновления.
 * @param targetFinger Палец, который должен остаться 'ACTIVE'.
 */
function setOtherFingersInactive(handStates: HandStates, targetFinger: FingerId): void {
  const handIds: readonly HandFingerId[] = isLeftHandFinger(targetFinger)
    ? [...LEFT_HAND_FINGERS, LEFT_HAND_BASE]
    : [...RIGHT_HAND_FINGERS, RIGHT_HAND_BASE];
  handIds.forEach((fingerId) => {
    if (handStates[fingerId] === "IDLE") {
      handStates[fingerId] = "INACTIVE";
    }
  });
}

/**
 * Определяет состояние каждого пальца для компонента Hands на основе целевого символа и нажатой клавиши.
 * @param targetSymbol Символ, который необходимо набрать.
 * @param typedKey Фактически нажатая клавиша (для обработки ошибок).
 * @param symbolLayout Схема расположения символов.
 * @param fingerLayout Схема расположения пальцев.
 * @returns Объект с состояниями пальцев, готовый для передачи в компонент `Hands`.
 */
export function getHandStates(
  targetSymbol: string | undefined,
  pressedKeyCups: KeyCapId[] | undefined,
  isIncorrect: boolean,
  fingerLayout: FingerLayout,
): HandStates {
  const handStates = initializeHandStates();

  if (!targetSymbol) return handStates;

  const targetFinger = getTargetFinger(targetSymbol, fingerLayout, symbolLayoutEnQwerty);
  if (!targetFinger) return handStates;

  handStates[targetFinger] = "ACTIVE";

  if (isShiftRequired(targetSymbol, symbolLayoutEnQwerty)) {
    if (isLeftHandFinger(targetFinger)) {
      handStates["R5"] = "ACTIVE"; // Right pinky
    } else {
      handStates["L5"] = "ACTIVE"; // Left pinky
    }
  }

  if (isIncorrect && pressedKeyCups) {
    updateHandStatesForError(handStates, targetFinger, pressedKeyCups, fingerLayout);
  }



  setOtherFingersInactive(handStates, targetFinger);

  return handStates;
}

/**
 * Получает все клавиши, назначенные на указанный палец. Т.н. Кластер клавишь
 * @param fingerId Идентификатор пальца.
 * @param fingerLayout Объект `FingerLayout`.
 * @returns Массив `KeyCapId`, связанных с пальцем.
 */
export function getFingerKeys(fingerId: FingerId, fingerLayout: FingerLayout): KeyCapId[] {
  return Object.entries(fingerLayout)
    .filter(([, fingerKey]) => fingerKey.fingerId === fingerId)
    .map(([keyCapId]) => keyCapId as KeyCapId);
}

/**
 * Получает `keyCapId` домашней клавиши для заданного пальца.
 * @param fingerId Идентификатор пальца.
 * @param fingerLayout Схема расположения пальцев.
 * @returns `KeyCapId` домашней клавиши или `undefined`, если не найдена.
 */
export function getHomeKeyForFinger(fingerId: FingerId, fingerLayout: FingerLayout): KeyCapId | undefined {
  const entry = Object.entries(fingerLayout).find(
    ([, fingerData]) => fingerData.fingerId === fingerId && fingerData.isHomeKey
  );
  return entry ? (entry[0] as KeyCapId) : undefined;
}
