/**
 * @file Концепт-дом пальца: соответствие пальцев и клавиш.
 * @description Собирает finger↔keyCap-логику над `FingerLayout`: какие клавиши
 * назначены пальцу (Кластер), какая клавиша домашняя, какому пальцу принадлежит
 * клавиша, и к какой руке относится сам палец. Сторона руки — свойство пальца.
 */
import type { KeyCapId } from "@/interfaces/key-cap-id";
import {
  type FingerId,
  type FingerLayout,
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
 * Получает все клавиши, назначенные на указанный палец. Т.н. Кластер клавиш.
 */
export function getFingerKeys({
  fingerId,
  fingerLayout,
}: {
  fingerId: FingerId;
  fingerLayout: FingerLayout;
}): KeyCapId[] {
  return fingerLayout
    .filter((item) => item.fingerId === fingerId)
    .map((item) => item.keyCapId);
}

/**
 * Получает `keyCapId` домашней клавиши для заданного пальца.
 */
export function getHomeKeyForFinger({
  fingerId,
  fingerLayout,
}: {
  fingerId: FingerId;
  fingerLayout: FingerLayout;
}): KeyCapId | undefined {
  const entry = fingerLayout.find(
    (item) => item.fingerId === fingerId && item.home
  );
  return entry ? entry.keyCapId : undefined;
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
