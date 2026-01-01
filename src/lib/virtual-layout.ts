/**
 * @file Утилиты для создания и манипуляции виртуальной раскладкой клавиатуры.
 * @description Содержит функции для построения `VirtualLayout`, которая является
 * финальной, обогащенной моделью клавиатуры для отображения в UI.
 */
import { KeyCapId } from "@/interfaces/types";
import { FingerLayout, KeyboardLayout, PhysicalKey, SymbolLayout, VirtualKey,VirtualLayout,  } from "@/interfaces/types";
import { getKeyCapIdsForChar, isShiftRequired } from "@/lib/symbol-utils";

import { getKeyCapIdsByFingerId } from "./hand-utils";


interface CreateVirtualLayoutOptions {
  keyboardLayout: KeyboardLayout;
  symbolLayout: SymbolLayout;
  fingerLayout: FingerLayout;
  shift?: boolean;
}

/**
 * Создает `VirtualLayout` путем объединения физического, символьного и пальцевого макетов.
 * @param options - Опции для создания виртуальной клавиатуры.
 * @param options.keyboardLayout Физический макет клавиатуры (расположение, размеры).
 * @param options.symbolLayout Символьный макет (какой символ на какой клавише).
 * @param options.fingerLayout Пальцевый макет (какой палец за какую клавишу отвечает).
 * @param [options.shift=false] Состояние клавиши Shift.
 * @returns `VirtualLayout` (двумерный массив `VirtualKey`), готовый для рендеринга в UI.
 */
export function createVirtualLayout(
  options: CreateVirtualLayoutOptions
): VirtualLayout {
  const { keyboardLayout, symbolLayout, fingerLayout, shift = false } = options;

  const virtualLayout: VirtualLayout = keyboardLayout
    .map((row: PhysicalKey[], rowIndex: number) => {
      return row.map((physicalKey: PhysicalKey, colIndex: number): VirtualKey => {
        const keyCapId = physicalKey.keyCapId;
        let symbol = "";

        // Обратный поиск символа для клавиши с учетом Shift
        for (const [char, keyCapIds] of Object.entries(symbolLayout)) {
          const hasShift = keyCapIds.some(id => id.includes("Shift"));
          const primaryKey = keyCapIds.find(id => !id.includes("Shift"));

          if (primaryKey === keyCapId && hasShift === shift) {
            symbol = char;
            break;
          }
        }
        
        // Фоллбэк для системных клавиш или если символ не найден
        if (!symbol) {
          for (const [char, keyCapIds] of Object.entries(symbolLayout)) {
            if (keyCapIds[0] === keyCapId && keyCapIds.length === 1) {
              symbol = char;
              break;
            }
          }
        }

        const fingerKey = fingerLayout[physicalKey.keyCapId];

        const virtualKey: VirtualKey = {
          ...physicalKey,
          rowIndex,
          colIndex,
          symbol: symbol || "...",
          fingerId: fingerKey?.fingerId || "L1",
          isHomeKey: fingerKey?.isHomeKey,
        };

        return virtualKey;
      });
    });

  return virtualLayout;
}

/**
 * Опции для функции `findPath`.
 */
export interface FindPathOptions {
  /** Физический макет клавиатуры. */
  keyboardLayout: KeyboardLayout;
  /** Символьный макет. */
  symbolLayout: SymbolLayout;
  /** Пальцевый макет. */
  fingerLayout: FingerLayout;
  /** Целевой символ для поиска пути. */
  targetSymbol: string;
}

/**
 * Находит `VirtualKey` в `VirtualLayout` по `keyCapId`.
 * @param layout Виртуальный макет для поиска.
 * @param keyCapId Идентификатор искомой клавиши.
 * @returns Найденный `VirtualKey` или `null`.
 */
const findKeyInData = (layout: VirtualLayout, keyCapId: KeyCapId): VirtualKey | null => {
  for (const row of layout) {
    const key = row.find(k => k.keyCapId === keyCapId);
    if (key) {
      return key;
    }
  }
  return null;
};

/**
 * Создает виртуальный макет, где видимы только клавиши,
 * связанные с пальцем для целевого символа, и подсвечивает путь.
 * @param options - Опции для поиска пути.
 * @returns Новый `VirtualLayout` с обновленной видимостью и навигационными ролями клавиш.
 */
export function findPath(options: FindPathOptions): VirtualLayout {
  const { keyboardLayout, symbolLayout, fingerLayout, targetSymbol } = options;

  if (!targetSymbol) {
    console.warn(`targetSymbol is missing.`);
    return createVirtualLayout({ keyboardLayout, symbolLayout, fingerLayout });
  }

  const keyCapIds = getKeyCapIdsForChar(targetSymbol);
  if (!keyCapIds) {
    console.warn(`KeyCapIds for symbol "${targetSymbol}" not found.`);
    return createVirtualLayout({ keyboardLayout, symbolLayout, fingerLayout });
  }

  const targetKeyCapId = keyCapIds.find(id => !id.includes('Shift')) || keyCapIds[0];
  const shift = isShiftRequired(targetSymbol);

  const targetFingerKey = fingerLayout[targetKeyCapId];
  if (!targetFingerKey) {
    console.warn(`Finger for keyCapId "${targetKeyCapId}" not found.`);
    return createVirtualLayout({ keyboardLayout, symbolLayout, fingerLayout, shift: shift });
  }

  const keyCapIdsForTargetFinger = getKeyCapIdsByFingerId(targetFingerKey.fingerId, fingerLayout);
  const homeKeyCapId = (Object.entries(fingerLayout).find(
    ([, fingerKey]) => fingerKey.isHomeKey && fingerKey.fingerId === targetFingerKey.fingerId
  )?.[0]) as KeyCapId | undefined;

  const virtualLayout = createVirtualLayout({
    keyboardLayout,
    symbolLayout,
    fingerLayout,
    shift: shift,
  });

  const pathKeyCapIds: KeyCapId[] = [];
  if (homeKeyCapId) {
    const homeKey = findKeyInData(virtualLayout, homeKeyCapId);
    const targetKey = findKeyInData(virtualLayout, targetKeyCapId);

    if (homeKey && targetKey && homeKey.rowIndex !== undefined && homeKey.colIndex !== undefined && targetKey.rowIndex !== undefined && targetKey.colIndex !== undefined) {
      // Вертикальный путь
      const startRow = Math.min(homeKey.rowIndex, targetKey.rowIndex);
      const endRow = Math.max(homeKey.rowIndex, targetKey.rowIndex);
      for (let i = startRow; i <= endRow; i++) {
        const key = virtualLayout[i][homeKey.colIndex];
        if (key) {
          pathKeyCapIds.push(key.keyCapId);
        }
      }

      // Горизонтальный путь
      const startCol = Math.min(homeKey.colIndex, targetKey.colIndex);
      const endCol = Math.max(homeKey.colIndex, targetKey.colIndex);
      for (let i = startCol; i <= endCol; i++) {
        const key = virtualLayout[targetKey.rowIndex][i];
        if (key) {
          pathKeyCapIds.push(key.keyCapId);
        }
      }
    }
  }

  const layoutWithVisibility = virtualLayout.map((row) =>
    row.map(
      (virtualKey): VirtualKey => {
        const isTarget = virtualKey.keyCapId === targetKeyCapId;
        const isHome = virtualKey.keyCapId === homeKeyCapId;
        const isPath = pathKeyCapIds.includes(virtualKey.keyCapId) && !isTarget && !isHome;

        return {
          ...virtualKey,
          visibility: keyCapIdsForTargetFinger.includes(virtualKey.keyCapId)
            ? "VISIBLE"
            : "INVISIBLE",
          navigationRole: isTarget
            ? "TARGET"
            : isHome
              ? "HOME"
              : isPath
                ? "PATH"
                : "IDLE",
        }
      }
    )
  );

  return layoutWithVisibility;
};


/**
 * Находит клавишу в `VirtualLayout` по ее `keyCapId`.
 * @param layout Виртуальный макет для поиска.
 * @param keyCapId Идентификатор искомой клавиши.
 * @returns `VirtualKey` или `null`, если не найдено.
 */
export function findKeyInLayout(layout: VirtualLayout, keyCapId: KeyCapId): VirtualKey | null {
  for (const row of layout) {
    const key = row.find(k => k.keyCapId === keyCapId);
    if (key) {
      return key;
    }
  }
  return null;
}

/**
 * Получает массив `KeyCapId` для клавиш, составляющих путь от домашней до целевой клавиши.
 * @param virtualLayout Виртуальный макет.
 * @param homeKeyCapId `KeyCapId` домашней клавиши.
 * @param targetKeyCapId `KeyCapId` целевой клавиши.
 * @returns Массив `KeyCapId` клавиш на пути.
 */
export function getPathKeyCapIds(
  virtualLayout: VirtualLayout,
  homeKeyCapId: KeyCapId,
  targetKeyCapId: KeyCapId
): KeyCapId[] {
  const pathKeyCapIds: KeyCapId[] = [];
  const homeKey = findKeyInLayout(virtualLayout, homeKeyCapId);
  const targetKey = findKeyInLayout(virtualLayout, targetKeyCapId);

  if (homeKey && targetKey && homeKey.rowIndex !== undefined && homeKey.colIndex !== undefined && targetKey.rowIndex !== undefined && targetKey.colIndex !== undefined) {
    // Вертикальный путь
    const startRow = Math.min(homeKey.rowIndex, targetKey.rowIndex);
    const endRow = Math.max(homeKey.rowIndex, targetKey.rowIndex);
    for (let i = startRow; i <= endRow; i++) {
      const key = virtualLayout[i][homeKey.colIndex];
      if (key) {
        pathKeyCapIds.push(key.keyCapId);
      }
    }

    // Горизонтальный путь
    const startCol = Math.min(homeKey.colIndex, targetKey.colIndex);
    const endCol = Math.max(homeKey.colIndex, targetKey.colIndex);
    for (let i = startCol; i <= endCol; i++) {
      const key = virtualLayout[targetKey.rowIndex][i];
      if (key) {
        pathKeyCapIds.push(key.keyCapId);
      }
    }
  }

  return pathKeyCapIds;
}
