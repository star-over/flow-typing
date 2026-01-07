/**
 * @file Утилиты для работы с руками и пальцами.
 * @description Содержит функции для определения состояний рук и пальцев,
 * их принадлежности, и для получения связанных с ними данных.
 */
import { KeyCapId } from "@/interfaces/key-cap-id";
import {
  FingerId,
  FingerLayout,
  HandStates,
  LEFT_HAND_FINGER_IDS,
  RIGHT_HAND_FINGER_IDS,
  SymbolLayout,
  TypedKey,
} from "@/interfaces/types";

import { getFingerByKeyCap, getKeyCapIdsForChar, isShiftRequired } from "./symbol-utils";

/**
 * Определяет, принадлежит ли палец левой руке.
 * @param fingerId Идентификатор пальца для проверки.
 * @returns `true`, если палец принадлежит левой руке.
 */
export function isLeftHandFinger(fingerId: FingerId): fingerId is typeof LEFT_HAND_FINGER_IDS[number] {
  return LEFT_HAND_FINGER_IDS.includes(fingerId as typeof LEFT_HAND_FINGER_IDS[number]);
}

/**
 * Определяет, принадлежит ли палец правой руке.
 * @param fingerId Идентификатор пальца для проверки.
 * @returns `true`, если палец принадлежит правой руке.
 */
export function isRightHandFinger(fingerId: FingerId): fingerId is typeof RIGHT_HAND_FINGER_IDS[number] {
  return RIGHT_HAND_FINGER_IDS.includes(fingerId as typeof RIGHT_HAND_FINGER_IDS[number]);
}

/**
 * Инициализирует состояния рук, устанавливая всем пальцам состояние 'IDLE'.
 * @returns Объект `HandStates` со всеми пальцами в состоянии 'IDLE'.
 */
function initializeHandStates(): HandStates {
  return {
    L1: "IDLE", L2: "IDLE", L3: "IDLE", L4: "IDLE", L5: "IDLE", LB: "IDLE",
    R1: "IDLE", R2: "IDLE", R3: "IDLE", R4: "IDLE", R5: "IDLE", RB: "IDLE",
  };
}

/**
 * Определяет целевой палец для заданного символа.
 * @param targetSymbol Символ для поиска.
 * @param fingerLayout Схема расположения пальцев.
 * @returns Идентификатор пальца (`FingerId`) или `undefined`, если не найден.
 */
function getTargetFinger(
  targetSymbol: string,
  fingerLayout: FingerLayout
): FingerId | undefined {
  const keyCapIds = getKeyCapIdsForChar(targetSymbol);
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
  typedKey: TypedKey,
  fingerLayout: FingerLayout
): void {
  const typedFinger = getFingerByKeyCap(typedKey.keyCapId, fingerLayout);

  if (typedFinger) {
    if (typedFinger === targetFinger) {
      return;
    } else if (
      (isLeftHandFinger(targetFinger) && isLeftHandFinger(typedFinger)) ||
      (isRightHandFinger(targetFinger) && isRightHandFinger(typedFinger))
    ) {
      handStates[typedFinger] = "INCORRECT";
    } else {
      const handFingerIds = isLeftHandFinger(typedFinger) ? LEFT_HAND_FINGER_IDS : RIGHT_HAND_FINGER_IDS;
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
  const handIds = isLeftHandFinger(targetFinger) ? LEFT_HAND_FINGER_IDS : RIGHT_HAND_FINGER_IDS;
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
  typedKey: TypedKey | undefined,
  symbolLayout: SymbolLayout,
  fingerLayout: FingerLayout,
): HandStates {
  const handStates = initializeHandStates();

  if (!targetSymbol) return handStates;

  const targetFinger = getTargetFinger(targetSymbol, fingerLayout);
  if (!targetFinger) return handStates;

  handStates[targetFinger] = "ACTIVE";

  if (isShiftRequired(targetSymbol)) {
    if (isLeftHandFinger(targetFinger)) {
      handStates["R5"] = "ACTIVE"; // Right pinky
    } else {
      handStates["L5"] = "ACTIVE"; // Left pinky
    }
  }
  
  if (typedKey && !typedKey.isCorrect) {
    updateHandStatesForError(handStates, targetFinger, typedKey, fingerLayout);
  }

  setOtherFingersInactive(handStates, targetFinger);

  return handStates;
}

/**
 * Получает все `keyCapId` для заданного `fingerId`.
 * @param fingerId Идентификатор пальца.
 * @param fingerLayout Объект `FingerLayout`.
 * @returns Массив `KeyCapId`, связанных с пальцем.
 */
export function getKeyCapIdsByFingerId(
  fingerId: FingerId,
  fingerLayout: FingerLayout
): KeyCapId[] {
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
export function getHomeKeyForFinger(
  fingerId: FingerId,
  fingerLayout: FingerLayout
): KeyCapId | undefined {
  const entry = Object.entries(fingerLayout).find(
    ([, fingerData]) => fingerData.fingerId === fingerId && fingerData.isHomeKey
  );
  return entry ? (entry[0] as KeyCapId) : undefined;
}
