/**
 * @file Сборка `KeyboardSceneViewModel` — финальной render-готовой модели клавиатуры.
 * @description Объединяет три раскладки-источника (Physical, Symbol, Finger) в одну
 * двумерную сцену, которую отрисовывает компонент `KeyboardScene.svelte`. Это не «слой»
 * (как `*Layout`), а его производное — артефакт для UI.
 *
 * Physical layout — плоский список клавиш с координатами `(x, y, w)`. Двумерное
 * представление для рендера восстанавливается через group-by `y` + sort-by `x`.
 */
import type {
  FingerId,
  FingerLayout,
  HandsSceneViewModel,
  KeyCapId,
  KeyCapUnitWidth,
  KeyboardSceneKey,
  KeyboardSceneViewModel,
  KeySceneState,
  PhysicalKey,
  PhysicalLayout,
  SymbolLayout,
  Visibility,
} from "@/interfaces/types";
import { KEY_CAP_UNIT_WIDTHS } from "@/interfaces/types";
import { getHomeKeyForFinger } from "@/lib/hand-utils";
import { getLabel } from "@/lib/symbol-utils";

/**
 * Группирует плоский physical-layout в массив рядов и сортирует клавиши внутри каждого ряда
 * по x-координате. Восстанавливает форму, ожидаемую `KeyboardScene.svelte` (`{#each rows as row}`).
 */
function groupByRow(physicalLayout: PhysicalLayout): PhysicalKey[][] {
  const rows = new Map<number, PhysicalKey[]>();
  for (const key of physicalLayout) {
    const row = rows.get(key.y) ?? [];
    row.push(key);
    rows.set(key.y, row);
  }
  return [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) => row.sort((a, b) => a.x - b.x));
}

/** Конвертирует `w` (число в U) в `KeyCapUnitWidth` для совместимости с `KeyCap.svelte`. */
function widthToUnitWidth(w: number): KeyCapUnitWidth | undefined {
  const candidate = `${w}U` as KeyCapUnitWidth;
  return (KEY_CAP_UNIT_WIDTHS as readonly string[]).includes(candidate) ? candidate : undefined;
}

interface CreateKeyboardSceneOptions {
  physicalLayout: PhysicalLayout;
  symbolLayout: SymbolLayout;
  fingerLayout: FingerLayout;
}

/**
 * Строит `KeyboardSceneViewModel` для всей клавиатуры из трёх раскладок-источников.
 */
export function createKeyboardScene(
  options: CreateKeyboardSceneOptions
): KeyboardSceneViewModel {
  const { physicalLayout, symbolLayout, fingerLayout } = options;
  const rows = groupByRow(physicalLayout);

  return rows.map((row, rowIndex) =>
    row.map((physicalKey, colIndex): KeyboardSceneKey => {
      const keyCapId = physicalKey.keyCapId;
      const symbol = getLabel({ keyCapId, symbolLayout, physicalLayout });
      const fingerKey = fingerLayout.find((item) => item.keyCapId === keyCapId);

      return {
        keyCapId,
        unitWidth: widthToUnitWidth(physicalKey.w),
        symbolSize: physicalKey.symbolSize,
        homeKeyMarker: physicalKey.homeKeyMarker,
        type: physicalKey.type,
        rowIndex,
        colIndex,
        symbol: symbol || "...",
        fingerId: fingerKey?.fingerId || "L1",
        home: fingerKey?.home,
      };
    })
  );
}

interface CreateKeyboardSceneForFingerOptions {
  fingerId: FingerId;
  handsScene: HandsSceneViewModel;
  fingerLayout: FingerLayout;
  physicalLayout: PhysicalLayout;
}

/**
 * Создаёт клавиатурную сцену, адаптированную под конкретный палец, на основе общей сцены рук.
 * Определяет, какие клавиши должны быть видимыми и каково их состояние (TARGET, PATH, …)
 * для данного пальца — на выходе только клавиши его кластера обогащены сценическим состоянием.
 */
export const createKeyboardSceneForFinger = ({
  fingerId,
  handsScene,
  fingerLayout,
  physicalLayout,
}: CreateKeyboardSceneForFingerOptions): KeyboardSceneViewModel => {
  const fingerSceneState = handsScene[fingerId];
  const keyCapStates: Partial<Record<KeyCapId, KeySceneState>> =
    fingerSceneState.keyCapStates || {};

  const homeKeyForFinger = getHomeKeyForFinger({ fingerId, fingerLayout });
  const rows = groupByRow(physicalLayout);

  return rows.map((row, rowIndex) =>
    row.map((physicalKey): KeyboardSceneKey => {
      const { keyCapId } = physicalKey;
      const keyCapState = keyCapStates[keyCapId];

      const isVisible = !!keyCapState;
      const visibility: Visibility = isVisible ? "VISIBLE" : "INVISIBLE";

      return {
        keyCapId,
        unitWidth: widthToUnitWidth(physicalKey.w),
        symbolSize: physicalKey.symbolSize,
        homeKeyMarker: physicalKey.homeKeyMarker,
        type: physicalKey.type,
        rowIndex,
        colIndex: 0,
        symbol: keyCapId,
        fingerId,
        home: keyCapId === homeKeyForFinger,
        visibility,
        navigationRole: keyCapState?.navigationRole || "NONE",
        navigationArrow: keyCapState?.navigationArrow || "NONE",
        pressResult: keyCapState?.pressResult || "NONE",
      };
    })
  );
};
