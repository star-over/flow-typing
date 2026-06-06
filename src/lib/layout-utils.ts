/**
 * @file Utilities for working with keyboard layouts and key coordinates.
 */
import type { PhysicalLayout, KeyCapId } from "@/interfaces/types";


export type KeyCoordinateMap = Map<KeyCapId, { r: number; c: number }>;

/**
 * Сетка `(r, c)` для каждой клавиши: `r = key.y` (номер ряда),
 * `c` — индекс клавиши в её ряду после сортировки по `key.x`.
 * Используется в `difficulty-calculator` как дискретные шаги движения пальца
 * (один шаг = одна клавиша), а не в физических U.
 */
export function createKeyCoordinateMap(physicalLayout: PhysicalLayout): KeyCoordinateMap {
  const rows = new Map<number, KeyCapId[]>();
  for (const key of physicalLayout) {
    const row = rows.get(key.y) ?? [];
    row.push(key.keyCapId);
    rows.set(key.y, row);
  }

  // Внутри каждой строки сортируем по x, через индекс в physicalLayout
  const xByKey = new Map(physicalLayout.map((k) => [k.keyCapId, k.x]));
  const map: KeyCoordinateMap = new Map();
  for (const [r, keyCapIds] of rows) {
    const sorted = [...keyCapIds].sort((a, b) => (xByKey.get(a) ?? 0) - (xByKey.get(b) ?? 0));
    sorted.forEach((keyCapId, c) => {
      map.set(keyCapId, { r, c });
    });
  }
  return map;
}
