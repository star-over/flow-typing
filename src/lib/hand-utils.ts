/**
 * @file Утилиты для работы с руками и пальцами.
 * @description Содержит функции для определения состояний рук и пальцев,
 * их принадлежности, и для получения связанных с ними данных.
 */
import { KeyCapId } from "@/interfaces/key-cap-id";
import {
  FingerId,
  FingerLayout,
  LEFT_HAND_BASE,
  LEFT_HAND_FINGERS,
} from "@/interfaces/types";

/**
 * Определяет, принадлежит ли палец левой руке.
 * @param fingerId Идентификатор пальца для проверки.
 * @returns `true`, если палец принадлежит левой руке.
 */
export function isLeftHandFinger(fingerId: FingerId): fingerId is typeof LEFT_HAND_FINGERS[number] | typeof LEFT_HAND_BASE {
  return LEFT_HAND_FINGERS.includes(fingerId as typeof LEFT_HAND_FINGERS[number]) || fingerId === LEFT_HAND_BASE;
}



/**
 * Получает все клавиши, назначенные на указанный палец. Т.н. Кластер клавишь
 * @param fingerId Идентификатор пальца.
 * @param fingerLayout Объект `FingerLayout`.
 * @returns Массив `KeyCapId`, связанных с пальцем.
 */
export function getFingerKeys(fingerId: FingerId, fingerLayout: FingerLayout): KeyCapId[] {
  return fingerLayout
    .filter((item) => item.fingerId === fingerId)
    .map((item) => item.keyCapId);
}

/**
 * Получает `keyCapId` домашней клавиши для заданного пальца.
 * @param fingerId Идентификатор пальца.
 * @param fingerLayout Схема расположения пальцев.
 * @returns `KeyCapId` домашней клавиши или `undefined`, если не найдена.
 */
export function getHomeKeyForFinger(fingerId: FingerId, fingerLayout: FingerLayout): KeyCapId | undefined {
  const entry = fingerLayout.find(
    (item) => item.fingerId === fingerId && item.isHomeKey
  );
  return entry ? entry.keyCapId : undefined;
}
